import { createServerClient } from "./supabase";

/**
 * 重要操作(create/update/generate/export/reflect)を audit_logs に記録する共通関数。
 * 呼び出し側の処理を止めないよう、失敗してもthrowせずログにwarnするのみとする
 * (監査ログの書き込み失敗が本処理を止めるべきではないため)。
 */
export async function recordAuditLog(params: {
  userId: string | null;
  action: "create" | "update" | "generate" | "export" | "reflect" | "delete";
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      detail: params.detail ?? null,
    });
    if (error) {
      console.warn("audit_logsへの書き込みに失敗しました:", error.message);
    }
  } catch (e) {
    console.warn("audit_logsへの書き込みに失敗しました:", e);
  }
}
