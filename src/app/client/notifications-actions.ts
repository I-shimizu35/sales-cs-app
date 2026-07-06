"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { getCurrentClient } from "@/lib/auth";

export async function markNotificationRead(notificationId: string): Promise<void> {
  const client = await getCurrentClient();
  if (!client) throw new Error("認証が必要です。");

  const supabase = createServerClient();
  // company_idも条件に含めることで、他社の通知IDを既読化されるのを防ぐ
  await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", client.companyId);

  revalidatePath("/client", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const client = await getCurrentClient();
  if (!client) throw new Error("認証が必要です。");

  const supabase = createServerClient();
  await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", client.companyId)
    .is("read_at", null);

  revalidatePath("/client", "layout");
}
