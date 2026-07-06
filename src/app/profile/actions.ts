"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("ログインが必要です。");

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("氏名を入力してください。");
  }

  const notifyOverdueActions = formData.get("notify_overdue_actions") === "on";
  const notifyFrequency = formData.get("notify_frequency");
  if (notifyFrequency !== "daily" && notifyFrequency !== "weekly") {
    throw new Error("通知頻度の値が不正です。");
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("users")
    .update({
      name: name.trim(),
      notify_overdue_actions: notifyOverdueActions,
      notify_frequency: notifyFrequency,
    })
    .eq("id", currentUser.id);
  if (error) throw new Error(`プロフィールの更新に失敗しました: ${error.message}`);

  revalidatePath("/profile");
}
