"use client";

import { useState, useTransition } from "react";
import { Copy, Check, CalendarClock, CalendarRange, Send } from "lucide-react";
import { WeeklyReport, MonthlyReport } from "@/lib/analytics-data";
import { buildWeeklyReportText, buildMonthlyReportText, formatDateJp } from "@/lib/report-text";
import { sendWeeklyReportEmail } from "@/app/companies/[id]/report-actions";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-secondary btn-sm"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      コピー
    </button>
  );
}

function SendButton({ companyId, disabled }: { companyId: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await sendWeeklyReportEmail(companyId);
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        title={disabled ? "この企業には通知先メールアドレスが設定されていません(企業詳細から設定できます)" : undefined}
        className="btn-secondary btn-sm disabled:opacity-50"
      >
        {sent ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Send className="h-3.5 w-3.5" />}
        {isPending ? "送信中..." : sent ? "送信しました" : "送信"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ReportSummaryPanel({
  weeklyReport,
  monthlyReport,
  companyId,
  companyName,
  hasNotificationEmail,
}: {
  weeklyReport: WeeklyReport;
  monthlyReport: MonthlyReport;
  companyId: string;
  companyName: string;
  hasNotificationEmail: boolean;
}) {
  const weeklyText = buildWeeklyReportText(weeklyReport, companyName);
  const monthlyText = buildMonthlyReportText(monthlyReport, companyName);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4 text-brand-600" />
            週次レポート(金曜報告用)
          </h3>
          <div className="flex items-center gap-2">
            <CopyButton text={weeklyText} />
            <SendButton companyId={companyId} disabled={!hasNotificationEmail} />
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          {formatDateJp(weeklyReport.weekStart)}〜{formatDateJp(weeklyReport.weekEnd)}
        </p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">累計ヨミ件数</dt>
            <dd className="font-medium text-slate-900">{weeklyReport.yomiCount}件</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">累計ヨミ金額</dt>
            <dd className="font-medium text-slate-900">¥{weeklyReport.expectedRevenueTotal.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">今週の新規商談</dt>
            <dd className="font-medium text-slate-900">{weeklyReport.newMeetingsThisWeek}件</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">今週の受注</dt>
            <dd className="font-medium text-slate-900">
              {weeklyReport.wonCountThisWeek}件(¥{weeklyReport.wonAmountThisWeek.toLocaleString()})
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarRange className="h-4 w-4 text-brand-600" />
            月次定例MTGレポート
          </h3>
          <CopyButton text={monthlyText} />
        </div>
        <p className="mb-3 text-xs text-slate-400">{monthlyReport.month}</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">新規商談数</dt>
            <dd className="font-medium text-slate-900">{monthlyReport.newMeetings}件</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">受注</dt>
            <dd className="font-medium text-slate-900">
              {monthlyReport.wonCount}件(¥{monthlyReport.wonAmount.toLocaleString()})
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">失注</dt>
            <dd className="font-medium text-slate-900">{monthlyReport.lostCount}件</dd>
          </div>
        </dl>
        {monthlyReport.topLostReasons.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-1.5 text-xs font-medium text-slate-500">主な失注理由</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {monthlyReport.topLostReasons.map((r) => (
                <li key={r.reason} className="flex justify-between">
                  <span className="truncate pr-2">{r.reason}</span>
                  <span className="shrink-0 text-slate-400">{r.count}件</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
