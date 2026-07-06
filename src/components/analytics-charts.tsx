"use client";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealStage } from "@/lib/types";
import { MonthlyTrendPoint, StageBreakdownPoint, OwnerPerformancePoint } from "@/lib/analytics-data";

const PIE_COLORS = ["#94a3b8", "#7a9cff", "#5578f6", "#3a58e0", "#10b981", "#ef4444"];

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">月別推移(直近12ヶ月)</h3>
      <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 520, height: 260 }}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="新規商談数" stroke="#7a9cff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="受注件数" stroke="#3a58e0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StageBreakdownChart({ data }: { data: StageBreakdownPoint[] }) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: DEAL_STAGE_LABEL[d.stage as DealStage], value: d.count }));

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">ステージ別内訳</h3>
      {chartData.length === 0 ? (
        <p className="py-16 text-center text-xs text-slate-400">対象データがありません</p>
      ) : (
        <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 520, height: 260 }}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function OwnerPerformanceChart({ data }: { data: OwnerPerformancePoint[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">担当者別 受注実績</h3>
      {data.length === 0 ? (
        <p className="py-16 text-center text-xs text-slate-400">対象データがありません</p>
      ) : (
        <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 520, height: 260 }}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="ownerName" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
            <Bar dataKey="wonCount" name="受注件数" fill="#3a58e0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
