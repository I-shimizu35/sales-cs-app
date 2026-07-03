"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { assertOwnerOrManager } from "@/lib/auth";

export async function createTranscript(formData: FormData): Promise<void> {
  const dealId = formData.get("deal_id");
  const heldAt = formData.get("held_at");
  const rawText = formData.get("raw_text");

  if (typeof dealId !== "string" || dealId === "") {
    throw new Error("対象案件を選択してください。");
  }
  if (typeof rawText !== "string" || rawText.trim() === "") {
    throw new Error("文字起こしテキストを入力してください。");
  }

  const supabase = createServerClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("owner_user_id")
    .eq("id", dealId)
    .single();
  if (dealError || !deal) {
    throw new Error(`案件情報の取得に失敗しました: ${dealError?.message ?? ""}`);
  }
  const currentUser = await assertOwnerOrManager(deal.owner_user_id, "案件");
  const userId = currentUser.id;

  // 1. 商談(meeting)を作成
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      deal_id: dealId,
      held_at: typeof heldAt === "string" && heldAt !== "" ? heldAt : null,
      meeting_type: "hearing",
    })
    .select("id")
    .single();

  if (meetingError) {
    throw new Error(`商談情報の作成に失敗しました: ${meetingError.message}`);
  }

  // 2. 文字起こしを保存
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .insert({
      meeting_id: meeting.id,
      raw_text: rawText,
      input_method: "paste",
      registered_by: userId,
    })
    .select("id")
    .single();

  if (transcriptError) {
    throw new Error(`文字起こしの保存に失敗しました: ${transcriptError.message}`);
  }

  await recordAuditLog({
    userId,
    action: "create",
    targetType: "transcript",
    targetId: transcript.id,
    detail: { meeting_id: meeting.id, deal_id: dealId },
  });

  revalidatePath("/transcripts/new");
  redirect(`/feedback/generate?transcriptId=${transcript.id}`);
}
