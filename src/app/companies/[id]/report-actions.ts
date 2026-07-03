"use server";

import { createServerClient } from "@/lib/supabase";
import { assertOwnerOrManager } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics-data";
import { buildWeeklyReportText } from "@/lib/report-text";
import { sendNotificationEmail } from "@/lib/notifications";
import { recordAuditLog } from "@/lib/audit";
import { recordError } from "@/lib/error-log";

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * 週次レポート(累計ヨミ件数・金額、今週の新規商談・受注)を企業のnotification_emailへ送信する。
 * 週報コピー機能と同じ内容をそのままメール本文にする。
 * 連打によるメール多重送信を防ぐため、直近送信から一定時間はブロックする。
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
  const actor = await assertOwnerOrManager(company.owner_user_id, "企業");

  if (!company.notification_email) {
    throw new Error("この企業には通知先メールアドレスが設定されていません。企業詳細の基本情報から設定してください。");
  }

  const { data: lastSend } = await supabase
    .from("audit_logs")
    .select("created_at")
    .eq("action", "send")
    .eq("target_type", "weekly_report_email")
    .eq("target_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastSend) {
    const elapsedMs = Date.now() - new Date(lastSend.created_at).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const waitMinutes = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 60000);
      throw new Error(`直近に送信済みです。あと約${waitMinutes}分待ってから再度お試しください。`);
    }
  }

  const { weeklyReport } = await getAnalyticsData({ companyId });
  const text = buildWeeklyReportText(weeklyReport, company.name);

  try {
    await sendNotificationEmail({
      to: company.notification_email,
      subject: `【${company.name}様】週次ご報告(${weeklyReport.weekStart}〜${weeklyReport.weekEnd})`,
      body: text,
    });
  } catch (e) {
    await recordError("email_send", e, { companyId, kind: "weekly_report" });
    throw e;
  }

  await recordAuditLog({
    userId: actor.id,
    action: "send",
    targetType: "weekly_report_email",
    targetId: companyId,
  });
}
