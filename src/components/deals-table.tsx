"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ExternalLink, Save, Check, Trash2, Download, Columns3, Search, Paperclip, Copy, Table2, LayoutGrid, UserPlus, X, Loader2 } from "lucide-react";
import { updateDealFields, deleteDeal, duplicateDeal, uploadDealAttachment } from "@/app/companies/[id]/deal-actions";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealStage } from "@/lib/types";
import { DealsKanbanBoard } from "./deals-kanban-board";
import { DealsMobileList } from "./deals-mobile-list";

export interface DealsTableRow {
  id: string;
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  title: string;
  stage: DealStage;
  deal_category: string | null;
  contact_name: string | null;
  contact_title: string | null;
  lead_source: string | null;
  amount: number | null;
  win_probability: number | null;
  expected_revenue: number | null;
  first_meeting_date: string | null;
  proposal_meeting_date: string | null;
  forecast_meeting_date: string | null;
  expected_close_date: string | null;
  last_contact_date: string | null;
  next_meeting_at: string | null;
  next_action_date: string | null;
  next_action_title: string | null;
  customer_issues: string | null;
  proposal_content: string | null;
  bant_budget: string | null;
  bant_authority: string | null;
  bant_need: string | null;
  bant_timeline: string | null;
  concerns: string | null;
  lost_reason: string | null;
  follow_up_policy: string | null;
  minutes_doc_url: string | null;
  first_meeting_video_url: string | null;
  second_meeting_video_url: string | null;
  proposal_doc_url: string | null;
  quote_doc_url: string | null;
  meeting_feedback: string | null;
  roleplay_conducted_at: string | null;
}

/** チェックボックスで表示/非表示を切り替えられる列。案件名・ステータス・商談FBは常時表示。 */
const OPTIONAL_COLUMNS: { key: string; label: string }[] = [
  { key: "deal_category", label: "案件区分" },
  { key: "contact_name", label: "担当者名" },
  { key: "contact_title", label: "役職" },
  { key: "lead_source", label: "流入経路" },
  { key: "amount", label: "見積もり金額" },
  { key: "win_probability", label: "確度(%)" },
  { key: "expected_revenue", label: "見込み売上" },
  { key: "first_meeting_date", label: "新規商談日" },
  { key: "proposal_meeting_date", label: "提案商談日" },
  { key: "forecast_meeting_date", label: "ヨミ商談日" },
  { key: "expected_close_date", label: "受注予定日" },
  { key: "last_contact_date", label: "最終接触日" },
  { key: "next_action_date", label: "次回アクション日" },
  { key: "next_meeting_at", label: "次回商談時間" },
  { key: "elapsed_days", label: "経過日数" },
  { key: "next_action_title", label: "次回アクション内容" },
  { key: "customer_issues", label: "顧客(先方)課題" },
  { key: "proposal_content", label: "提案内容" },
  { key: "bant_budget", label: "B:予算" },
  { key: "bant_authority", label: "A:決裁者" },
  { key: "bant_need", label: "N:必要性" },
  { key: "bant_timeline", label: "T:時期" },
  { key: "concerns", label: "懸念点" },
  { key: "lost_reason", label: "失注理由" },
  { key: "follow_up_policy", label: "フォロー方針" },
  { key: "roleplay_conducted_at", label: "ロープレ実施日" },
  { key: "minutes_doc_url", label: "商談議事録" },
  { key: "first_meeting_video_url", label: "一次商談動画" },
  { key: "second_meeting_video_url", label: "二次商談動画" },
  { key: "proposal_doc_url", label: "提案書" },
  { key: "quote_doc_url", label: "見積もり" },
];
const COLUMN_STORAGE_KEY = "deals-table-hidden-columns";
const VIEW_MODE_STORAGE_KEY = "deals-table-view-mode";
// Server Action完了後、Next.jsが自動でこのページを再取得(revalidatePath)する際に
// DealsTableが再マウントされ通知用のuseStateが失われることがあるため、
// sessionStorageを経由して再マウント後も通知を表示できるようにする。
const LEAD_CREATED_NOTICE_KEY = "deals-table-lead-created-notice";

