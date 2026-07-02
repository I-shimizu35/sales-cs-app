import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { callClaudeJson, ClaudeJsonParseError } from "@/lib/claude";
import { getPromptTemplate } from "@/lib/prompts";
import { recordAuditLog } from "@/lib/audit";
import { ReportType } from "@/lib/types";
import { getCurrentUserId } from "@/lib/auth";

interface RequestBody {
  transcriptId: string;
}

/**
 * 文字起こし1件から、議事録→行動強化FB→行動是正FB→次回提案方針→BANT判定→
 * 温度感スコア→受注確度、の順にGPTを連鎖呼び出しし、各結果をgenerated_reportsへ
 * 保存、最終的にdeals(BANT/スコア)を更新する。
 *
 * 前段の生成結果を後段の入力に使う設計のため、途中で失敗した場合はそこまでの
 * 結果を返し、失敗した工程以降は生成しない(部分的な成功として扱う)。
 */
export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です。" }, { status: 400 });
  }
  if (!body.transcriptId) {
    return NextResponse.json({ error: "transcriptId は必須です。" }, { status: 400 });
  }

  const supabase = createServerClient();
  const userId = await getCurrentUserId();

  // 1. 文字起こし + 商談 + 案件 情報を取得
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("id, raw_text, meeting_id, meetings(id, deal_id, meeting_type, held_at)")
    .eq("id", body.transcriptId)
    .single();

  if (transcriptError || !transcript) {
    return NextResponse.json(
      { error: `文字起こしが見つかりません: ${transcriptError?.message ?? ""}` },
      { status: 404 }
    );
  }

  const meeting = (transcript as any).meetings;
  const dealId: string = meeting.deal_id;
  const meetingId: string = meeting.id;

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();
  if (dealError || !deal) {
    return NextResponse.json(
      { error: `案件情報が見つかりません: ${dealError?.message ?? ""}` },
      { status: 404 }
    );
  }

  const { count: meetingCount } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", dealId);

  const results: Partial<Record<ReportType, Record<string, unknown>>> = {};

  async function generateAndSave(
    reportType: ReportType,
    variables: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { template, promptId } = await getPromptTemplate(reportType);
    const content = await callClaudeJson(template, variables, { reportType });
    const { error } = await supabase.from("generated_reports").insert({
      target_type: "meeting",
      target_id: meetingId,
      report_type: reportType,
      content,
      generated_by: userId,
      prompt_id: promptId,
    });
    if (error) {
      throw new Error(`${reportType} の保存に失敗しました: ${error.message}`);
    }
    results[reportType] = content;
    return content;
  }

  try {
    // 2. 議事録
    const minutes = await generateAndSave("meeting_minutes", {
      transcript_text: transcript.raw_text,
      meeting_type: meeting.meeting_type,
    });

    // 3. 行動強化FB・行動是正FB(準備していたトークが未生成の場合は空文字で渡す)
    await generateAndSave("reinforcement_fb", {
      meeting_minutes: JSON.stringify(minutes),
      talk_script: "",
    });
    await generateAndSave("correction_fb", {
      meeting_minutes: JSON.stringify(minutes),
      talk_script: "",
      hearing_items: "",
    });

    // 4. BANT判定
    const bant = await generateAndSave("bant_judgement", {
      meeting_minutes: JSON.stringify(minutes),
    });

    // 5. 次回提案方針
    await generateAndSave("next_proposal_policy", {
      meeting_minutes: JSON.stringify(minutes),
      bant_result: JSON.stringify(bant),
      current_issues: "",
      goals: "",
    });

    // 6. 温度感スコア
    const temperature = await generateAndSave("temperature_score", {
      meeting_minutes: JSON.stringify(minutes),
      bant_result: JSON.stringify(bant),
      meeting_count: meetingCount ?? 1,
    });

    // 7. 受注確度
    const winProb = await generateAndSave("win_probability", {
      bant_result: JSON.stringify(bant),
      temperature_score: (temperature as any).score ?? 0,
      deal_stage: deal.stage,
      meeting_count: meetingCount ?? 1,
    });

    // 8. dealsテーブルを更新(AI生成の未確認値として保存)
    const bantData = bant as any;
    const { error: updateError } = await supabase
      .from("deals")
      .update({
        bant_budget: bantData.budget?.result ?? null,
        bant_authority: bantData.authority?.result ?? null,
        bant_need: bantData.need?.result ?? null,
        bant_timeline: bantData.timeline?.result ?? null,
        temperature_score: (temperature as any).score ?? null,
        win_probability: (winProb as any).win_probability ?? null,
        score_status: "ai_draft",
      })
      .eq("id", dealId);

    if (updateError) {
      throw new Error(`案件情報の更新に失敗しました: ${updateError.message}`);
    }

    await recordAuditLog({
      userId,
      action: "generate",
      targetType: "deal",
      targetId: dealId,
      detail: { source: "feedback_generate", transcriptId: body.transcriptId },
    });

    revalidatePath("/"); // ダッシュボードの「スコア要確認」件数等を最新化する
    revalidatePath(`/companies/${deal.company_id}`);

    return NextResponse.json({ results, dealId, meetingId });
  } catch (e) {
    // 途中まで生成できた結果は返しつつ、エラーも明示する(部分成功)
    const message =
      e instanceof ClaudeJsonParseError
        ? "Claudeの応答をJSONとして解析できませんでした。"
        : (e as Error).message;
    return NextResponse.json({ error: message, results, dealId, meetingId }, { status: 502 });
  }
}
