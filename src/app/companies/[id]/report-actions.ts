"use server";

import { createServerClient } from "@/lib/supabase";
import { assertOwnerOrManager } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics-data";
import { buildWeeklyReportText } from "@/lib/report-text";
import { sendNotificationEmail } from "@/lib/notifications";

/**
 * 週次レポート(累計ヨミ件数・金額、今週の新規商談・受注)を企業のnotification_emailへ送信する。
 * 週報コピー機能と同じ内容をそのままメール本文にする。
 */
export async function sendWeeklyReportEmail(companyId: string): Promise<void> {
  const supabase = createServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("owner_user_id, name, notification_email")
    .eq("id", companyId)
    .single();
  if (error || !company) {
    throw new Error(`企業情報の取得に失敗しました: ${error?.message ?? ""}`);
  }
  await assertOwnerOrManager(company.owner_user_id, "企業");

  if (!company.notification_email) {
    throw new Error("この企業には通知先メールアドレスが設定されていません。企業詳細の基本情報から設定してください。");
  }

  const { weeklyReport } = await getAnalyticsData({ companyId });
  const text = buildWeeklyReportText(weeklyReport, company.name);

  await sendNotificationEmail({
    to: company.notification_email,
    subject: `【${company.name}様】週次ご報告(${weeklyReport.weekStart}〜${weeklyReport.weekEnd})`,
    body: text,
  });
}
