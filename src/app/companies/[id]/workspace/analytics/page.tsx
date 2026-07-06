import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { getAnalyticsData } from "@/lib/analytics-data";
import { MonthFilter } from "@/components/month-filter";
import { YomiSummaryCards } from "@/components/yomi-summary-cards";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";
import { ReportSummaryPanel } from "@/components/report-summary-panel";
import { LostReasonBreakdown } from "@/components/lost-reason-breakdown";

export const dynamic = "force-dynamic";

async function getCompanyInfo(companyId: string): Promise<{ name: string; hasNotificationEmail: boolean }> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("companies")
    .select("name, notification_email")
    .eq("id", companyId)
    .maybeSingle();
  return { name: data?.name ?? "(企業名不明)", hasNotificationEmail: !!data?.notification_email };
}

export default async function WorkspaceAnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const [{ monthlyTrend, stageBreakdown, yomiSummary, weeklyReport, monthlyReport, lostReasonBreakdown, availableMonths }, companyInfo] =
    await Promise.all([
      getAnalyticsData({ companyId: params.id, month: searchParams.month }),
      getCompanyInfo(params.id),
    ]);

  return (
    <div>
      <div className="print:hidden">
        <Suspense>
          <MonthFilter availableMonths={availableMonths} />
        </Suspense>
        <YomiSummaryCards summary={yomiSummary} />
      </div>
      <ReportSummaryPanel
        weeklyReport={weeklyReport}
        monthlyReport={monthlyReport}
        companyId={params.id}
        companyName={companyInfo.name}
        hasNotificationEmail={companyInfo.hasNotificationEmail}
      />
      <div className="mb-6 print:hidden">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <div className="mb-6 print:hidden">
        <StageBreakdownChart data={stageBreakdown} />
      </div>
      <div className="print:hidden">
        <LostReasonBreakdown data={lostReasonBreakdown} />
      </div>
    </div>
  );
}
