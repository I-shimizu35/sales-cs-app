import { Suspense } from "react";
import { getAnalyticsData } from "@/lib/analytics-data";
import { PageHeader } from "@/components/page-header";
import { MonthFilter } from "@/components/month-filter";
import { MonthlyTrendChart, StageBreakdownChart, OwnerPerformanceChart } from "@/components/analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const { monthlyTrend, stageBreakdown, ownerPerformance, availableMonths } = await getAnalyticsData({
    month: searchParams.month,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader title="分析" description="全クライアントの案件データを月別・ステージ別・担当者別に分析します。" />
      <Suspense>
        <MonthFilter availableMonths={availableMonths} />
      </Suspense>
      <div className="mb-6">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StageBreakdownChart data={stageBreakdown} />
        <OwnerPerformanceChart data={ownerPerformance} />
      </div>
    </div>
  );
}
