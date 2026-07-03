import { createServerClient } from "./supabase";

/**
 * システム内部エラー(AI生成失敗・メール送信失敗・cronジョブ失敗等)をerror_logsに記録する。
 * 監査ログ(audit_logs)と違い「誰が何をしたか」ではなく「何が壊れたか」を追うためのテーブル。
 * 呼び出し側の処理を止めないよう、書き込み自体が失敗してもthrowせずconsole.errorに留める。
 */
export async function recordError(
  source: string,
  error: unknown,
  detail?: Record<string, unknown>
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const supabase = createServerClient();
    const { error: insertError } = await supabase.from("error_logs").insert({
      source,
      message,
      detail: detail ?? null,
    });
    if (insertError) {
      console.error(`error_logsへの書き込みに失敗しました(source=${source}):`, insertError.message);
    }
  } catch (e) {
    console.error(`error_logsへの書き込みに失敗しました(source=${source}):`, e);
  }
}
