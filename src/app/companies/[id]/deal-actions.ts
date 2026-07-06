"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { assertOwnerOrClientCompany, CurrentActor } from "@/lib/auth";
import { DealStage } from "@/lib/types";
import { DEAL_CSV_COLUMNS } from "@/lib/deal-csv-columns";

const DEAL_STAGES: DealStage[] = [
  "first_contact",
  "hearing",
  "proposal",
  "closing",
  "won",
  "lost",
];

// 案件管理表(ヨミ表統合)の編集可能フィールド。meeting_feedbackのみ社内限定(別途フィルタ)。
const EDITABLE_TEXT_FIELDS = [
  "title",
  "deal_category",
  "contact_name",
  "contact_title",
  "lead_source",
  "customer_issues",
  "proposal_content",
  "concerns",
  "lost_reason",
  "follow_up_policy",
  "minutes_doc_url",
  "first_meeting_video_url",
  "second_meeting_video_url",
  "proposal_doc_url",
  "quote_doc_url",
  "bant_budget",
  "bant_authority",
  "bant_need",
  "bant_timeline",
] as const;
const EDITABLE_NUMBER_FIELDS = ["amount", "win_probability", "expected_revenue", "temperature_score"] as const;
const EDITABLE_DATE_FIELDS = [
  "first_meeting_date",
  "proposal_meeting_date",
  "forecast_meeting_date",
  "expected_close_date",
  "last_contact_date",
  "roleplay_conducted_at",
] as const;
const EDITABLE_DATETIME_FIELDS = ["next_meeting_at"] as const;
const STAFF_ONLY_TEXT_FIELDS = ["meeting_feedback"] as const;

function userIdOfActor(actor: CurrentActor): string | null {
  return actor.type === "staff" ? actor.id : null;
}

/**
 * 案件が失注(lost)になった場合、リードとして自動登録する。
 * updateDealFields から呼ばれる。既にlostだった場合(再保存等)は重複登録を避けるためスキップする。
 * 案件管理表に既に入力済みの内容(顧客課題・提案内容・失注理由・最終接触日等)を引き継ぎ、
 * リード側での再入力(二度手間)を避ける。
 */
async function maybeAutoCreateLeadFromLostDeal(
  supabase: SupabaseClient,
  params: {
    dealId: string;
    companyId: string;
    previousStage: DealStage;
    newStage: string;
    dealTitle: string;
    ownerUserId: string | null;
  }
): Promise<boolean> {
  if (params.newStage !== "lost") return false;
  if (params.previousStage === "lost") return false;

  const [{ data: company }, { data: deal }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", params.companyId).maybeSingle(),
    supabase
      .from("deals")
      .select("contact_name, contact_title, customer_issues, proposal_content, lost_reason, last_contact_date")
      .eq("id", params.dealId)
      .maybeSingle(),
  ]);

  const activitySummaryParts = [
    deal?.contact_name ? `担当者: ${deal.contact_name}${deal.contact_title ? `(${deal.contact_title})` : ""}` : null,
    deal?.customer_issues ? `顧客課題: ${deal.customer_issues}` : null,
    deal?.proposal_content ? `提案内容: ${deal.proposal_content}` : null,
  ].filter((s): s is string => !!s);

  const { error } = await supabase.from("leads").insert({
    company_id: params.companyId,
    converted_from_deal_id: params.dealId,
    lead_company_name: company?.name ?? params.dealTitle,
    owner_user_id: params.ownerUserId,
    lead_source: "失注案件からの自動登録",
    activity_summary: activitySummaryParts.length > 0 ? activitySummaryParts.join("\n") : null,
    last_approach_result: deal?.lost_reason ?? null,
    last_approach_at: deal?.last_contact_date ? new Date(deal.last_contact_date).toISOString() : null,
  });
  if (error) {
    console.warn("失注案件のリード自動登録に失敗しました:", error.message);
    return false;
  }
  return true;
}

