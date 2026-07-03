"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { assertOwnerOrManager } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/notifications";

export async function storeFeedbackToDeal(dealId: string, feedbackText: string): Promise<void> {
  const supabase = createServerClient();

  const { data: deal, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id, title, companies(name, notification_email)")
    .eq("id", dealId)
    .single();
  if (fetchError || !deal) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(deal.owner_user_id, "案件");

  const { error } = await supabase.from("deals").update({ meeting_feedback: feedbackText }).eq("id", dealId);
  if (error) {
    throw new Error(`商談FBの格納に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${deal.company_id}/workspace/deals`);
  revalidatePath("/client/deals");
  revalidatePath(`/companies/${deal.company_id}`);

  const company = deal.companies as unknown as { name: string; notification_email: string | null } | null;
  if (company?.notification_email) {
    await sendNotificationEmail({
      to: company.notification_email,
      subject: `【${company.name}】案件「${deal.title}」に商談FBが届いています`,
      body: `${company.name} ご担当者様\n\n案件「${deal.title}」に新しい商談FB(フィードバック)が届きました。\n案件管理表からご確認ください。\n\n※本メールは自動送信です。`,
    });
  }
}
