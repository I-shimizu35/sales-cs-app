"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { updateDealFields } from "@/app/companies/[id]/deal-actions";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealStage } from "@/lib/types";
import { DealsTableRow } from "./deals-table";

const STAGE_ORDER: DealStage[] = ["first_contact", "hearing", "proposal", "closing", "won", "lost"];

const STAGE_COLUMN_CLASS: Record<DealStage, string> = {
  first_contact: "border-slate-200 bg-slate-50/70",
  hearing: "border-blue-200 bg-blue-50/50",
  proposal: "border-amber-200 bg-amber-50/50",
  closing: "border-purple-200 bg-purple-50/50",
  won: "border-emerald-200 bg-emerald-50/50",
  lost: "border-red-200 bg-red-50/50",
};

export function DealsKanbanBoard({
  rows,
  showCompanyColumn,
  onLeadCreated,
}: {
  rows: DealsTableRow[];
  showCompanyColumn: boolean;
  onLeadCreated: () => void;
}) {
  const [localRows, setLocalRows] = useState(rows);
  // サーバー再検証(revalidatePath)で親から新しいrowsが渡ってきたら追従する
  useEffect(() => setLocalRows(rows), [rows]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [, startTransition] = useTransition();
  const [errorDealId, setErrorDealId] = useState<string | null>(null);

  const columns = STAGE_ORDER.map((stage) => ({
    stage,
    rows: localRows.filter((r) => r.stage === stage),
  }));

  function handleDrop(newStage: DealStage) {
    setDragOverStage(null);
    const dealId = draggingId;
    setDraggingId(null);
    if (!dealId) return;

    const target = localRows.find((r) => r.id === dealId);
    if (!target || target.stage === newStage) return;

    const previousRows = localRows;
    setLocalRows((prev) => prev.map((r) => (r.id === dealId ? { ...r, stage: newStage } : r)));
    setErrorDealId(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("stage", newStage);
        const result = await updateDealFields(dealId, formData);
        if (result.leadCreated) onLeadCreated();
      } catch (e) {
        // 権限不足等でサーバー側が拒否した場合は表示を元に戻す
        setLocalRows(previousRows);
        setErrorDealId(dealId);
      }
    });
  }

  return (
    <div className="overflow-x-auto pb-4">
      {errorDealId && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          このステージへの変更は保存できませんでした(権限がない可能性があります)。表示を元に戻しました。
        </p>
      )}
      <div className="flex min-w-max gap-4">
        {columns.map(({ stage, rows: stageRows }) => (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage((prev) => (prev === stage ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(stage);
            }}
            className={`w-72 shrink-0 rounded-xl border p-3 transition-colors ${STAGE_COLUMN_CLASS[stage]} ${
              dragOverStage === stage ? "ring-2 ring-brand-400" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-900">{DEAL_STAGE_LABEL[stage]}</h3>
              <span className="text-xs text-slate-400">{stageRows.length}件</span>
            </div>
            <div className="space-y-2">
              {stageRows.map((row) => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={() => setDraggingId(row.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`card cursor-grab space-y-1 p-3 text-xs active:cursor-grabbing ${
                    draggingId === row.id ? "opacity-40" : ""
                  }`}
                >
                  <p className="font-medium text-slate-900">{row.title}</p>
                  {showCompanyColumn && (
                    <Link
                      href={`/companies/${row.companyId}/workspace/deals`}
                      className="block text-slate-500 hover:text-brand-600 hover:underline"
                    >
                      {row.companyName}
                    </Link>
                  )}
                  {row.contact_name && <p className="text-slate-500">担当: {row.contact_name}</p>}
                  {(row.amount || row.expected_revenue) && (
                    <p className="text-slate-600">
                      ¥{(row.amount ?? row.expected_revenue ?? 0).toLocaleString()}
                    </p>
                  )}
                  {row.next_action_title && (
                    <p className="text-slate-400">
                      次回: {row.next_action_title}
                      {row.next_action_date ? `(${row.next_action_date})` : ""}
                    </p>
                  )}
                </div>
              ))}
              {stageRows.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-300">案件なし</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