function elapsedDaysLabel(lastContactDate: string | null): string {
  if (!lastContactDate) return "-";
  const diffMs = Date.now() - new Date(lastContactDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return "-";
  return `${days}日`;
}

function cellTextValue(row: DealsTableRow, key: string): string {
  if (key === "elapsed_days") return elapsedDaysLabel(row.last_contact_date);
  const value = (row as unknown as Record<string, unknown>)[key];
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Excel/Googleスプレッドシートの数式インジェクション対策(CWE-1236)。
 * =, +, -, @, タブ, 改行始まりのセルは先頭にシングルクォートを付与し、
 * 開いた際に数式として実行されないようにする。
 */
function sanitizeForSpreadsheet(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvEscape(rawValue: string): string {
  const value = sanitizeForSpreadsheet(rawValue);
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  // ExcelでUTF-8を文字化けさせずに開けるようBOMを付与
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-100 px-2 py-1.5 align-top">{children}</td>;
}

function TextInput({ formId, name, defaultValue, disabled, wide }: { formId: string; name: string; defaultValue: string | null; disabled: boolean; wide?: boolean }) {
  return (
    <input
      type="text"
      form={formId}
      name={name}
      defaultValue={defaultValue ?? ""}
      disabled={disabled}
      className={`field-sm ${wide ? "w-48" : "w-32"} disabled:bg-slate-50 disabled:text-slate-400`}
    />
  );
}

function NumberInput({ formId, name, defaultValue }: { formId: string; name: string; defaultValue: number | null }) {
  return <input type="number" form={formId} name={name} defaultValue={defaultValue ?? ""} className="field-sm w-24" />;
}

function DateInput({ formId, name, defaultValue }: { formId: string; name: string; defaultValue: string | null }) {
  return <input type="date" form={formId} name={name} defaultValue={defaultValue ?? ""} className="field-sm w-36" />;
}

function DatetimeInput({ formId, name, defaultValue }: { formId: string; name: string; defaultValue: string | null }) {
  return (
    <input
      type="datetime-local"
      form={formId}
      name={name}
      defaultValue={defaultValue ? defaultValue.slice(0, 16) : ""}
      className="field-sm w-44"
    />
  );
}

function UrlInput({
  formId,
  name,
  defaultValue,
  dealId,
  allowUpload,
}: {
  formId: string;
  name: string;
  defaultValue: string | null;
  dealId?: string;
  allowUpload?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !dealId) return;
    const formData = new FormData();
    formData.set("file", file);
    startUploadTransition(async () => {
      const result = await uploadDealAttachment(dealId, name as Parameters<typeof uploadDealAttachment>[1], formData);
      if ("error" in result) {
        window.alert(result.error);
      } else {
        setValue(result.url);
      }
    });
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        form={formId}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="URL"
        className="field-sm w-28"
      />
      {value && (
        <a href={value} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600" title="開く">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {allowUpload && dealId && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-slate-400 hover:text-brand-600 disabled:opacity-50"
            title="ファイルをアップロード"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}

function SaveButton({ formId, onLeadCreated }: { formId: string; onLeadCreated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await updateDealFields(form.dataset.dealId as string, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (result.leadCreated) onLeadCreated();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn-secondary btn-sm shrink-0 disabled:opacity-50"
      title="この行の変更を保存"
    >
      {saved ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
      更新
    </button>
  );
}

function DuplicateButton({ dealId }: { dealId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await duplicateDeal(dealId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-slate-400 hover:text-brand-600 disabled:opacity-50"
      title={isPending ? "複製中..." : "この案件を複製(構造項目のみ引き継いだ新規案件を作成)"}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ColumnVisibilityMenu({ hidden, onToggle }: { hidden: Set<string>; onToggle: (key: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary btn-sm">
        <Columns3 className="h-3.5 w-3.5" />
        表示列
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {OPTIONAL_COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center gap-2 rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={!hidden.has(col.key)} onChange={() => onToggle(col.key)} />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DealsTable({
  rows,
  showCompanyColumn,
  isClient,
}: {
  rows: DealsTableRow[];
  showCompanyColumn: boolean;
  isClient: boolean;
}) {
  const searchParams = useSearchParams();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  // ダッシュボードのサマリーカードからのドリルダウン用に、URLの?stage=をそのまま初期値として使う
  const [stageFilter, setStageFilter] = useState(() => searchParams.get("stage") ?? "");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showLeadCreatedBanner, setShowLeadCreatedBanner] = useState(false);

  function handleLeadCreated() {
    sessionStorage.setItem(LEAD_CREATED_NOTICE_KEY, "1");
    setShowLeadCreatedBanner(true);
  }

  function dismissLeadCreatedBanner() {
    sessionStorage.removeItem(LEAD_CREATED_NOTICE_KEY);
    setShowLeadCreatedBanner(false);
  }

  useEffect(() => {
    // Server Action完了直後の自動再取得でこのコンポーネントが再マウントされても、
    // sessionStorageに通知フラグが残っていれば表示し続ける
    if (sessionStorage.getItem(LEAD_CREATED_NOTICE_KEY) === "1") {
      setShowLeadCreatedBanner(true);
    }
  }, []);

  useEffect(() => {
    const storedView = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (storedView === "kanban" || storedView === "table") setViewMode(storedView);
  }, []);

  function handleViewModeChange(mode: "table" | "kanban") {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

  useEffect(() => {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (stored) {
      try {
        setHidden(new Set(JSON.parse(stored) as string[]));
      } catch {
        // 破損データは無視してデフォルト(全列表示)のまま
      }
    }
  }, []);

  function toggleColumn(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (stageFilter && row.stage !== stageFilter) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        const haystack = [row.title, row.deal_category, row.contact_name, row.customer_issues, row.companyName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [rows, keyword, stageFilter]);

  function handleExportCsv() {
    const columns = [
      { key: "title", label: "案件名" },
      { key: "stage", label: "案件ステータス" },
      ...(showCompanyColumn ? [{ key: "companyName", label: "企業名" }] : []),
      ...OPTIONAL_COLUMNS,
    ];
    const header = columns.map((c) => c.label);
    const body = filteredRows.map((row) =>
      columns.map((c) => (c.key === "stage" ? DEAL_STAGE_LABEL[row.stage] : cellTextValue(row, c.key)))
    );
    downloadCsv(`deals_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  function handleDeleteSubmit(e: React.FormEvent<HTMLFormElement>, title: string) {
    if (!window.confirm(`案件「${title}」を削除します。この操作は取り消せません。よろしいですか?`)) {
      e.preventDefault();
    }
  }

  const leadsHref = isClient ? "/client/leads" : `/companies/${rows[0]?.companyId}/workspace/leads`;

  return (
    <div>
      {showLeadCreatedBanner && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>案件を失注にしたため、リードとして自動登録しました。</span>
            <Link href={leadsHref} className="font-medium underline hover:no-underline">
              リード一覧を見る
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowLeadCreatedBanner(false)}
            className="shrink-0 text-brand-400 hover:text-brand-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="案件名・担当者名・課題で検索"
            className="field-sm w-64 pl-8"
          />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="field-sm w-auto">
          <option value="">すべてのステータス</option>
          {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{filteredRows.length}件 / 全{rows.length}件</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 md:flex">
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              title="テーブル表示"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${
                viewMode === "table" ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("kanban")}
              title="カンバン表示(ドラッグ&ドロップでステータス変更)"
              className={`flex items-center gap-1 border-l border-slate-200 px-2.5 py-1.5 text-xs font-medium ${
                viewMode === "kanban" ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <button type="button" onClick={handleExportCsv} className="btn-secondary btn-sm">
            <Download className="h-3.5 w-3.5" />
            CSVダウンロード
          </button>
          <div className="hidden md:block">
            <ColumnVisibilityMenu hidden={hidden} onToggle={toggleColumn} />
          </div>
        </div>
      </div>

      <DealsMobileList rows={filteredRows} showCompanyColumn={showCompanyColumn} onLeadCreated={handleLeadCreated} />

      <div className="hidden md:block">
      {viewMode === "kanban" ? (
        <DealsKanbanBoard rows={filteredRows} showCompanyColumn={showCompanyColumn} onLeadCreated={handleLeadCreated} />
      ) : (
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
            <tr>
              <th className="px-2 py-2 font-medium"></th>
              <th className="px-2 py-2 font-medium">No</th>
              <th className="px-2 py-2 font-medium">案件名</th>
              {!hidden.has("deal_category") && <th className="px-2 py-2 font-medium">案件区分</th>}
              {showCompanyColumn && <th className="px-2 py-2 font-medium">企業名</th>}
              {showCompanyColumn && <th className="px-2 py-2 font-medium">業種</th>}
              {!hidden.has("contact_name") && <th className="px-2 py-2 font-medium">担当者名</th>}
              {!hidden.has("contact_title") && <th className="px-2 py-2 font-medium">役職</th>}
              {!hidden.has("lead_source") && <th className="px-2 py-2 font-medium">流入経路</th>}
              <th className="px-2 py-2 font-medium">案件ステータス</th>
              {!hidden.has("amount") && <th className="px-2 py-2 font-medium">見積もり金額</th>}
              {!hidden.has("win_probability") && <th className="px-2 py-2 font-medium">確度(%)</th>}
              {!hidden.has("expected_revenue") && <th className="px-2 py-2 font-medium">見込み売上</th>}
              {!hidden.has("first_meeting_date") && <th className="px-2 py-2 font-medium">新規商談日</th>}
              {!hidden.has("proposal_meeting_date") && <th className="px-2 py-2 font-medium">提案商談日</th>}
              {!hidden.has("forecast_meeting_date") && <th className="px-2 py-2 font-medium">ヨミ商談日</th>}
              {!hidden.has("expected_close_date") && <th className="px-2 py-2 font-medium">受注予定日</th>}
              {!hidden.has("last_contact_date") && <th className="px-2 py-2 font-medium">最終接触日</th>}
              {!hidden.has("next_action_date") && <th className="px-2 py-2 font-medium">次回アクション日</th>}
              {!hidden.has("next_meeting_at") && <th className="px-2 py-2 font-medium">次回商談時間</th>}
              {!hidden.has("elapsed_days") && <th className="px-2 py-2 font-medium">経過日数</th>}
              {!hidden.has("next_action_title") && <th className="px-2 py-2 font-medium">次回アクション内容</th>}
              {!hidden.has("customer_issues") && <th className="px-2 py-2 font-medium">顧客(先方)課題</th>}
              {!hidden.has("proposal_content") && <th className="px-2 py-2 font-medium">提案内容</th>}
              {!hidden.has("bant_budget") && <th className="px-2 py-2 font-medium">B:予算</th>}
              {!hidden.has("bant_authority") && <th className="px-2 py-2 font-medium">A:決裁者</th>}
              {!hidden.has("bant_need") && <th className="px-2 py-2 font-medium">N:必要性</th>}
              {!hidden.has("bant_timeline") && <th className="px-2 py-2 font-medium">T:時期</th>}
              {!hidden.has("concerns") && <th className="px-2 py-2 font-medium">懸念点</th>}
              {!hidden.has("lost_reason") && <th className="px-2 py-2 font-medium">失注理由</th>}
              {!hidden.has("follow_up_policy") && <th className="px-2 py-2 font-medium">フォロー方針</th>}
              {!hidden.has("roleplay_conducted_at") && <th className="px-2 py-2 font-medium">ロープレ実施日</th>}
              {!hidden.has("minutes_doc_url") && <th className="px-2 py-2 font-medium">商談議事録</th>}
              {!hidden.has("first_meeting_video_url") && <th className="px-2 py-2 font-medium">一次商談動画</th>}
              {!hidden.has("second_meeting_video_url") && <th className="px-2 py-2 font-medium">二次商談動画</th>}
              {!hidden.has("proposal_doc_url") && <th className="px-2 py-2 font-medium">提案書</th>}
              {!hidden.has("quote_doc_url") && <th className="px-2 py-2 font-medium">見積もり</th>}
              <th className="px-2 py-2 font-medium">商談FB</th>
              <th className="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const formId = `deal-form-${row.id}`;
              return (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <Cell>
                    <form id={formId} data-deal-id={row.id} className="hidden" />
                    <SaveButton formId={formId} onLeadCreated={handleLeadCreated} />
                  </Cell>
                  <Cell>{i + 1}</Cell>
                  <Cell>
                    <TextInput formId={formId} name="title" defaultValue={row.title} disabled={false} wide />
                  </Cell>
                  {!hidden.has("deal_category") && (
                    <Cell>
                      <TextInput formId={formId} name="deal_category" defaultValue={row.deal_category} disabled={false} />
                    </Cell>
                  )}
                  {showCompanyColumn && (
                    <Cell>
                      <Link href={`/companies/${row.companyId}`} className="text-brand-600 hover:underline">
                        {row.companyName}
                      </Link>
                    </Cell>
                  )}
                  {showCompanyColumn && <Cell>{row.companyIndustry ?? "-"}</Cell>}
                  {!hidden.has("contact_name") && (
                    <Cell>
                      <TextInput formId={formId} name="contact_name" defaultValue={row.contact_name} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("contact_title") && (
                    <Cell>
                      <TextInput formId={formId} name="contact_title" defaultValue={row.contact_title} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("lead_source") && (
                    <Cell>
                      <TextInput formId={formId} name="lead_source" defaultValue={row.lead_source} disabled={false} />
                    </Cell>
                  )}
                  <Cell>
                    <select form={formId} name="stage" defaultValue={row.stage} className="field-sm w-28">
                      {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Cell>
                  {!hidden.has("amount") && (
                    <Cell>
                      <NumberInput formId={formId} name="amount" defaultValue={row.amount} />
                    </Cell>
                  )}
                  {!hidden.has("win_probability") && (
                    <Cell>
                      <NumberInput formId={formId} name="win_probability" defaultValue={row.win_probability} />
                    </Cell>
                  )}
                  {!hidden.has("expected_revenue") && (
                    <Cell>
                      <NumberInput formId={formId} name="expected_revenue" defaultValue={row.expected_revenue} />
                    </Cell>
                  )}
                  {!hidden.has("first_meeting_date") && (
                    <Cell>
                      <DateInput formId={formId} name="first_meeting_date" defaultValue={row.first_meeting_date} />
                    </Cell>
                  )}
                  {!hidden.has("proposal_meeting_date") && (
                    <Cell>
                      <DateInput formId={formId} name="proposal_meeting_date" defaultValue={row.proposal_meeting_date} />
                    </Cell>
                  )}
                  {!hidden.has("forecast_meeting_date") && (
                    <Cell>
                      <DateInput formId={formId} name="forecast_meeting_date" defaultValue={row.forecast_meeting_date} />
                    </Cell>
                  )}
                  {!hidden.has("expected_close_date") && (
                    <Cell>
                      <DateInput formId={formId} name="expected_close_date" defaultValue={row.expected_close_date} />
                    </Cell>
                  )}
                  {!hidden.has("last_contact_date") && (
                    <Cell>
                      <DateInput formId={formId} name="last_contact_date" defaultValue={row.last_contact_date} />
                    </Cell>
                  )}
                  {!hidden.has("next_action_date") && (
                    <Cell>
                      <span className="text-slate-500">{row.next_action_date ?? "-"}</span>
                    </Cell>
                  )}
                  {!hidden.has("next_meeting_at") && (
                    <Cell>
                      <DatetimeInput formId={formId} name="next_meeting_at" defaultValue={row.next_meeting_at} />
                    </Cell>
                  )}
                  {!hidden.has("elapsed_days") && (
                    <Cell>
                      <span className="text-slate-500">{elapsedDaysLabel(row.last_contact_date)}</span>
                    </Cell>
                  )}
                  {!hidden.has("next_action_title") && (
                    <Cell>
                      <span className="text-slate-500">{row.next_action_title ?? "-"}</span>
                    </Cell>
                  )}
                  {!hidden.has("customer_issues") && (
                    <Cell>
                      <TextInput formId={formId} name="customer_issues" defaultValue={row.customer_issues} disabled={false} wide />
                    </Cell>
                  )}
                  {!hidden.has("proposal_content") && (
                    <Cell>
                      <TextInput formId={formId} name="proposal_content" defaultValue={row.proposal_content} disabled={false} wide />
                    </Cell>
                  )}
                  {!hidden.has("bant_budget") && (
                    <Cell>
                      <TextInput formId={formId} name="bant_budget" defaultValue={row.bant_budget} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("bant_authority") && (
                    <Cell>
                      <TextInput formId={formId} name="bant_authority" defaultValue={row.bant_authority} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("bant_need") && (
                    <Cell>
                      <TextInput formId={formId} name="bant_need" defaultValue={row.bant_need} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("bant_timeline") && (
                    <Cell>
                      <TextInput formId={formId} name="bant_timeline" defaultValue={row.bant_timeline} disabled={false} />
                    </Cell>
                  )}
                  {!hidden.has("concerns") && (
                    <Cell>
                      <TextInput formId={formId} name="concerns" defaultValue={row.concerns} disabled={false} wide />
                    </Cell>
                  )}
                  {!hidden.has("lost_reason") && (
                    <Cell>
                      <TextInput formId={formId} name="lost_reason" defaultValue={row.lost_reason} disabled={false} wide />
                    </Cell>
                  )}
                  {!hidden.has("follow_up_policy") && (
                    <Cell>
                      <TextInput formId={formId} name="follow_up_policy" defaultValue={row.follow_up_policy} disabled={false} wide />
                    </Cell>
                  )}
                  {!hidden.has("roleplay_conducted_at") && (
                    <Cell>
                      <DateInput formId={formId} name="roleplay_conducted_at" defaultValue={row.roleplay_conducted_at} />
                    </Cell>
                  )}
                  {!hidden.has("minutes_doc_url") && (
                    <Cell>
                      <UrlInput formId={formId} name="minutes_doc_url" defaultValue={row.minutes_doc_url} dealId={row.id} allowUpload />
                    </Cell>
                  )}
                  {!hidden.has("first_meeting_video_url") && (
                    <Cell>
                      <UrlInput formId={formId} name="first_meeting_video_url" defaultValue={row.first_meeting_video_url} />
                    </Cell>
                  )}
                  {!hidden.has("second_meeting_video_url") && (
                    <Cell>
                      <UrlInput formId={formId} name="second_meeting_video_url" defaultValue={row.second_meeting_video_url} />
                    </Cell>
                  )}
                  {!hidden.has("proposal_doc_url") && (
                    <Cell>
                      <UrlInput formId={formId} name="proposal_doc_url" defaultValue={row.proposal_doc_url} dealId={row.id} allowUpload />
                    </Cell>
                  )}
                  {!hidden.has("quote_doc_url") && (
                    <Cell>
                      <UrlInput formId={formId} name="quote_doc_url" defaultValue={row.quote_doc_url} dealId={row.id} allowUpload />
                    </Cell>
                  )}
                  <Cell>
                    <TextInput
                      formId={formId}
                      name="meeting_feedback"
                      defaultValue={row.meeting_feedback}
                      disabled={isClient}
                      wide
                    />
                  </Cell>
                  <Cell>
                    <div className="flex items-center gap-2">
                      <DuplicateButton dealId={row.id} />
                      <form action={deleteDeal.bind(null, row.id)} onSubmit={(e) => handleDeleteSubmit(e, row.title)}>
                        <button type="submit" className="text-slate-400 hover:text-red-600" title="この案件を削除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      </div>
    </div>
  );
}
