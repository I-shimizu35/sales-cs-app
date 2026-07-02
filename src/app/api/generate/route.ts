import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { callClaudeJson, ClaudeJsonParseError } from "@/lib/claude";
import { getPromptTemplate } from "@/lib/prompts";
import { recordAuditLog } from "@/lib/audit";
import { ReportType } from "@/lib/types";
import { getCurrentUserId } from "@/lib/auth";

interface GenerateRequestBody {
  targetType: "company" | "deal" | "meeting";
  targetId: string;
  reportType: ReportType;
  variables: Record<string, unknown>;
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
      return NextResponse.json(
        {
          error:
            "Claudeの応答をJSONとして解析できませんでした。もう一度生成し直してください。",
          raw: e.raw,
        },
        { status: 502 }
      );
    }
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
