import { createServerClient } from "./supabase";
import { DealStage } from "./types";

export interface MonthlyTrendPoint {
  month: string; // 'YYYY-MM'
  新規商談数: number;
  受注件数: number;
  受注金額: number;
}

export interface StageBreakdownPoint {
  stage: string;
  count: number;
}

export interface OwnerPerformancePoint {
  ownerName: string;
  wonCount: number;
  wonAmount: number;
}

const STAGE_ORDER: DealStage[] = ["first_contact", "hearing", "proposal", "closing", "won", "lost"];

function monthRange(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export async function getAnalyticsData(filter: {
  companyId?: string;
  month?: string;
}): Promise<{
  monthlyTrend: MonthlyTrendPoint[];
  stageBreakdown: StageBreakdownPoint[];
  ownerPerformance: OwnerPerformancePoint[];
  availableMonths: string[];
}> {
  const supabase = createServerClient();

  let query = supabase
    .from("deals")
    .select("stage, amount, owner_user_id, first_meeting_date, expected_close_date");
  if (filter.companyId) query = query.eq("company_id", filter.companyId);
  const { data, error } = await query;
  if (error) throw new Error(`分析データの取得に失敗しました: ${error.message}`);

  const all = data ?? [];
  const months = monthRange();

  const monthlyTrend: MonthlyTrendPoint[] = months.map((month) => {
    const newMeetings = all.filter((d) => d.first_meeting_date?.startsWith(month)).length;
    const wonDeals = all.filter((d) => d.stage === "won" && d.expected_close_date?.startsWith(month));
    return {
      month,
      新規商談数: newMeetings,
      受注件数: wonDeals.length,
      受注金額: wonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    };
  });

  const filtered = filter.month
    ? all.filter((d) => d.first_meeting_date?.startsWith(filter.month!))
    : all;

  const stageBreakdown: StageBreakdownPoint[] = STAGE_ORDER.map((stage) => ({
    stage,
    count: filtered.filter((d) => d.stage === stage).length,
  }));

  const ownerIds = Array.from(
    new Set(filtered.map((d) => d.owner_user_id).filter((id): id is string => !!id))
  );
  let ownerPerformance: OwnerPerformancePoint[] = [];
  if (ownerIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, name").in("id", ownerIds);
    const nameById: Record<string, string> = {};
    for (const u of users ?? []) nameById[u.id] = u.name;

    const byOwner: Record<string, { wonCount: number; wonAmount: number }> = {};
    for (const d of filtered) {
      if (!d.owner_user_id || d.stage !== "won") continue;
      if (!byOwner[d.owner_user_id]) byOwner[d.owner_user_id] = { wonCount: 0, wonAmount: 0 };
      byOwner[d.owner_user_id].wonCount += 1;
      byOwner[d.owner_user_id].wonAmount += d.amount ?? 0;
    }
    ownerPerformance = Object.entries(byOwner).map(([id, v]) => ({
      ownerName: nameById[id] ?? "不明",
      ...v,
    }));
  }

  return { monthlyTrend, stageBreakdown, ownerPerformance, availableMonths: months };
}
