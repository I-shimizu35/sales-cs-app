import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { getAnalyticsData } from "@/lib/analytics-data";
import { MonthFilter } from "@/components/month-filter";
import { YomiSummaryCards } from "@/components/yomi-summary-cards";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";
import { ReportSummaryPanel } from "@/components/report-summary-panel";
import { LostReasonBreakdown } from "@/components/lost-reason-breakdown";

export const dynamic = "force-dynamic";

async function getCompanyName(companyId: string): Promise<string> {
  const supabase = createServerClient();
  const { data } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
  return data?.name ?? "(企業名不明)";
}

export default async function WorkspaceAnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const [{ monthlyTrend, stageBreakdown, yomiSummary, weeklyReport, monthlyReport, lostReasonBreakdown, availableMonths }, companyName] =
    await Promise.all([
      getAnalyticsData({ companyId: params.id, month: searchParams.month }),
      getCompanyName(params.id),
    ]);

  return (
    <div>
      <Suspense>
        <MonthFilter availableMonths={availableMonths} />
      </Suspense>
      <YomiSummaryCards summary={yomiSummary} />
      <ReportSummaryPanel weeklyReport={weeklyReport} monthlyReport={monthlyReport} companyName={companyName} />
      <div className="mb-6">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <div className="mb-6">
        <StageBreakdownChart data={stageBreakdown} />
      </div>
      <LostReasonBreakdown data={lostReasonBreakdown} />
    </div>
  );
}
