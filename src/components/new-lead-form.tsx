"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createLead } from "@/lib/leads-actions";
import { InlineAlert } from "@/components/inline-alert";

export function NewLeadForm({
  companies,
  fixedCompanyId,
}: {
  companies?: { id: string; name: string }[];
  fixedCompanyId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!fixedCompanyId && (!companies || companies.length === 0)) {
    return (
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">新規リードを追加</h3>
        <p className="text-xs text-slate-400">先に企業を登録してください。</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createLead(formData);
        form.reset();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">新規リードを追加</h3>
      {error && <InlineAlert variant="error">{error}</InlineAlert>}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        {fixedCompanyId ? (
          <input type="hidden" name="company_id" value={fixedCompanyId} />
        ) : (
          <select
            name="company_id"
            required
            disabled={isPending}
            defaultValue=""
            className="field sm:w-auto disabled:bg-slate-50 disabled:text-slate-400"
          >
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
        <input
          name="lead_company_name"
          required
          disabled={isPending}
          placeholder="見込み客の企業名"
          className="field flex-1 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPending ? "追加中..." : "追加"}
        </button>
      </form>
    </div>
  );
}
