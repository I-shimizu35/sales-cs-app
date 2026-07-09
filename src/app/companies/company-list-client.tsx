"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Building2, User, ChevronRight, SearchX, ArrowRight, X, Target } from "lucide-react";
import { Company, SupportPhase } from "@/lib/types";
import {
  SUPPORT_PHASE_LABEL,
  SUPPORT_PHASE_BADGE_CLASS,
  SUPPORT_STATE_LABEL,
  SUPPORT_STATE_BADGE_CLASS,
  getSupportState,
  SupportState,
} from "@/lib/status";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export interface CompanyWithOwner extends Company {
  owner: { name: string } | null;
}

function SupportStateBadge({ status, phase }: { status: Company["support_status"]; phase: Company["support_phase"] }) {
  const state = getSupportState(status, phase);
  return <span className={`badge ${SUPPORT_STATE_BADGE_CLASS[state]}`}>{SUPPORT_STATE_LABEL[state]}</span>;
}

function SupportPhaseBadge({ phase }: { phase: Company["support_phase"] }) {
  return <span className={`badge ${SUPPORT_PHASE_BADGE_CLASS[phase]}`}>{SUPPORT_PHASE_LABEL[phase]}</span>;
}

export function CompanyListClient({
  companies,
  canCreateCompany,
  supporterNamesByCompany,
  supporterIdsByCompany,
}: {
  companies: CompanyWithOwner[];
  canCreateCompany: boolean;
  supporterNamesByCompany: Record<string, string[]>;
  supporterIdsByCompany: Record<string, string[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<SupportState | "">("");

  // ダッシュボードのKPIカードからのドリルダウン用: URLクエリパラメータをそのまま絞り込み条件として使う
  const supportStatusParam = searchParams.get("supportStatus");
  const phaseParam = searchParams.get("phase") as SupportPhase | null;
  const ownerParam = searchParams.get("owner");
  const supporterParam = searchParams.get("supporterId");
  const hasUrlFilter = !!(supportStatusParam || phaseParam || ownerParam || supporterParam);

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[],
    [companies]
  );

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (industryFilter && c.industry !== industryFilter) return false;
      if (stateFilter && getSupportState(c.support_status, c.support_phase) !== stateFilter) return false;
      if (supportStatusParam && c.support_status !== supportStatusParam) return false;
      if (phaseParam && c.support_phase !== phaseParam) return false;
      if (ownerParam && c.owner_user_id !== ownerParam) return false;
      if (supporterParam && !(supporterIdsByCompany[c.id] ?? []).includes(supporterParam)) return false;
      return true;
    });
  }, [
    companies,
    searchTerm,
    industryFilter,
    stateFilter,
    supportStatusParam,
    phaseParam,
    ownerParam,
    supporterParam,
    supporterIdsByCompany,
  ]);

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

      {hasUrlFilter && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          <span>ダッシュボードからの絞り込みが適用されています({filtered.length}件)</span>
          <Link href="/companies" className="flex items-center gap-1 text-xs font-medium hover:underline">
            <X className="h-3.5 w-3.5" />
            絞り込みを解除
          </Link>
        </div>
      )}

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
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as SupportState | "")}
            className="field w-auto"
          >
            <option value="">支援状況: すべて</option>
            {Object.entries(SUPPORT_STATE_LABEL).map(([value, label]) => (
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
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">支援フェーズ</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">支援状況</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">支援チーム(社内)</th>
                  <th className="whitespace-nowrap px-6 py-3.5 font-medium">主担当(社内)</th>
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
                        {company.principle_scores && (
                          <span title="購買心理7原則スコア算定済み">
                            <Target className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">{company.industry ?? "-"}</td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <SupportPhaseBadge phase={company.support_phase} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <SupportStateBadge status={company.support_status} phase={company.support_phase} />
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
