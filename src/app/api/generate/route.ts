import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { callClaudeJson, ClaudeJsonParseError } from "@/lib/claude";
import { getPromptTemplate } from "@/lib/prompts";
import { recordAuditLog } from "@/lib/audit";
import { recordError } from "@/lib/error-log";
import { ReportType } from "@/lib/types";
import { getCurrentUserId, assertOwnerOrManager } from "@/lib/auth";

interface GenerateRequestBody {
  targetType: "company" | "deal" | "meeting";
  targetId: string;
  reportType: ReportType;
  variables: Record<string, unknown>;
}

/**
 * targetType/targetIdからowner_user_idを解決し、担当者本人またはadmin/managerのみに制限する。
 * meetingはdeal経由でownerを辿る。
 */
async function assertCanGenerateForTarget(
  supabase: ReturnType<typeof createServerClient>,
  targetType: GenerateRequestBody["targetType"],
  targetId: string
): Promise<void> {
  if (targetType === "company") {
    const { data } = await supabase.from("companies").select("owner_user_id").eq("id", targetId).maybeSingle();
    await assertOwnerOrManager(data?.owner_user_id ?? null, "企業");
    return;
  }
  if (targetType === "deal") {
    const { data } = await supabase.from("deals").select("owner_user_id").eq("id", targetId).maybeSingle();
    await assertOwnerOrManager(data?.owner_user_id ?? null, "案件");
    return;
  }
  const { data: meeting } = await supabase.from("meetings").select("deal_id").eq("id", targetId).maybeSingle();
  const { data: deal } = meeting
    ? await supabase.from("deals").select("owner_user_id").eq("id", meeting.deal_id).maybeSingle()
    : { data: null };
  await assertOwnerOrManager(deal?.owner_user_id ?? null, "商談");
}

export async function POST(req: NextRequest) {
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です。" }, { status: 400 });
  }

  const { targetType, targetId, reportType, variables } = body;
  if (!targetType || !targetId || !reportType) {
    return NextResponse.json(
      { error: "targetType, targetId, reportType は必須です。" },
      { status: 400 }
    );
  }

  const scopeCheckSupabase = createServerClient();
  try {
    await assertCanGenerateForTarget(scopeCheckSupabase, targetType, targetId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }

  let template: string;
  let promptId: string | null;
  try {
    const result = await getPromptTemplate(reportType);
    template = result.template;
    promptId = result.promptId;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  let content: Record<string, unknown>;
  try {
    content = await callClaudeJson(template, variables ?? {}, { reportType });
  } catch (e) {
    if (e instanceof ClaudeJsonParseError) {
      await recordError("ai_generate", e, { targetType, targetId, reportType, raw: e.raw });
      return NextResponse.json(
        {
          error:
            "Claudeの応答をJSONとして解析できませんでした。もう一度生成し直してください。",
          raw: e.raw,
        },
        { status: 502 }
      );
    }
    await recordError("ai_generate", e, { targetType, targetId, reportType });
    return NextResponse.json(
      { error: `Claude呼び出しに失敗しました: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  const userId = await getCurrentUserId();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("generated_reports")
    .insert({
      target_type: targetType,
      target_id: targetId,
      report_type: reportType,
      content,
      generated_by: userId,
      prompt_id: promptId,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `生成結果の保存に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  await recordAuditLog({
    userId,
    action: "generate",
    targetType,
    targetId,
    detail: { reportType },
  });

  return NextResponse.json({ report: data });
}
