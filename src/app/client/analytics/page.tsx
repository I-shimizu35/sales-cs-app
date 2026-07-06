import { Suspense } from "react";
import { getCurrentClient } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics-data";
import { createServerClient } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { MonthFilter } from "@/components/month-filter";
import { YomiSummaryCards } from "@/components/yomi-summary-cards";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";
import { ReportSummaryPanel } from "@/components/report-summary-panel";

export const dynamic = "force-dynamic";

async function getCompanyName(companyId: string): Promise<string> {
  const supabase = createServerClient();
  const { data } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
  return data?.name ?? "(企業名不明)";
}

export default async function ClientAnalyticsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const client = await getCurrentClient();
  if (!client) return null;

  const [{ monthlyTrend, stageBreakdown, yomiSummary, weeklyReport, monthlyReport, availableMonths }, companyName] =
    await Promise.all([
      getAnalyticsData({ companyId: client.companyId, month: searchParams.month }),
      getCompanyName(client.companyId),
    ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <div className="print:hidden">
        <PageHeader title="分析" description="自社の案件データを月別・ステージ別に分析します。" />
        <Suspense>
          <MonthFilter availableMonths={availableMonths} />
        </Suspense>
        <YomiSummaryCards summary={yomiSummary} />
      </div>
      <ReportSummaryPanel
        weeklyReport={weeklyReport}
        monthlyReport={monthlyReport}
        companyId={client.companyId}
        companyName={companyName}
        hasNotificationEmail={false}
        hideSendButton
      />
      <div className="mb-6 print:hidden">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <div className="print:hidden">
        <StageBreakdownChart data={stageBreakdown} />
      </div>
    </div>
  );
}
