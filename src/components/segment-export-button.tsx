"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv-export";
import { SegmentPoint } from "@/lib/analytics-data";

export function SegmentExportButton({
  segments,
  dimensionLabel,
}: {
  segments: SegmentPoint[];
  dimensionLabel: string;
}) {
  function handleExport() {
    const header = [dimensionLabel, "件数", "受注件数", "受注金額", "見込み金額", "受注率(%)"];
    const body = segments.map((s) => [
      s.segmentLabel,
      String(s.dealCount),
      String(s.wonCount),
      String(s.wonAmount),
      String(s.openExpectedRevenue),
      (s.winRate * 100).toFixed(1),
    ]);
    downloadCsv(`analytics_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  return (
    <button type="button" onClick={handleExport} className="btn-secondary btn-sm">
      <Download className="h-3.5 w-3.5" />
      CSVエクスポート
    </button>
  );
}
