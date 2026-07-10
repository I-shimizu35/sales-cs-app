"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createDeal } from "@/app/companies/[id]/deal-actions";
import { InlineAlert } from "@/components/inline-alert";

export function NewDealForm({ companyId }: { companyId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createDeal(companyId, formData);
        form.reset();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">新規案件を追加</h3>
      {error && <InlineAlert variant="error">{error}</InlineAlert>}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          required
          disabled={isPending}
          placeholder="案件名(例: 2026年度導入検討)"
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
