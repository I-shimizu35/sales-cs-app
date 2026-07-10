"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { updateDealFields } from "@/app/companies/[id]/deal-actions";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { DealsTableRow } from "./deals-table";

/**
 * md未満(スマートフォン)向けの案件一覧。横長テーブルは片手操作に向かないため、
 * 縦積みカードでタイトル・ステータス・金額・次回アクションだけを見せ、
 * ステータス変更のみその場で完結できるようにする。詳細な項目編集はPC向けテーブルに委ねる。
 */
export function DealsMobileList({
  rows,
  showCompanyColumn,
  onLeadCreated,
}: {
  rows: DealsTableRow[];
  showCompanyColumn: boolean;
  onLeadCreated: () => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => (
        <DealMobileCard key={row.id} row={row} showCompanyColumn={showCompanyColumn} onLeadCreated={onLeadCreated} />
      ))}
      {rows.length === 0 && <p className="py-8 text-center text-xs text-slate-400">該当する案件がありません</p>}
    </div>
  );
}

function DealMobileCard({
  row,
  showCompanyColumn,
  onLeadCreated,
}: {
  row: DealsTableRow;
  showCompanyColumn: boolean;
  onLeadCreated: () => void;
}) {
  // 1カードにつき1つのuseTransitionにすることで、他の案件を更新中でも
  // このカードのスピナーが誤って表示されないようにする。
  const [isPending, startTransition] = useTransition();

  function handleStageChange(stage: string) {
    const formData = new FormData();
    formData.set("stage", stage);
    startTransition(async () => {
      const result = await updateDealFields(row.id, formData);
      if (result.leadCreated) onLeadCreated();
    });
  }

  return (
    <div className="card p-3 text-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="font-medium text-slate-900">{row.title}</p>
      </div>
      {showCompanyColumn && (
        <Link
          href={`/companies/${row.companyId}/workspace/deals`}
          className="mb-1.5 block text-xs text-brand-600 hover:underline"
        >
          {row.companyName}
        </Link>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {row.contact_name && <span>担当: {row.contact_name}</span>}
        {(row.amount || row.expected_revenue) && (
          <span>¥{(row.amount ?? row.expected_revenue ?? 0).toLocaleString()}</span>
        )}
      </div>
      {row.next_action_title && (
        <p className="mb-2 text-xs text-slate-400">
          次回アクション: {row.next_action_title}
          {row.next_action_date ? `(${row.next_action_date})` : ""}
        </p>
      )}
      <div className="relative">
        <select
          name="stage"
          defaultValue={row.stage}
          disabled={isPending}
          onChange={(e) => handleStageChange(e.target.value)}
          className="field-sm w-full disabled:bg-slate-50 disabled:text-slate-400"
        >
          {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>
    </div>
  );
}
