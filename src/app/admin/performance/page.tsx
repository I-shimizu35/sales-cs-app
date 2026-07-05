import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { getAnalyticsData } from "@/lib/analytics-data";
import { MonthFilter } from "@/components/month-filter";
import { MonthlyTrendChart, StageBreakdownChart } from "@/components/analytics-charts";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const { monthlyTrend, stageBreakdown, ownerPerformance, availableMonths } = await getAnalyticsData({
    month: searchParams.month,
  });

  const ranked = [...ownerPerformance].sort((a, b) => b.wonAmount - a.wonAmount);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        全クライアント横断で、担当者別の受注実績とパイプライン状況を確認できます(管理者・マネージャー限定)。
      </p>

      <Suspense>
        <MonthFilter availableMonths={availableMonths} />
      </Suspense>

      <div className="mb-6">
        <MonthlyTrendChart data={monthlyTrend} />
      </div>
      <div className="mb-6">
        <StageBreakdownChart data={stageBreakdown} />
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Trophy className="h-4 w-4 text-amber-500" />
          担当者別受注実績
        </h3>
        {ranked.length === 0 ? (
          <EmptyState icon={Trophy} title="対象期間の受注データがありません" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">順位</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">担当者</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">受注件数</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">受注金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranked.map((row, i) => (
                  <tr key={row.ownerName} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.ownerName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.wonCount}件</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">¥{row.wonAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
