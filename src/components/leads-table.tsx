"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Trash2, Save, Check } from "lucide-react";
import { updateLeadFields, deleteLead } from "@/lib/leads-actions";

export interface LeadsTableRow {
  id: string;
  companyId: string;
  tenantCompanyName: string;
  convertedFromDealId: string | null;
  convertedFromDealTitle: string | null;
  lead_company_name: string;
  approach_list_name: string | null;
  last_approach_result: string | null;
  last_approach_at: string | null;
  activity_summary: string | null;
  phone: string | null;
  follow_call_desired: boolean | null;
  follow_call_summary: string | null;
  email: string | null;
  website_url: string | null;
  postal_code: string | null;
  address: string | null;
  material_shipping_destination: string | null;
  material_request_department: string | null;
  material_request_contact_name: string | null;
  lead_source: string | null;
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-100 px-2 py-1.5 align-top">{children}</td>;
}

function TextInput({ formId, name, defaultValue, wide }: { formId: string; name: string; defaultValue: string | null; wide?: boolean }) {
  return (
    <input
      type="text"
      form={formId}
      name={name}
      defaultValue={defaultValue ?? ""}
      className={`field-sm ${wide ? "w-48" : "w-32"}`}
    />
  );
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

function FollowCallSelect({ formId, defaultValue }: { formId: string; defaultValue: boolean | null }) {
  return (
    <select form={formId} name="follow_call_desired" defaultValue={defaultValue === null ? "" : String(defaultValue)} className="field-sm w-24">
      <option value="">未設定</option>
      <option value="true">希望する</option>
      <option value="false">希望しない</option>
    </select>
  );
}

function SaveButton({ formId, leadId }: { formId: string; leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      await updateLeadFields(leadId, formData);
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

export function LeadsTable({ rows, showTenantColumn }: { rows: LeadsTableRow[]; showTenantColumn?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
          <tr>
            <th className="px-2 py-2 font-medium"></th>
            {showTenantColumn && <th className="px-2 py-2 font-medium">クライアント</th>}
            <th className="px-2 py-2 font-medium">企業名</th>
            <th className="px-2 py-2 font-medium">アプローチリスト名称</th>
            <th className="px-2 py-2 font-medium">最終アプローチ結果</th>
            <th className="px-2 py-2 font-medium">最終アプローチ日時</th>
            <th className="px-2 py-2 font-medium">活動概要</th>
            <th className="px-2 py-2 font-medium">電話番号</th>
            <th className="px-2 py-2 font-medium">フォローコール希望</th>
            <th className="px-2 py-2 font-medium">過去商談履歴</th>
            <th className="px-2 py-2 font-medium">フォローコール概要</th>
            <th className="px-2 py-2 font-medium">メールアドレス</th>
            <th className="px-2 py-2 font-medium">企業ホームページURL</th>
            <th className="px-2 py-2 font-medium">郵便番号</th>
            <th className="px-2 py-2 font-medium">住所</th>
            <th className="px-2 py-2 font-medium">資料送付/宛先</th>
            <th className="px-2 py-2 font-medium">資料請求/担当部署名</th>
            <th className="px-2 py-2 font-medium">資料請求/担当者名</th>
            <th className="px-2 py-2 font-medium">リード取得元</th>
            <th className="px-2 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const formId = `lead-form-${row.id}`;
            return (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <Cell>
                  <form id={formId} className="hidden" />
                  <SaveButton formId={formId} leadId={row.id} />
                </Cell>
                {showTenantColumn && (
                  <Cell>
                    <Link href={`/companies/${row.companyId}`} className="text-slate-500 hover:underline">
                      {row.tenantCompanyName}
                    </Link>
                  </Cell>
                )}
                <Cell>
                  <TextInput formId={formId} name="lead_company_name" defaultValue={row.lead_company_name} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="approach_list_name" defaultValue={row.approach_list_name} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="last_approach_result" defaultValue={row.last_approach_result} />
                </Cell>
                <Cell>
                  <DatetimeInput formId={formId} name="last_approach_at" defaultValue={row.last_approach_at} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="activity_summary" defaultValue={row.activity_summary} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="phone" defaultValue={row.phone} />
                </Cell>
                <Cell>
                  <FollowCallSelect formId={formId} defaultValue={row.follow_call_desired} />
                </Cell>
                <Cell>
                  {row.convertedFromDealId ? (
                    <Link href={`/companies/${row.companyId}`} className="text-brand-600 hover:underline">
                      {row.convertedFromDealTitle ?? "案件へ"}
                    </Link>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="follow_call_summary" defaultValue={row.follow_call_summary} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="email" defaultValue={row.email} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="website_url" defaultValue={row.website_url} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="postal_code" defaultValue={row.postal_code} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="address" defaultValue={row.address} wide />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="material_shipping_destination" defaultValue={row.material_shipping_destination} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="material_request_department" defaultValue={row.material_request_department} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="material_request_contact_name" defaultValue={row.material_request_contact_name} />
                </Cell>
                <Cell>
                  <TextInput formId={formId} name="lead_source" defaultValue={row.lead_source} />
                </Cell>
                <Cell>
                  <form action={deleteLead.bind(null, row.id)}>
                    <button type="submit" className="text-slate-400 hover:text-red-600" title="削除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
