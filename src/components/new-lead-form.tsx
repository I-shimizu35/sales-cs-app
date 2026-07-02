"use client";

import { createLead } from "@/app/leads/actions";

export function NewLeadForm({
  companies,
  fixedCompanyId,
}: {
  companies?: { id: string; name: string }[];
  fixedCompanyId?: string;
}) {
  if (!fixedCompanyId && (!companies || companies.length === 0)) {
    return (
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">新規リードを追加</h3>
        <p className="text-xs text-slate-400">先に企業を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">新規リードを追加</h3>
      <form action={createLead} className="flex flex-wrap items-center gap-2">
        {fixedCompanyId ? (
          <input type="hidden" name="company_id" value={fixedCompanyId} />
        ) : (
          <select name="company_id" required defaultValue="" className="field sm:w-auto">
            <option value="" disabled>
              クライアントを選択
            </option>
            {companies!.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <input name="lead_company_name" required placeholder="見込み客の企業名" className="field flex-1" />
        <button type="submit" className="btn-primary">
          追加
        </button>
      </form>
    </div>
  );
}
