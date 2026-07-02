import { Suspense } from "react";
import { getCurrentClient } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics-data";
import { PageHeader } from "@/components/page-header";
import { MonthFilter } from "@/components/month-filter";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";

export const dynamic = "force-dynamic";

export default async function ClientAnalyticsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const client = await getCurrentClient();
  if (!client) return null;

  const { monthlyTrend, stageBreakdown, availableMonths } = await getAnalyticsData({
    companyId: client.companyId,
    month: searchParams.month,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader title="分析" description="自社の案件データを月別・ステージ別に分析します。" />
      <Suspense>
        <MonthFilter availableMonths={availableMonths} />
      </Suspense>
      <div className="mb-6">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <StageBreakdownChart data={stageBreakdown} />
    </div>
  );
}
