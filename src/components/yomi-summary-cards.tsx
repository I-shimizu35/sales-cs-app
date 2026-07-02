import { Target, TrendingUp } from "lucide-react";
import { YomiSummary } from "@/lib/analytics-data";

export function YomiSummaryCards({ summary }: { summary: YomiSummary }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-brand-600">
          <Target className="h-4 w-4" />
          <h3 className="text-sm font-medium text-slate-500">ヨミ件数</h3>
        </div>
        <div className="text-3xl font-semibold tracking-tight text-slate-900">
          {summary.yomiCount}
          <span className="ml-1 text-sm font-normal text-slate-500">件</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">受注・失注していない進行中の案件数</p>
      </div>
      <div className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          <h3 className="text-sm font-medium text-slate-500">見込み受注金額</h3>
        </div>
        <div className="text-3xl font-semibold tracking-tight text-slate-900">
          ¥{summary.expectedRevenueTotal.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-slate-400">進行中の案件の見込み売上合計</p>
      </div>
    </div>
  );
}
