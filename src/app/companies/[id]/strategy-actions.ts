"use server";

import { revalidatePath } from "next/cache";
import mammoth from "mammoth";
import { createServerClient } from "@/lib/supabase";
import { assertOwnerOrManager } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { recordError } from "@/lib/error-log";
import { callClaudeJson, ClaudeJsonParseError, summarizeReferenceDocument } from "@/lib/claude";
import { getPromptTemplate } from "@/lib/prompts";
import { PrincipleScores } from "@/lib/types";

// 資料の中身をAIが実際に読めるのはPDF(ネイティブ読解)とWord(テキスト抽出)のみ。
// PowerPoint等はアップロード・保存のみ行い、内容解析は行わない(未対応であることを
// UI側にも明示する)。
const CONTENT_ANALYZABLE_EXTENSIONS = new Set(["pdf", "docx"]);

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// 企業情報ヒアリング/商談戦略ヒアリングの各ステップで、AIに「今何が判明していて
// 何が未取得か」を伝えるための対象フィールド。DBカラム名 → 表示ラベル。
const INTAKE_FIELD_LABELS: Record<string, string> = {
  name: "会社名",
  url: "URL",
  founded_year: "設立年",
  employee_count: "従業員数",
  business_summary: "事業内容",
  target_customer_profile: "顧客層",
  current_issues: "現状課題",
  pricing_plan: "料金プラン",
};
const POSITIONING_FIELD_LABELS: Record<string, string> = {
  key_differentiators: "差別化要因",
  appeal_axis: "訴求軸",
};

const STRATEGY_DOC_BUCKET = "deal-documents";
const ALLOWED_STRATEGY_DOC_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx"]);
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365 * 10;

