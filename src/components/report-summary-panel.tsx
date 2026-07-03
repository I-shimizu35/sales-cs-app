"use client";

import { useState } from "react";
import { Copy, Check, CalendarClock, CalendarRange } from "lucide-react";
import { WeeklyReport, MonthlyReport } from "@/lib/analytics-data";

function formatDateJp(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}

function buildWeeklyReportText(report: WeeklyReport, companyName: string): string {
  return [
    `【${companyName}様 週次ご報告】`,
    `対象期間: ${formatDateJp(report.weekStart)}〜${formatDateJp(report.weekEnd)}`,
    "",
    `累計ヨミ件数: ${report.yomiCount}件`,
    `累計ヨミ金額: ¥${report.expectedRevenueTotal.toLocaleString()}`,
    "",
    `今週の新規商談数: ${report.newMeetingsThisWeek}件`,
    `今週の受注: ${report.wonCountThisWeek}件(¥${report.wonAmountThisWeek.toLocaleString()})`,
  ].join("\n");
}

function buildMonthlyReportText(report: MonthlyReport, companyName: string): string {
  const lines = [
    `【${companyName}様 月次定例MTG報告】`,
    `対象月: ${report.month}`,
    "",
    `新規商談数: ${report.newMeetings}件`,
    `受注: ${report.wonCount}件(¥${report.wonAmount.toLocaleString()})`,
    `失注: ${report.lostCount}件`,
  ];
  if (report.topLostReasons.length > 0) {
    lines.push("", "主な失注理由:");
    for (const r of report.topLostReasons) {
      lines.push(`・${r.reason}(${r.count}件)`);
    }
  }
  return lines.join("\n");
}

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

export function ReportSummaryPanel({
  weeklyReport,
  monthlyReport,
  companyName,
}: {
  weeklyReport: WeeklyReport;
  monthlyReport: MonthlyReport;
  companyName: string;
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
          <CopyButton text={weeklyText} />
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
