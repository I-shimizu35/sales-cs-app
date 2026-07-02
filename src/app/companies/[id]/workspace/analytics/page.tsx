import { Suspense } from "react";
import { getAnalyticsData } from "@/lib/analytics-data";
import { MonthFilter } from "@/components/month-filter";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";

export const dynamic = "force-dynamic";

export default async function WorkspaceAnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const { monthlyTrend, stageBreakdown, availableMonths } = await getAnalyticsData({
    companyId: params.id,
    month: searchParams.month,
  });

  return (
    <div>
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
