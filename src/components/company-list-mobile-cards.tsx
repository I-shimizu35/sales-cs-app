"use client";

import Link from "next/link";
import { Building2, User, Target } from "lucide-react";
import { SUPPORT_PHASE_LABEL, SUPPORT_PHASE_BADGE_CLASS, SUPPORT_STATE_LABEL, SUPPORT_STATE_BADGE_CLASS, getSupportState } from "@/lib/status";
import type { CompanyWithOwner } from "@/app/companies/company-list-client";

/**
 * md未満(スマートフォン)向けの企業一覧。deals-mobile-list.tsxと同じ設計方針
 * (横長テーブルの代わりに縦積みカードで主要項目だけを見せる)。
 */
export function CompanyListMobileCards({
  companies,
  supporterNamesByCompany,
}: {
  companies: CompanyWithOwner[];
  supporterNamesByCompany: Record<string, string[]>;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {companies.map((company) => {
        const state = getSupportState(company.support_status, company.support_phase);
        return (
          <Link
            key={company.id}
            href={`/companies/${company.id}`}
            className="card block p-3 text-sm transition-colors hover:border-brand-300"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <p className="font-medium text-slate-900">{company.name}</p>
              {company.principle_scores && (
                <span title="購買心理7原則スコア算定済み">
                  <Target className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                </span>
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {company.industry && <span className="text-xs text-slate-400">{company.industry}</span>}
              <span className={`badge ${SUPPORT_PHASE_BADGE_CLASS[company.support_phase]}`}>
                {SUPPORT_PHASE_LABEL[company.support_phase]}
              </span>
              <span className={`badge ${SUPPORT_STATE_BADGE_CLASS[state]}`}>{SUPPORT_STATE_LABEL[state]}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {company.owner?.name ?? "未設定"}
              </span>
              <span className="text-slate-400">
                {(supporterNamesByCompany[company.id] ?? []).join("、") || "支援チーム未設定"}
              </span>
            </div>
          </Link>
        );
      })}
      {companies.length === 0 && <p className="py-8 text-center text-xs text-slate-400">該当する企業がありません</p>}
    </div>
  );
}
