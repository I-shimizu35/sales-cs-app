import Link from "next/link";
import { BookOpen, Building2, Briefcase, Layers, Trophy, Search } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import {
  getKnowledgeBaseStats,
  getDefaultKnowledgeBaseResults,
  searchKnowledgeBase,
  KnowledgeCompanyResult,
} from "@/lib/knowledge-data";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

const STAGE_BADGE_CLASS: Record<string, string> = {
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-slate-50 text-slate-400 border-slate-100",
};
const DEFAULT_STAGE_BADGE_CLASS = "bg-amber-50 text-amber-700 border-amber-200";

function formatAmount(amount: number | null): string | null {
  if (amount === null) return null;
  return `${amount.toLocaleString("ja-JP")}円`;
}

export default async function KnowledgeBasePage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createServerClient();
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);

  const [stats, results] = await Promise.all([
    getKnowledgeBaseStats(accessibleCompanyIds),
    q ? searchKnowledgeBase(q, accessibleCompanyIds) : getDefaultKnowledgeBaseResults(accessibleCompanyIds),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <PageHeader
        title="ナレッジベース"
        description="過去の商談ケース(案件)を企業横断で検索し、商談戦略設計の参考にできます。"
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">登録企業数</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.companyCount}
            <span className="ml-1 text-xs font-normal text-slate-500">社</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <Briefcase className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">総ケース数</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.caseCount}
            <span className="ml-1 text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">業種カバレッジ</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.industryCount}
            <span className="ml-1 text-xs font-normal text-slate-500">業種</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-emerald-600">
            <Trophy className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">受注実績</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.wonCount}
            <span className="ml-1 text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
      </div>

      <form className="card mb-8 flex items-center gap-3 p-4">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="企業名・業種・差別化要因・訴求軸・失注理由などで検索..."
          className="field flex-1 border-0 p-0 focus:ring-0"
        />
        <button type="submit" className="btn-brand btn-sm">
          検索
        </button>
      </form>

      {!q && results.length > 0 && (
        <h3 className="mb-3 text-sm font-semibold text-slate-900">案件のある企業(直近の更新順)</h3>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={q ? `「${q}」に一致するケースがありません` : "まだ蓄積されたナレッジがありません"}
          description={
            q
              ? undefined
              : "企業に案件を登録すると、ここに表示されます。商談戦略設計(AI)タブで差別化要因・訴求軸を登録すると、あわせて表示されます。"
          }
        />
      ) : (
        <div className="space-y-5">
          {results.map((r: KnowledgeCompanyResult) => (
            <div key={r.companyId} className="card p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/companies/${r.companyId}`}
                    className="text-sm font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {r.companyName}
                  </Link>
                  {r.industry && <span className="ml-2 text-xs text-slate-400">{r.industry}</span>}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{r.cases.length}件のケース</span>
              </div>

              {(r.keyDifferentiators || r.appealAxis) && (
                <div className="mb-3 space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                  {r.keyDifferentiators && (
                    <p>
                      <span className="font-medium text-slate-500">差別化要因: </span>
                      {r.keyDifferentiators}
                    </p>
                  )}
                  {r.appealAxis && (
                    <p>
                      <span className="font-medium text-slate-500">訴求軸: </span>
                      {r.appealAxis}
                    </p>
                  )}
                </div>
              )}

              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {r.cases.map((c) => (
                  <div key={c.dealId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span className="font-medium text-slate-700">{c.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {formatAmount(c.amount) && <span className="text-slate-400">{formatAmount(c.amount)}</span>}
                      {c.stage === "lost" && c.lostReason && (
                        <span className="text-slate-400">({c.lostReason})</span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 font-semibold ${
                          STAGE_BADGE_CLASS[c.stage] ?? DEFAULT_STAGE_BADGE_CLASS
                        }`}
                      >
                        {DEAL_STAGE_LABEL[c.stage]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
