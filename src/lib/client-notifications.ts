import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "./supabase";

export interface ClientNotification {
  id: string;
  company_id: string;
  deal_id: string | null;
  type: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

/**
 * クライアントポータル向けの通知を1件作成する。書き込み失敗で呼び出し元の
 * 処理(案件更新・cronバッチ等)を止めないよう、失敗してもthrowしない。
 */
export async function createClientNotification(
  supabase: SupabaseClient,
  params: { companyId: string; dealId?: string | null; type: string; message: string }
): Promise<void> {
  const { error } = await supabase.from("client_notifications").insert({
    company_id: params.companyId,
    deal_id: params.dealId ?? null,
    type: params.type,
    message: params.message,
  });
  if (error) {
    console.error("client_notificationsへの書き込みに失敗しました:", error.message);
  }
}

export async function getClientNotifications(companyId: string, limit = 20): Promise<ClientNotification[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("client_notifications")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ClientNotification[];
}
