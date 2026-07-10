"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SegmentPoint } from "@/lib/analytics-data";

type Metric = "dealCount" | "wonAmount";

const METRIC_LABEL: Record<Metric, string> = {
  dealCount: "件数",
  wonAmount: "受注金額",
};

export function SegmentBreakdownChart({ segments }: { segments: SegmentPoint[] }) {
  const [metric, setMetric] = useState<Metric>("dealCount");

  const data = segments.map((s) => ({ name: s.segmentLabel, value: metric === "dealCount" ? s.dealCount : s.wonAmount }));
  // 横棒はラベル(セグメント名)が長くなりがちなため、上位10件に絞って読みやすさを優先する
  const chartData = data.slice(0, 10);
  const chartHeight = Math.max(160, chartData.length * 36);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">セグメント別内訳</h3>
        <div className="flex gap-1">
          {(Object.entries(METRIC_LABEL) as [Metric, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMetric(value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                metric === value ? "bg-brand-50 text-brand-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="py-16 text-center text-xs text-slate-400">対象データがありません</p>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight} initialDimension={{ width: 520, height: chartHeight }}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 12, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
              formatter={(value) => (metric === "wonAmount" ? `${Number(value).toLocaleString("ja-JP")}円` : `${value}件`)}
            />
            <Bar dataKey="value" name={METRIC_LABEL[metric]} fill="#3a58e0" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