export async function createDeal(companyId: string, formData: FormData): Promise<void> {
  const title = formData.get("title");
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("案件名は必須です。");
  }

  const supabase = createServerClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("owner_user_id, default_deal_category, default_lead_source")
    .eq("id", companyId)
    .single();
  if (companyError || !company) {
    throw new Error(`企業情報の取得に失敗しました: ${companyError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: company.owner_user_id, companyId },
    "企業"
  );

  const ownerUserId = formData.get("owner_user_id");

  const { data, error } = await supabase
    .from("deals")
    .insert({
      company_id: companyId,
      title: title.trim(),
      owner_user_id: (ownerUserId as string) || null,
      // 案件テンプレート: 企業ごとに設定したデフォルト値を新規案件へ自動適用する
      deal_category: company.default_deal_category || null,
      lead_source: company.default_lead_source || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`案件作成に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "create",
    targetType: "deal",
    targetId: data.id,
  });

  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/workspace/deals`);
  revalidatePath(`/companies/${companyId}/workspace/dashboard`);
  revalidatePath(`/companies/${companyId}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath("/"); // ダッシュボードの集計もこのタイミングで最新化する
  revalidatePath("/transcripts/new"); // 案件プルダウンにも反映させる
}

const CSV_NUMBER_FIELDS = new Set(["amount", "win_probability", "expected_revenue"]);
const CSV_DATE_FIELDS = new Set([
  "first_meeting_date",
  "proposal_meeting_date",
  "forecast_meeting_date",
  "expected_close_date",
  "last_contact_date",
  "roleplay_conducted_at",
]);
const STAGE_LABEL_TO_VALUE: Record<string, DealStage> = {
  初回接触: "first_contact",
  ヒアリング: "hearing",
  提案: "proposal",
  クロージング: "closing",
  受注: "won",
  失注: "lost",
};

/**
 * 案件管理表のCSVダウンロードと同じ列構成のCSVを一括登録する(新規追加のみ。既存案件の上書きはしない)。
 * 既に他システム/Excelで案件を管理しているクライアントを新規に支援開始する際、
 * 手入力し直す手間を省くための機能。
 */
export async function bulkImportDeals(
  companyId: string,
  rows: Record<string, string>[]
): Promise<{ imported: number; skipped: number }> {
  const supabase = createServerClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (companyError || !company) {
    throw new Error(`企業情報の取得に失敗しました: ${companyError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany({ ownerUserId: company.owner_user_id, companyId }, "企業");

  let imported = 0;
  let skipped = 0;
  const inserts: Record<string, unknown>[] = [];

  for (const row of rows) {
    const title = row.title?.trim();
    if (!title) {
      skipped++;
      continue;
    }
    const insert: Record<string, unknown> = { company_id: companyId, title };
    for (const { key } of DEAL_CSV_COLUMNS) {
      if (key === "title") continue;
      const raw = row[key]?.trim();
      if (!raw) continue;
      if (key === "stage") {
        insert.stage = STAGE_LABEL_TO_VALUE[raw] ?? (DEAL_STAGES.includes(raw as DealStage) ? raw : undefined);
      } else if (CSV_NUMBER_FIELDS.has(key)) {
        const num = Number(raw.replace(/[,¥\s]/g, ""));
        if (!Number.isNaN(num)) insert[key] = num;
      } else if (CSV_DATE_FIELDS.has(key)) {
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) insert[key] = raw.slice(0, 10);
      } else {
        insert[key] = raw;
      }
    }
    inserts.push(insert);
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("deals").insert(inserts);
    if (error) {
      throw new Error(`CSVインポートに失敗しました: ${error.message}`);
    }
    imported = inserts.length;
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "create",
    targetType: "company",
    targetId: companyId,
    detail: { event: "deals_csv_import", imported, skipped },
  });

  revalidatePath(`/companies/${companyId}/workspace/deals`);
  revalidatePath(`/companies/${companyId}/workspace/dashboard`);
  revalidatePath(`/companies/${companyId}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/");

  return { imported, skipped };
}

const UPLOADABLE_FIELDS = ["minutes_doc_url", "proposal_doc_url", "quote_doc_url"] as const;
const ATTACHMENT_BUCKET = "deal-documents";
// HTML/SVG/実行ファイル等、ブラウザ内で描画・実行されうる形式を除外した許可リスト方式。
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "zip",
]);
// 署名付きURLの有効期限(10年)。バケットが非公開のため、案件管理表のURL欄には
// 有効期限付きの署名URLをそのまま保存する簡易実装(期限切れ時は再アップロードが必要)。
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365 * 10;

