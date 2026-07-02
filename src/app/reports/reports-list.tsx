"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, Inbox } from "lucide-react";
import { ReportType } from "@/lib/types";
import { REPORT_TYPE_LABEL } from "@/lib/status";
import { GeneratedContentView } from "@/components/generated-content-view";
import { EmptyState } from "@/components/empty-state";

export interface ReportListItem {
  id: string;
  createdAt: string;
  reportType: ReportType;
  targetLabel: string;
  companyId: string | null;
  generatorName: string;
  googleDocUrl: string | null;
  content: Record<string, unknown>;
}

export function ReportsList({
  items,
  page,
  pageCount,
}: {
  items: ReportListItem[];
  page: number;
  pageCount: number;
}) {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/reports?${params.toString()}`;
  }

  if (items.length === 0) {
    return <EmptyState icon={Inbox} title="条件に一致する生成履歴がありません" description="対象種別や期間の条件を変えてお試しください。" />;
  }

  return (
    <div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">生成日時</th>
              <th className="px-4 py-3 font-medium">対象</th>
              <th className="px-4 py-3 font-medium">種別</th>
              <th className="px-4 py-3 font-medium">生成者</th>
              <th className="px-4 py-3 font-medium">Google Doc</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(item.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    {item.companyId ? (
                      <Link href={`/companies/${item.companyId}`} className="text-brand-600 hover:underline">
                        {item.targetLabel}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{item.targetLabel}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{REPORT_TYPE_LABEL[item.reportType]}</td>
                  <td className="px-4 py-3 text-slate-600">{item.generatorName}</td>
                  <td className="px-4 py-3">
                    {item.googleDocUrl ? (
                      <a
                        href={item.googleDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:underline"
                      >
                        開く <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
                    >
                      {expandedId === item.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      詳細
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <GeneratedContentView content={item.content} />
                    </td>
                  </tr>
                )}
              </Fragment>
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
