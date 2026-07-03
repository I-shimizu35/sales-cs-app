"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Building2, User, ChevronRight, SearchX, ArrowRight } from "lucide-react";
import { Company } from "@/lib/types";
import { DEAL_STATUS_LABEL, DEAL_STATUS_BADGE_CLASS, SUPPORT_STATUS_LABEL, SUPPORT_STATUS_BADGE_CLASS } from "@/lib/status";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export interface CompanyWithOwner extends Company {
  owner: { name: string } | null;
}

function StatusBadge({ status }: { status: Company["deal_status"] }) {
  return <span className={`badge ${DEAL_STATUS_BADGE_CLASS[status]}`}>{DEAL_STATUS_LABEL[status]}</span>;
}

function SupportStatusBadge({ status }: { status: Company["support_status"] }) {
  return <span className={`badge ${SUPPORT_STATUS_BADGE_CLASS[status]}`}>{SUPPORT_STATUS_LABEL[status]}</span>;
}

export function CompanyListClient({
  companies,
  canCreateCompany,
  supporterNamesByCompany,
}: {
  companies: CompanyWithOwner[];
  canCreateCompany: boolean;
  supporterNamesByCompany: Record<string, string[]>;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[],
    [companies]
  );

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (industryFilter && c.industry !== industryFilter) return false;
      if (statusFilter && c.deal_status !== statusFilter) return false;
      return true;
    });
  }, [companies, searchTerm, industryFilter, statusFilter]);

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader
        title="企業一覧"
        description="登録されている企業の検索と管理を行います。"
        actions={
          <button
            disabled={!canCreateCompany}
            onClick={() => router.push("/companies/new")}
            className={canCreateCompany ? "btn-brand" : "btn border border-slate-200 bg-slate-100 px-4 py-2 text-slate-400"}
          >
            <Plus className="h-4 w-4" />
            新規企業登録
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="企業名で検索..."
            className="field pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="field w-auto"
          >
            <option value="">業種: すべて</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field w-auto"
          >
            <option value="">ステータス: すべて</option>
            {Object.entries(DEAL_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={companies.length === 0 ? Building2 : SearchX}
              title={
                companies.length === 0
                  ? "企業が登録されていません"
                  : "条件に一致する企業がありません"
              }
              description={
                companies.length === 0 ? "「新規企業登録」から追加してください。" : "検索条件を変えてお試しください。"
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">会社名</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">業種</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">ステータス</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">支援ステータス</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">支援担当者</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">担当者</th>
                  <th className="whitespace-nowrap px-6 py-3.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((company) => (
                  <tr
                    key={company.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900 transition-colors group-hover:text-brand-600">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">{company.industry ?? "-"}</td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <StatusBadge status={company.deal_status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <SupportStatusBadge status={company.support_status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">
                      {(supporterNamesByCompany[company.id] ?? []).join("、") || (
                        <span className="text-slate-400">未設定</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="h-4 w-4 text-slate-400" />
                        {company.owner?.name ?? "未設定"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/companies/${company.id}/workspace/dashboard`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                        >
                          管理画面へ
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-600" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
