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

export interface YomiSummary {
  yomiCount: number;
  expectedRevenueTotal: number;
}

export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD(月曜)
  weekEnd: string; // YYYY-MM-DD(今日 or 日曜)
  yomiCount: number;
  expectedRevenueTotal: number;
  newMeetingsThisWeek: number;
  wonCountThisWeek: number;
  wonAmountThisWeek: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  newMeetings: number;
  wonCount: number;
  wonAmount: number;
  lostCount: number;
  topLostReasons: { reason: string; count: number }[];
}

export interface LostReasonBreakdownPoint {
  reason: string;
  count: number;
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

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 今週(月曜始まり)の開始日・終了日(今日)をYYYY-MM-DDで返す */
function currentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=日,1=月,...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return { weekStart: toIsoDate(monday), weekEnd: toIsoDate(now) };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getAnalyticsData(filter: {
  companyId?: string;
  month?: string;
}): Promise<{
  monthlyTrend: MonthlyTrendPoint[];
  stageBreakdown: StageBreakdownPoint[];
  ownerPerformance: OwnerPerformancePoint[];
  yomiSummary: YomiSummary;
  weeklyReport: WeeklyReport;
  monthlyReport: MonthlyReport;
  lostReasonBreakdown: LostReasonBreakdownPoint[];
  availableMonths: string[];
}> {
  const supabase = createServerClient();

  let query = supabase
    .from("deals")
    .select(
      "stage, amount, expected_revenue, owner_user_id, first_meeting_date, expected_close_date, lost_reason, updated_at"
    );
  if (filter.companyId) query = query.eq("company_id", filter.companyId);
  const { data, error } = await query;
  if (error) throw new Error(`分析データの取得に失敗しました: ${error.message}`);

  const all = data ?? [];
  const months = monthRange();

  // 受注日・失注日を直接持つ列がないため、updated_at(ステージ変更時に更新される)を
  // 「受注/失注に至った日」の代わりに使う。expected_close_date(受注予定日)は
  // 未入力のことが多く、それで絞ると集計から漏れるケースが多いため使わない。
  const monthlyTrend: MonthlyTrendPoint[] = months.map((month) => {
    const newMeetings = all.filter((d) => d.first_meeting_date?.startsWith(month)).length;
    const wonDeals = all.filter((d) => d.stage === "won" && d.updated_at?.startsWith(month));
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

  // ヨミ件数・見込み受注は「現時点で進行中の案件」を表すスナップショット指標のため、
  // 対象月(新規商談日基準)フィルタの影響を受けない(=常にallから集計する)。
  // 月フィルタをかけると新規商談日が未入力の案件が集計から漏れてしまうため。
  const yomiDeals = all.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const yomiSummary: YomiSummary = {
    yomiCount: yomiDeals.length,
    expectedRevenueTotal: yomiDeals.reduce((sum, d) => sum + (d.expected_revenue ?? d.amount ?? 0), 0),
  };

  // 週次レポート(毎週金曜のクライアント報告用): 今週(月曜起点)の新規商談・受注実績 + 現時点の累計ヨミ
  const { weekStart, weekEnd } = currentWeekRange();
  const newMeetingsThisWeek = all.filter(
    (d) => d.first_meeting_date && d.first_meeting_date >= weekStart && d.first_meeting_date <= weekEnd
  ).length;
  const weekEndExclusive = `${weekEnd}T23:59:59`;
  const wonThisWeek = all.filter(
    (d) => d.stage === "won" && d.updated_at && d.updated_at >= weekStart && d.updated_at <= weekEndExclusive
  );
  const weeklyReport: WeeklyReport = {
    weekStart,
    weekEnd,
    yomiCount: yomiSummary.yomiCount,
    expectedRevenueTotal: yomiSummary.expectedRevenueTotal,
    newMeetingsThisWeek,
    wonCountThisWeek: wonThisWeek.length,
    wonAmountThisWeek: wonThisWeek.reduce((sum, d) => sum + (d.amount ?? 0), 0),
  };

  // 月次定例MTGレポート: 今月の新規商談・受注・失注件数と主な失注理由
  const thisMonth = currentMonth();
  const monthlyNewMeetings = all.filter((d) => d.first_meeting_date?.startsWith(thisMonth)).length;
  const monthlyWon = all.filter((d) => d.stage === "won" && d.updated_at?.startsWith(thisMonth));
  const monthlyLostDeals = all.filter((d) => d.stage === "lost" && d.updated_at?.startsWith(thisMonth));
  const monthlyLostReasonCounts: Record<string, number> = {};
  for (const d of monthlyLostDeals) {
    const reason = d.lost_reason?.trim();
    if (!reason) continue;
    monthlyLostReasonCounts[reason] = (monthlyLostReasonCounts[reason] ?? 0) + 1;
  }
  const monthlyReport: MonthlyReport = {
    month: thisMonth,
    newMeetings: monthlyNewMeetings,
    wonCount: monthlyWon.length,
    wonAmount: monthlyWon.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    lostCount: monthlyLostDeals.length,
    topLostReasons: Object.entries(monthlyLostReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };

  // 失注理由の傾向(全期間・自由記述の完全一致で集計。台本/GPTナレッジ改善の参考情報として全期間を対象にする)
  const lostReasonCounts: Record<string, number> = {};
  for (const d of all) {
    if (d.stage !== "lost") continue;
    const reason = d.lost_reason?.trim();
    if (!reason) continue;
    lostReasonCounts[reason] = (lostReasonCounts[reason] ?? 0) + 1;
  }
  const lostReasonBreakdown: LostReasonBreakdownPoint[] = Object.entries(lostReasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

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

  return {
    monthlyTrend,
    stageBreakdown,
    ownerPerformance,
    yomiSummary,
    weeklyReport,
    monthlyReport,
    lostReasonBreakdown,
    availableMonths: months,
  };
}
