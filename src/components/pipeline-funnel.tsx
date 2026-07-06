"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealStage } from "@/lib/types";

const STAGE_ORDER: DealStage[] = ["first_contact", "hearing", "proposal", "closing", "won", "lost"];

export function PipelineFunnel({ deals }: { deals: { stage: DealStage; amount: number | null }[] }) {
  const data = STAGE_ORDER.map((stage) => ({
    stage: DEAL_STAGE_LABEL[stage],
    件数: deals.filter((d) => d.stage === stage).length,
  }));

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">ステージ別パイプライン</h3>
      <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 520, height: 220 }}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
          <Bar dataKey="件数" fill="#3a58e0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