function formatHistory(history: ChatMessage[]): string {
  if (history.length === 0) return "(まだ会話はありません)";
  return history.map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`).join("\n");
}

async function getCompanyOrThrow(
  supabase: ReturnType<typeof createServerClient>,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (error || !data) {
    throw new Error(`企業情報の取得に失敗しました: ${error?.message ?? ""}`);
  }
  return data;
}

/**
 * 企業情報ヒアリング(intake)・商談戦略ヒアリング(positioning)の1ターン分を処理する。
 * AIの返答(次の質問)と、会話から抽出できた項目をそのままcompaniesテーブルへ反映する。
 */
export async function sendStrategyChatMessage(
  companyId: string,
  step: "intake" | "positioning",
  history: ChatMessage[],
  userMessage: string
): Promise<{ reply: string; extracted: Record<string, unknown>; isComplete: boolean } | { error: string }> {
  const supabase = createServerClient();
  const company = await getCompanyOrThrow(supabase, companyId);
  const actor = await assertOwnerOrManager(company.owner_user_id as string | null, "企業");

  const reportType = step === "intake" ? "strategy_intake_turn" : "strategy_positioning_turn";
  const fieldLabels = step === "intake" ? INTAKE_FIELD_LABELS : POSITIONING_FIELD_LABELS;

  const known: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [key, label] of Object.entries(fieldLabels)) {
    const value = company[key];
    if (value !== null && value !== undefined && value !== "") {
      known[label] = value;
    } else {
      missing.push(label);
    }
  }

  const variables: Record<string, unknown> =
    step === "intake"
      ? {
          known_fields: JSON.stringify(known),
          missing_fields: missing.join("、") || "(なし)",
          conversation_history: formatHistory(history),
          latest_user_message: userMessage,
        }
      : {
          company_profile_summary: `${company.name} / ${company.business_summary ?? "(未入力)"} / 顧客層: ${
            company.target_customer_profile ?? "(未入力)"
          }`,
          reference_doc_summary:
            (company.strategy_reference_doc_summary as string | null) ??
            (company.strategy_reference_doc_url ? "(資料はアップロード済みだが内容解析は未対応の形式)" : "(参考資料未アップロード)"),
          known_fields: JSON.stringify(known),
          conversation_history: formatHistory(history),
          latest_user_message: userMessage,
        };

  let content: { reply: string; extracted?: Record<string, unknown>; is_complete?: boolean };
  try {
    const { template } = await getPromptTemplate(reportType);
    content = await callClaudeJson(template, variables, { reportType });
  } catch (e) {
    await recordError("strategy_chat", e, { companyId, step });
    if (e instanceof ClaudeJsonParseError) {
      return { error: "AIの応答を解析できませんでした。もう一度お試しください。" };
    }
    return { error: `AI呼び出しに失敗しました: ${(e as Error).message}` };
  }

  const extracted = content.extracted ?? {};
  if (Object.keys(extracted).length > 0) {
    const { error: updateError } = await supabase.from("companies").update(extracted).eq("id", companyId);
    if (updateError) {
      return { error: `企業情報の更新に失敗しました: ${updateError.message}` };
    }
  }

  await recordAuditLog({
    userId: actor.id,
    action: "generate",
    targetType: "company",
    targetId: companyId,
    detail: { reportType, extractedKeys: Object.keys(extracted) },
  });

  revalidatePath(`/companies/${companyId}`);

  return { reply: content.reply, extracted, isComplete: content.is_complete ?? false };
}

/**
 * 商談戦略ヒアリングの参考資料(提案資料・過去の商談資料等)をアップロードする。
 * uploadDealAttachment(deal-actions.ts)と同じ方式(拡張子ホワイトリスト・
 * 常時ダウンロード用contentType・長期署名付きURL)を、案件に紐付かない
 * 企業直下のパスで行う。
 */
export async function uploadStrategyReferenceDoc(
  companyId: string,
  formData: FormData
): Promise<{ url: string; summary: string | null } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "ファイルを選択してください。" };
  }

  const supabase = createServerClient();
  const company = await getCompanyOrThrow(supabase, companyId);
  const actor = await assertOwnerOrManager(company.owner_user_id as string | null, "企業");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_STRATEGY_DOC_EXTENSIONS.has(ext)) {
    return {
      error: `この形式のファイルはアップロードできません(対応形式: ${Array.from(ALLOWED_STRATEGY_DOC_EXTENSIONS).join(", ")})。`,
    };
  }

  const safeName = file.name.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, "_");
  const path = `${companyId}/strategy/${Date.now()}-${safeName}`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(STRATEGY_DOC_BUCKET)
    .upload(path, fileBuffer, { contentType: "application/octet-stream" });
  if (uploadError) {
    return { error: `ファイルのアップロードに失敗しました: ${uploadError.message}` };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(STRATEGY_DOC_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN, { download: safeName });
  if (signError || !signed) {
    return { error: `アップロードURLの発行に失敗しました: ${signError?.message ?? ""}` };
  }

  // PDF/Wordのみ内容解析を試みる。PowerPoint等は保存のみで、要約はnullのままにする。
  let summary: string | null = null;
  if (CONTENT_ANALYZABLE_EXTENSIONS.has(ext)) {
    try {
      if (ext === "pdf") {
        summary = await summarizeReferenceDocument({ kind: "pdf", base64: fileBuffer.toString("base64") });
      } else {
        const { value: extractedText } = await mammoth.extractRawText({ buffer: fileBuffer });
        summary = await summarizeReferenceDocument({ kind: "text", text: extractedText });
      }
    } catch (e) {
      await recordError("strategy_document_summary", e, { companyId, fileName: file.name });
      summary = null;
    }
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ strategy_reference_doc_url: signed.signedUrl, strategy_reference_doc_summary: summary })
    .eq("id", companyId);
  if (updateError) {
    return { error: `企業情報の更新に失敗しました: ${updateError.message}` };
  }

  await recordAuditLog({
    userId: actor.id,
    action: "update",
    targetType: "company",
    targetId: companyId,
    detail: { field: "strategy_reference_doc_url", event: "file_upload", fileName: file.name, summarized: !!summary },
  });

  revalidatePath(`/companies/${companyId}`);

  return { url: signed.signedUrl, summary };
}

/**
 * 蓄積された企業情報・商談戦略情報から、購買心理7原則のスコアを算出する。
 */
export async function generatePrincipleScores(
  companyId: string
): Promise<{ principleScores: PrincipleScores; summary: string } | { error: string }> {
  const supabase = createServerClient();
  const company = await getCompanyOrThrow(supabase, companyId);
  const actor = await assertOwnerOrManager(company.owner_user_id as string | null, "企業");

  const variables = {
    company_name: company.name,
    business_summary: company.business_summary ?? "(未入力)",
    target_customer_profile: company.target_customer_profile ?? "(未入力)",
    key_differentiators: company.key_differentiators ?? "(未入力)",
    appeal_axis: company.appeal_axis ?? "(未入力)",
    current_issues: company.current_issues ?? "(未入力)",
    reference_doc_summary: (company.strategy_reference_doc_summary as string | null) ?? "(参考資料なし)",
  };

  let content: { principle_scores: PrincipleScores; summary: string };
  try {
    const { template, promptId } = await getPromptTemplate("strategy_principle_scoring");
    content = await callClaudeJson(template, variables, { reportType: "strategy_principle_scoring" });

    const { error: reportError } = await supabase.from("generated_reports").insert({
      target_type: "company",
      target_id: companyId,
      report_type: "strategy_principle_scoring",
      content,
      generated_by: actor.id,
      prompt_id: promptId,
    });
    if (reportError) {
      console.warn("generated_reportsへの書き込みに失敗しました:", reportError.message);
    }
  } catch (e) {
    await recordError("strategy_principle_scoring", e, { companyId });
    if (e instanceof ClaudeJsonParseError) {
      return { error: "AIの応答を解析できませんでした。もう一度お試しください。" };
    }
    return { error: `AI呼び出しに失敗しました: ${(e as Error).message}` };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ principle_scores: content.principle_scores })
    .eq("id", companyId);
  if (updateError) {
    return { error: `企業情報の更新に失敗しました: ${updateError.message}` };
  }

  await recordAuditLog({
    userId: actor.id,
    action: "generate",
    targetType: "company",
    targetId: companyId,
    detail: { reportType: "strategy_principle_scoring" },
  });

  revalidatePath(`/companies/${companyId}`);

  return { principleScores: content.principle_scores, summary: content.summary };
}

export interface AbmRecommendation {
  recommended_angle: string;
  key_messages: string[];
  principles_to_emphasize: string[];
  cautions: string[];
}

/**
 * 自社の商談戦略プロファイル(7原則スコア・差別化要因・訴求軸)と、
 * 商談相手(プロスペクト)の情報から、見せ方の提案を1回生成する。
 */
export async function generateAbmRecommendation(
  companyId: string,
  prospectInfo: { name: string; notes: string }
): Promise<AbmRecommendation | { error: string }> {
  const supabase = createServerClient();
  const company = await getCompanyOrThrow(supabase, companyId);
  const actor = await assertOwnerOrManager(company.owner_user_id as string | null, "企業");

  if (!prospectInfo.name.trim()) {
    return { error: "商談相手企業名を入力してください。" };
  }

  const variables = {
    principle_scores: JSON.stringify(company.principle_scores ?? {}),
    key_differentiators: company.key_differentiators ?? "(未入力)",
    appeal_axis: company.appeal_axis ?? "(未入力)",
    prospect_name: prospectInfo.name,
    prospect_notes: prospectInfo.notes || "(特になし)",
  };

  let content: AbmRecommendation;
  try {
    const { template, promptId } = await getPromptTemplate("strategy_abm_recommendation");
    content = await callClaudeJson(template, variables, { reportType: "strategy_abm_recommendation" });

    const { error: reportError } = await supabase.from("generated_reports").insert({
      target_type: "company",
      target_id: companyId,
      report_type: "strategy_abm_recommendation",
      content: { ...content, prospect_name: prospectInfo.name },
      generated_by: actor.id,
      prompt_id: promptId,
    });
    if (reportError) {
      console.warn("generated_reportsへの書き込みに失敗しました:", reportError.message);
    }
  } catch (e) {
    await recordError("strategy_abm_recommendation", e, { companyId, prospectName: prospectInfo.name });
    if (e instanceof ClaudeJsonParseError) {
      return { error: "AIの応答を解析できませんでした。もう一度お試しください。" };
    }
    return { error: `AI呼び出しに失敗しました: ${(e as Error).message}` };
  }

  await recordAuditLog({
    userId: actor.id,
    action: "generate",
    targetType: "company",
    targetId: companyId,
    detail: { reportType: "strategy_abm_recommendation", prospectName: prospectInfo.name },
  });

  return content;
}
