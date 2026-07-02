"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { requireAdminOrManager } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { ReportType } from "@/lib/types";

export async function upsertPromptTemplate(
  reportType: ReportType,
  formData: FormData
): Promise<void> {
  const currentUser = await requireAdminOrManager();

  const templateText = formData.get("template_text");
  if (typeof templateText !== "string" || templateText.trim() === "") {
    throw new Error("プロンプト本文は必須です。");
  }

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("prompts")
    .select("id, version")
    .eq("name", reportType)
    .maybeSingle();

  let promptId: string;
  if (existing) {
    const { error } = await supabase
      .from("prompts")
      .update({
        template_text: templateText,
        version: existing.version + 1,
        updated_by: currentUser.id,
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(`プロンプトの更新に失敗しました: ${error.message}`);
    }
    promptId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("prompts")
      .insert({
        name: reportType,
        template_text: templateText,
        updated_by: currentUser.id,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      throw new Error(`プロンプトの登録に失敗しました: ${error?.message ?? ""}`);
    }
    promptId = inserted.id;
  }

  await recordAuditLog({
    userId: currentUser.id,
    action: "update",
    targetType: "prompt",
    targetId: promptId,
    detail: { reportType },
  });

  revalidatePath("/admin/prompts");
}
