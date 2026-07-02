"use client";

import { createDeal } from "@/app/companies/[id]/deal-actions";

export function NewDealForm({ companyId }: { companyId: string }) {
  const createDealWithId = createDeal.bind(null, companyId);
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">新規案件を追加</h3>
      <form action={createDealWithId} className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          required
          placeholder="案件名(例: 2026年度導入検討)"
          className="field flex-1"
        />
        <button type="submit" className="btn-primary">
          追加
        </button>
      </form>
    </div>
  );
}
