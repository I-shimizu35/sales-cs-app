import { createServerClient } from "./supabase";
import { ActionItem } from "./types";

export interface DealActionItemsGroup {
  dealId: string;
  dealTitle: string;
  items: ActionItem[];
}

/**
 * 企業配下の全案件について、案件ごとの次回アクション一覧を組み立てる。
 * ワークスペース/クライアントポータル双方の案件管理表下に表示する用。
 */
export async function getActionItemsByDeal(companyId: string): Promise<DealActionItemsGroup[]> {
  const supabase = createServerClient();

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, title")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (dealsError) throw new Error(`案件一覧の取得に失敗しました: ${dealsError.message}`);
  if (!deals || deals.length === 0) return [];

  const dealIds = deals.map((d) => d.id);
  const { data: items, error: itemsError } = await supabase
    .from("action_items")
    .select("*")
    .in("deal_id", dealIds)
    .order("due_date", { ascending: true });
  if (itemsError) throw new Error(`次回アクションの取得に失敗しました: ${itemsError.message}`);

  const itemsByDeal: Record<string, ActionItem[]> = {};
  for (const item of (items ?? []) as ActionItem[]) {
    if (!itemsByDeal[item.deal_id]) itemsByDeal[item.deal_id] = [];
    itemsByDeal[item.deal_id].push(item);
  }

  return deals.map((d) => ({
    dealId: d.id,
    dealTitle: d.title,
    items: itemsByDeal[d.id] ?? [],
  }));
}
