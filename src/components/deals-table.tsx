"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Save, Check } from "lucide-react";
import { updateDealFields } from "@/app/companies/[id]/deal-actions";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealStage } from "@/lib/types";

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
}

function elapsedDaysLabel(lastContactDate: string | null): string {
  if (!lastContactDate) return "-";
  const diffMs = Date.now() - new Date(lastContactDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return "-";
  return `${days}日`;
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

function UrlInput({ formId, name, defaultValue }: { formId: string; name: string; defaultValue: string | null }) {
  return (
    <div className="flex items-center gap-1">
      <input type="text" form={formId} name={name} defaultValue={defaultValue ?? ""} placeholder="URL" className="field-sm w-32" />
      {defaultValue && (
        <a href={defaultValue} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function SaveButton({ formId }: { formId: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      await updateDealFields(form.dataset.dealId as string, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
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

export function DealsTable({
  rows,
  showCompanyColumn,
  isClient,
}: {
  rows: DealsTableRow[];
  showCompanyColumn: boolean;
  isClient: boolean;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
          <tr>
            <th className="px-2 py-2 font-medium"></th>
            <th className="px-2 py-2 font-medium">No</th>
            <th className="px-2 py-2 font-medium">案件区分</th>
            {showCompanyColumn && <th className="px-2 py-2 font-medium">企業名</th>}
            {showCompanyColumn && <th className="px-2 py-2 font-medium">業種</th>}
            <th className="px-2 py-2 font-medium">担当者名</th>
            <th className="px-2 py-2 font-medium">役職</th>
            <th className="px-2 py-2 font-medium">流入経路</th>
            <th className="px-2 py-2 font-medium">案件ステータス</th>
            <th className="px-2 py-2 font-medium">見積もり金額</th>
            <th className="px-2 py-2 font-medium">確度(%)</th>
            <th className="px-2 py-2 font-medium">見込み売上</th>
            <th className="px-2 py-2 font-medium">新規商談日</th>
            <th className="px-2 py-2 font-medium">提案商談日</th>
            <th className="px-2 py-2 font-medium">ヨミ商談日</th>
            <th className="px-2 py-2 font-medium">受注予定日</th>
            <th className="px-2 py-2 font-medium">最終接触日</th>
            <th className="px-2 py-2 font-medium">次回アクション日</th>
            <th className="px-2 py-2 font-medium">次回商談時間</th>
            <th className="px-2 py-2 font-medium">経過日数</th>
            <th className="px-2 py-2 font-medium">次回アクション内容</th>
            <th className="px-2 py-2 font-medium">顧客(先方)課題</th>
            <th className="px-2 py-2 font-medium">提案内容</th>
            <th className="px-2 py-2 font-medium">B:予算</th>
            <th className="px-2 py-2 font-medium">A:決裁者</th>
            <th className="px-2 py-2 font-medium">N:必要性</th>
            <th className="px-2 py-2 font-medium">T:時期</th>
            <th className="px-2 py-2 font-medium">懸念点</th>
            <th className="px-2 py-2 font-medium">失注理由</th>
            <th className="px-2 py-2 font-medium">フォロー方針</th>
            <th className="px-2 py-2 font-medium">商談議事録</th>
            <th className="px-2 py-2 font-medium">一次商談動画</th>
            <th className="px-2 py-2 font-medium">二次商談動画</th>
            <th className="px-2 py-2 font-medium">提案書</th>
            <th className="px-2 py-2 font-medium">見積もり</th>
            <th className="px-2 py-2 font-medium">商談FB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const formId = `deal-form-${row.id}`;
            return (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <Cell>
                  <form id={formId} data-deal-id={row.id} className="hidden" />
                  <SaveButton formId={formId} />
                </Cell>
                <Cell>{i + 1}</Cell>
                <Cell>
                  <TextInput formId={formId} name="deal_category" defaultValue={row.deal_category} disabled={false} />
                </Cell>
                {showCompanyColumn && (
                  <Cell>
                    <Link href={`/companies/${row.companyId}`} className="text-brand-600 hover:underline">
                      {row.companyName}
                    </Link>
                  </Cell>
                )}
                {showCompanyColumn && <Cell>{row.companyIndustry ?? "-"}</Cell>}
                <Cell>
                  <TextInput formId={formId} name="contact_name" defaultValue={row.contact_name} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="contact_title" defaultValue={row.contact_title} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="lead_source" defaultValue={row.lead_source} disabled={false} />
                </Cell>
                <Cell>
                  <select form={formId} name="stage" defaultValue={row.stage} className="field-sm w-28">
                    {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Cell>
                <Cell>
                  <NumberInput formId={formId} name="amount" defaultValue={row.amount} />
                </Cell>
                <Cell>
                  <NumberInput formId={formId} name="win_probability" defaultValue={row.win_probability} />
                </Cell>
                <Cell>
                  <NumberInput formId={formId} name="expected_revenue" defaultValue={row.expected_revenue} />
                </Cell>
                <Cell>
                  <DateInput formId={formId} name="first_meeting_date" defaultValue={row.first_meeting_date} />
                </Cell>
                <Cell>
                  <DateInput formId={formId} name="proposal_meeting_date" defaultValue={row.proposal_meeting_date} />
                </Cell>
                <Cell>
                  <DateInput formId={formId} name="forecast_meeting_date" defaultValue={row.forecast_meeting_date} />
                </Cell>
                <Cell>
                  <DateInput formId={formId} name="expected_close_date" defaultValue={row.expected_close_date} />
                </Cell>
                <Cell>
                  <DateInput formId={formId} name="last_contact_date" defaultValue={row.last_contact_date} />
                </Cell>
                <Cell>
                  <span className="text-slate-500">{row.next_action_date ?? "-"}</span>
                </Cell>
                <Cell>
                  <DatetimeInput formId={formId} name="next_meeting_at" defaultValue={row.next_meeting_at} />
                </Cell>
                <Cell>
                  <span className="text-slate-500">{elapsedDaysLabel(row.last_contact_date)}</span>
                </Cell>
                <Cell>
                  <span className="text-slate-500">{row.next_action_title ?? "-"}</span>
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="customer_issues" defaultValue={row.customer_issues} disabled={false} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="proposal_content" defaultValue={row.proposal_content} disabled={false} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="bant_budget" defaultValue={row.bant_budget} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="bant_authority" defaultValue={row.bant_authority} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="bant_need" defaultValue={row.bant_need} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="bant_timeline" defaultValue={row.bant_timeline} disabled={false} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="concerns" defaultValue={row.concerns} disabled={false} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="lost_reason" defaultValue={row.lost_reason} disabled={false} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="follow_up_policy" defaultValue={row.follow_up_policy} disabled={false} wide />
                </Cell>
                <Cell>
                  <UrlInput formId={formId} name="minutes_doc_url" defaultValue={row.minutes_doc_url} />
                </Cell>
                <Cell>
                  <UrlInput formId={formId} name="first_meeting_video_url" defaultValue={row.first_meeting_video_url} />
                </Cell>
                <Cell>
                  <UrlInput formId={formId} name="second_meeting_video_url" defaultValue={row.second_meeting_video_url} />
                </Cell>
                <Cell>
                  <UrlInput formId={formId} name="proposal_doc_url" defaultValue={row.proposal_doc_url} />
                </Cell>
                <Cell>
                  <UrlInput formId={formId} name="quote_doc_url" defaultValue={row.quote_doc_url} />
                </Cell>
                <Cell>
                  <TextInput
                    formId={formId}
                    name="meeting_feedback"
                    defaultValue={row.meeting_feedback}
                    disabled={isClient}
                    wide
                  />
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
