"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ACTION_LABEL, TARGET_TYPE_LABEL } from "./audit-log-search-client";

const ACTION_BADGE_CLASS: Record<string, string> = {
  create: "border-emerald-200 bg-emerald-50 text-emerald-700",
  update: "border-blue-200 bg-blue-50 text-blue-700",
  delete: "border-red-200 bg-red-50 text-red-700",
  generate: "border-purple-200 bg-purple-50 text-purple-700",
  export: "border-slate-200 bg-slate-50 text-slate-600",
  reflect: "border-amber-200 bg-amber-50 text-amber-700",
};

export interface AuditLogItem {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  companyId: string | null;
  detail: Record<string, unknown> | null;
}

export function AuditLogList({ items, page, pageCount }: { items: AuditLogItem[]; page: number; pageCount: number }) {
  const searchParams = useSearchParams();

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/admin/audit-logs?${params.toString()}`;
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={ScrollText} title="条件に一致する操作履歴がありません" description="操作者や期間の条件を変えてお試しください。" />
    );
  }

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">日時</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">操作者</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">操作</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">対象</th>
              <th className="px-4 py-3 font-medium">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {new Date(item.createdAt).toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-slate-600">{item.actorName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${ACTION_BADGE_CLASS[item.action] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
                  >
                    {ACTION_LABEL[item.action] ?? item.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="mr-2 text-xs text-slate-400">
                    {TARGET_TYPE_LABEL[item.targetType] ?? item.targetType}
                  </span>
                  {item.companyId ? (
                    <Link href={`/companies/${item.companyId}`} className="text-brand-600 hover:underline">
                      {item.targetLabel ?? item.targetId}
                    </Link>
                  ) : (
                    <span className="text-slate-600">{item.targetLabel ?? item.targetId}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {item.detail ? JSON.stringify(item.detail) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-md border border-slate-200 px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            前へ
          </Link>
          <span className="text-slate-500">
            {page} / {pageCount}
          </span>
          <Link
            href={pageHref(Math.min(pageCount, page + 1))}
            aria-disabled={page >= pageCount}
            className={`rounded-md border border-slate-200 px-3 py-1.5 ${
              page >= pageCount ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            次へ
          </Link>
        </div>
      )}
    </div>
  );
}
