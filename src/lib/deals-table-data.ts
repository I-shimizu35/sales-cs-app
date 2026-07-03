import { createServerClient } from "./supabase";
import { DealsTableRow } from "@/components/deals-table";

/**
 * 案件管理表(ヨミ表統合)の行データを組み立てる。内部(全企業横断 or 企業フィルタ)・
 * クライアントポータル(自社のみ)の両方から使う共通ロジック。
 */
export async function getDealsTableRows(filter: { companyId?: string }): Promise<DealsTableRow[]> {
  const supabase = createServerClient();

  let query = supabase
    .from("deals")
    .select("*, companies(name, industry)")
    .order("created_at", { ascending: false });
  if (filter.companyId) {
    query = query.eq("company_id", filter.companyId);
  }

  const { data: deals, error } = await query;
  if (error) throw new Error(`案件一覧の取得に失敗しました: ${error.message}`);
  if (!deals || deals.length === 0) return [];

  const dealIds = deals.map((d) => d.id);
  const { data: actionItems } = await supabase
    .from("action_items")
    .select("deal_id, title, due_date, status")
    .in("deal_id", dealIds)
    .neq("status", "done")
    .order("due_date", { ascending: true });

  const nextActionByDeal: Record<string, { title: string; due_date: string }> = {};
  for (const item of actionItems ?? []) {
    if (!nextActionByDeal[item.deal_id]) {
      nextActionByDeal[item.deal_id] = { title: item.title, due_date: item.due_date };
    }
  }

  return deals.map((d: any) => {
    const nextAction = nextActionByDeal[d.id];
    return {
      id: d.id,
      companyId: d.company_id,
      companyName: d.companies?.name ?? "(企業不明)",
      companyIndustry: d.companies?.industry ?? null,
      title: d.title,
      stage: d.stage,
      deal_category: d.deal_category,
      contact_name: d.contact_name,
      contact_title: d.contact_title,
      lead_source: d.lead_source,
      amount: d.amount,
      win_probability: d.win_probability,
      expected_revenue: d.expected_revenue,
      first_meeting_date: d.first_meeting_date,
      proposal_meeting_date: d.proposal_meeting_date,
      forecast_meeting_date: d.forecast_meeting_date,
      expected_close_date: d.expected_close_date,
      last_contact_date: d.last_contact_date,
      next_meeting_at: d.next_meeting_at,
      next_action_date: nextAction?.due_date ?? null,
      next_action_title: nextAction?.title ?? null,
      customer_issues: d.customer_issues,
      proposal_content: d.proposal_content,
      bant_budget: d.bant_budget,
      bant_authority: d.bant_authority,
      bant_need: d.bant_need,
      bant_timeline: d.bant_timeline,
      concerns: d.concerns,
      lost_reason: d.lost_reason,
      follow_up_policy: d.follow_up_policy,
      minutes_doc_url: d.minutes_doc_url,
      first_meeting_video_url: d.first_meeting_video_url,
      second_meeting_video_url: d.second_meeting_video_url,
      proposal_doc_url: d.proposal_doc_url,
      quote_doc_url: d.quote_doc_url,
      meeting_feedback: d.meeting_feedback,
      roleplay_conducted_at: d.roleplay_conducted_at,
    };
  });
}
