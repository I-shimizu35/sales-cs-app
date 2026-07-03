"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { DEAL_CSV_COLUMNS } from "@/lib/deal-csv-columns";
import { bulkImportDeals } from "@/app/companies/[id]/deal-actions";

/**
 * 案件管理表のCSVダウンロードと同じ列形式のCSVを一括取り込みする。
 * 既にExcel等で案件を管理しているクライアントを新規に支援開始する際、
 * 手入力し直さずに済むようにするための機能。新規追加のみ(既存案件の上書きはしない)。
 */
export function DealsCsvImport({ companyId }: { companyId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const table = parseCsv(text);
      if (table.length < 2) {
        setError("データ行が見つかりませんでした。");
        return;
      }
      const [header, ...dataRows] = table;
      const indexByKey: Record<string, number> = {};
      for (const { key, label } of DEAL_CSV_COLUMNS) {
        const idx = header.indexOf(label);
        if (idx !== -1) indexByKey[key] = idx;
      }
      if (indexByKey.title === undefined) {
        setError(
          "「案件名」列が見つかりませんでした。案件管理表の「CSVダウンロード」でダウンロードしたCSVと同じ形式でアップロードしてください。"
        );
        return;
      }
      const rows = dataRows.map((cols) => {
        const row: Record<string, string> = {};
        for (const [key, idx] of Object.entries(indexByKey)) {
          row[key] = cols[idx] ?? "";
        }
        return row;
      });
      startTransition(async () => {
        try {
          const res = await bulkImportDeals(companyId, rows);
          setResult(res);
        } catch (err) {
          setError((err as Error).message);
        }
      });
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">CSVから一括登録</p>
          <p className="text-xs text-slate-400">
            案件管理表の「CSVダウンロード」と同じ列形式のCSVを取り込めます(新規追加のみ。既存案件は上書きしません)。
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="btn-secondary btn-sm ml-auto shrink-0 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {isPending ? "取り込み中..." : "CSVを選択"}
        </button>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>
      {result && (
        <p className="mt-2 text-xs text-emerald-700">
          {result.imported}件を登録しました{result.skipped > 0 ? `(案件名が空の${result.skipped}行はスキップしました)` : ""}。
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
