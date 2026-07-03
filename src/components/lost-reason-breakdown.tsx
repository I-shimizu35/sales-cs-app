import { AlertTriangle } from "lucide-react";
import { LostReasonBreakdownPoint } from "@/lib/analytics-data";

export function LostReasonBreakdown({ data }: { data: LostReasonBreakdownPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        失注理由の傾向(全期間・上位10件)
      </h3>
      <p className="mb-4 text-xs text-slate-400">台本・営業用GPTナレッジの改善にご活用ください。</p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">失注理由が入力された案件がまだありません</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.reason}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate pr-2 text-slate-700">{d.reason}</span>
                <span className="shrink-0 font-medium text-slate-500">{d.count}件</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-amber-400"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