/**
 * 商談議事録・提案書・見積もりのファイルをSupabase Storageへアップロードし、
 * 対応するURL欄に署名付きURLを保存する。商談動画は既存方針通りGoogle Drive運用のため対象外。
 */
// 本番ビルドではServer Actionからthrowしたエラーのmessageが汎用文言に丸められて
// クライアントに渡らない(Next.jsの仕様)ため、ユーザーが実際に踏みうる検証エラーは
// throwではなく戻り値のerrorとして返す(戻り値は丸められない)。
export async function uploadDealAttachment(
  dealId: string,
  fieldKey: (typeof UPLOADABLE_FIELDS)[number],
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  if (!UPLOADABLE_FIELDS.includes(fieldKey)) {
    return { error: "アップロード対象のフィールドが不正です。" };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "ファイルを選択してください。" };
  }

  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    return { error: `案件情報の取得に失敗しました: ${fetchError?.message ?? ""}` };
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "案件"
  );

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    return {
      error: `この形式のファイルはアップロードできません(対応形式: ${Array.from(ALLOWED_ATTACHMENT_EXTENSIONS).join(", ")})。`,
    };
  }

  const safeName = file.name.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, "_");
  const path = `${existing.company_id}/${dealId}/${fieldKey}-${Date.now()}-${safeName}`;

  // contentTypeはブラウザが渡すfile.typeを信用せず、拡張子から安全側で決め打ちする
  // (HTML/SVG等をブラウザ内で描画・実行させないため。閲覧時も常にダウンロードさせる)
  // FileをBlobのまま渡すとstorage-jsがmultipart/form-data経路に分岐し、
  // ここで指定したcontentTypeが無視されてfile.type(ブラウザ申告値)がそのまま使われてしまうため、
  // 明示的にBufferへ変換してcontentTypeが確実に適用される経路を通す。
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, fileBuffer, { contentType: "application/octet-stream" });
  if (uploadError) {
    return { error: `ファイルのアップロードに失敗しました: ${uploadError.message}` };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN, { download: safeName });
  if (signError || !signed) {
    return { error: `アップロードURLの発行に失敗しました: ${signError?.message ?? ""}` };
  }

  const { error: updateError } = await supabase
    .from("deals")
    .update({ [fieldKey]: signed.signedUrl })
    .eq("id", dealId);
  if (updateError) {
    return { error: `案件情報の更新に失敗しました: ${updateError.message}` };
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "update",
    targetType: "deal",
    targetId: dealId,
    detail: { field: fieldKey, event: "file_upload", fileName: file.name },
  });

  revalidatePath(`/companies/${existing.company_id}/workspace/deals`);
  revalidatePath("/client/deals");
  revalidatePath(`/companies/${existing.company_id}`);

  return { url: signed.signedUrl };
}

export async function deleteDeal(dealId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "案件"
  );

  await supabase.from("action_items").delete().eq("deal_id", dealId);

  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    throw new Error(`案件削除に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "delete",
    targetType: "deal",
    targetId: dealId,
  });

  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath(`/companies/${existing.company_id}/workspace/deals`);
  revalidatePath(`/companies/${existing.company_id}/workspace/dashboard`);
  revalidatePath(`/companies/${existing.company_id}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath("/");
}

