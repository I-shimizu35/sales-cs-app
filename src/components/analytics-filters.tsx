"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SEGMENT_DIMENSION_LABEL, SegmentDimension } from "@/lib/analytics-data";
import { SUPPORT_PHASE_LABEL } from "@/lib/status";

export function AnalyticsFilters({
  industries,
  owners,
}: {
  industries: string[];
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["groupBy", "industry", "phase", "ownerId", "dateFrom", "dateTo"]) {
      const value = formData.get(key);
      if (typeof value === "string" && value !== "") params.set(key, value);
    }
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="field-label">グループ化(セグメント軸)</label>
        <select name="groupBy" defaultValue={searchParams.get("groupBy") ?? "industry"} className="field w-auto">
          {Object.entries(SEGMENT_DIMENSION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">業種</label>
        <select name="industry" defaultValue={searchParams.get("industry") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">支援フェーズ</label>
        <select name="phase" defaultValue={searchParams.get("phase") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {Object.entries(SUPPORT_PHASE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">案件担当者(社内)</label>
        <select name="ownerId" defaultValue={searchParams.get("ownerId") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">期間(新規商談日・開始)</label>
        <input type="date" name="dateFrom" defaultValue={searchParams.get("dateFrom") ?? ""} className="field w-auto" />
      </div>
      <div>
        <label className="field-label">期間(新規商談日・終了)</label>
        <input type="date" name="dateTo" defaultValue={searchParams.get("dateTo") ?? ""} className="field w-auto" />
      </div>
      <button type="submit" className="btn-primary">
        <Search className="h-4 w-4" />
        絞り込む
      </button>
    </form>
  );
}
