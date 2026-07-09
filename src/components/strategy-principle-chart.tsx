"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PrincipleScores } from "@/lib/types";

const PRINCIPLE_ORDER = ["関心", "興味", "連想", "欲望", "比較", "信念", "決意"] as const;

export function StrategyPrincipleChart({ scores }: { scores: PrincipleScores | null }) {
  if (!scores) {
    return (
      <div className="card p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">購買心理7原則スコア</h3>
        <p className="py-8 text-center text-xs text-slate-400">
          まだスコアが算出されていません。企業情報・商談戦略の入力後に算出してください。
        </p>
      </div>
    );
  }

  const data = PRINCIPLE_ORDER.map((name) => ({ name, score: scores[name] ?? 0 }));

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">購買心理7原則スコア</h3>
      <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 520, height: 260 }}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={48}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
          <Bar dataKey="score" name="スコア" fill="#3a58e0" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
