import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "./supabase";
import { sendNotificationEmail } from "./notifications";

// 同じsourceのエラーが連発しても管理者に何通もメールが飛ばないよう、
// このwindow内で最初の1件だけアラートを送る(以降は/admin/errorsで確認する想定)。
const ALERT_WINDOW_MINUTES = 30;

/**
 * システム内部エラー(AI生成失敗・メール送信失敗・cronジョブ失敗等)をerror_logsに記録する。
 * 監査ログ(audit_logs)と違い「誰が何をしたか」ではなく「何が壊れたか」を追うためのテーブル。
 * 呼び出し側の処理を止めないよう、書き込み・通知が失敗してもthrowせずconsole.errorに留める。
 */
export async function recordError(
  source: string,
  error: unknown,
  detail?: Record<string, unknown>
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const supabase = createServerClient();
  try {
    const { error: insertError } = await supabase.from("error_logs").insert({
      source,
      message,
      detail: detail ?? null,
    });
    if (insertError) {
      console.error(`error_logsへの書き込みに失敗しました(source=${source}):`, insertError.message);
      return;
    }
  } catch (e) {
    console.error(`error_logsへの書き込みに失敗しました(source=${source}):`, e);
    return;
  }

  await maybeSendErrorAlert(supabase, source, message);
}

async function maybeSendErrorAlert(supabase: SupabaseClient, source: string, message: string): Promise<void> {
  try {
    const since = new Date(Date.now() - ALERT_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("source", source)
      .gte("created_at", since);
    // 直前にinsertした自分自身の1件だけなら、このwindowで最初の発生とみなして通知する
    if ((count ?? 0) > 1) return;

    const { data: admins } = await supabase
      .from("users")
      .select("email")
      .eq("role", "admin")
      .eq("status", "active");
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
      await sendNotificationEmail({
        to: admin.email,
        subject: `【要確認】システムエラーが発生しました(${source})`,
        body: `以下のエラーが発生しました。\n\n発生箇所: ${source}\nメッセージ: ${message}\n\n詳細は管理画面(/admin/errors)でご確認ください。\n※このメールは${ALERT_WINDOW_MINUTES}分間に同じ発生箇所で最初のエラーが起きた際に一度だけ送信されます。`,
      });
    }
  } catch (e) {
    console.error(`エラーアラートメールの送信に失敗しました(source=${source}):`, e);
  }
}
