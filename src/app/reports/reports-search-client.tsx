"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ReportType } from "@/lib/types";

const TARGET_TYPE_LABEL: Record<string, string> = {
  company: "企業",
  deal: "案件",
  meeting: "商談",
};

export function ReportsSearchClient({
  reportTypeOptions,
}: {
  reportTypeOptions: [ReportType, string][];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["targetType", "reportType", "dateFrom", "dateTo"]) {
      const value = formData.get(key);
      if (typeof value === "string" && value !== "") params.set(key, value);
    }
    // フィルタを変更したら1ページ目に戻す
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="field-label">対象種別</label>
        <select name="targetType" defaultValue={searchParams.get("targetType") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {Object.entries(TARGET_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">レポート種別</label>
        <select name="reportType" defaultValue={searchParams.get("reportType") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {reportTypeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">期間(開始)</label>
        <input type="date" name="dateFrom" defaultValue={searchParams.get("dateFrom") ?? ""} className="field w-auto" />
      </div>
      <div>
        <label className="field-label">期間(終了)</label>
        <input type="date" name="dateTo" defaultValue={searchParams.get("dateTo") ?? ""} className="field w-auto" />
      </div>
      <button type="submit" className="btn-primary">
        <Search className="h-4 w-4" />
        検索
      </button>
    </form>
  );
}