/**
 * 既存案件を複製して新規案件として作成する(テンプレート化)。
 * 案件区分・担当者・流入経路等の構造的な項目のみ引き継ぎ、金額・日程・スコア・
 * 添付ファイル・商談FB等その案件サイクル固有の情報は引き継がない(新規案件として空の状態にする)。
 */
export async function duplicateDeal(dealId: string): Promise<{ id: string }> {
  const supabase = createServerClient();
  const { data: original, error: fetchError } = await supabase
    .from("deals")
    .select("company_id, owner_user_id, title, deal_category, contact_name, contact_title, lead_source")
    .eq("id", dealId)
    .single();
  if (fetchError || !original) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: original.owner_user_id, companyId: original.company_id },
    "案件"
  );

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      company_id: original.company_id,
      title: `${original.title}のコピー`,
      owner_user_id: original.owner_user_id,
      deal_category: original.deal_category,
      contact_name: original.contact_name,
      contact_title: original.contact_title,
      lead_source: original.lead_source,
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`案件の複製に失敗しました: ${error?.message ?? ""}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "create",
    targetType: "deal",
    targetId: created.id,
    detail: { source: "duplicate", fromDealId: dealId },
  });

  revalidatePath(`/companies/${original.company_id}/workspace/deals`);
  revalidatePath(`/companies/${original.company_id}/workspace/dashboard`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");

  return { id: created.id };
}

/**
 * 案件管理表(ヨミ表統合)からの汎用更新。フォームに含まれるフィールドのみ更新する。
 * クライアントポータルからも呼ばれるため、meeting_feedbackは社内スタッフのみ反映する。
 */
export async function updateDealFields(
  dealId: string,
  formData: FormData
): Promise<{ leadCreated: boolean }> {
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id, stage, title")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }

  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "案件"
  );

  const update: Record<string, unknown> = {};

  for (const key of EDITABLE_TEXT_FIELDS) {
    if (!formData.has(key)) continue;
    const value = (formData.get(key) as string) || null;
    if (key === "title" && !value) {
      throw new Error("案件名は空にできません。");
    }
    update[key] = value;
  }
  for (const key of EDITABLE_NUMBER_FIELDS) {
    if (formData.has(key)) {
      const raw = formData.get(key) as string;
      update[key] = raw === "" ? null : Number(raw);
    }
  }
  for (const key of [...EDITABLE_DATE_FIELDS, ...EDITABLE_DATETIME_FIELDS]) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
  }
  if (actor.type === "staff") {
    for (const key of STAFF_ONLY_TEXT_FIELDS) {
      if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
    }
  }

  let newStage: string | null = null;
  if (formData.has("stage")) {
    const stage = formData.get("stage");
    if (typeof stage === "string" && DEAL_STAGES.includes(stage as DealStage)) {
      update.stage = stage;
      newStage = stage;
    } else {
      throw new Error("フェーズの値が不正です。");
    }
  }

  if (Object.keys(update).length === 0) return { leadCreated: false };

  const { error } = await supabase.from("deals").update(update).eq("id", dealId);
  if (error) {
    throw new Error(`案件情報の更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "update",
    targetType: "deal",
    targetId: dealId,
    detail: { fields: Object.keys(update) },
  });

  let leadCreated = false;
  if (newStage) {
    leadCreated = await maybeAutoCreateLeadFromLostDeal(supabase, {
      dealId,
      companyId: existing.company_id,
      previousStage: existing.stage as DealStage,
      newStage,
      dealTitle: existing.title,
      ownerUserId: existing.owner_user_id,
    });
  }

  revalidatePath(`/companies/${existing.company_id}/workspace/deals`);
  revalidatePath(`/companies/${existing.company_id}/workspace/dashboard`);
  revalidatePath(`/companies/${existing.company_id}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath("/");

  return { leadCreated };
}
