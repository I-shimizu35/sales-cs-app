import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, TrendingUp, Trophy, Percent, ArrowRight } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { getSegmentedAnalytics, SegmentDimension, SEGMENT_DIMENSION_LABEL } from "@/lib/analytics-data";
import { SupportPhase } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { EmptyState } from "@/components/empty-state";
import { AnalyticsFilters } from "@/components/analytics-filters";
import { SegmentBreakdownChart } from "@/components/segment-breakdown-chart";
import { SegmentExportButton } from "@/components/segment-export-button";
import { MonthlyTrendChart } from "@/components/analytics-charts";

export const dynamic = "force-dynamic";

// 企業一覧(/companies)への横断ドリルダウンは、企業レベルのフィールド(業種・支援フェーズ)を
// 軸にした場合のみ意味が通る。案件ステージ・案件担当者・案件区分・流入経路は「案件」に
// 紐づく値であり、全社横断の案件一覧ページが存在しないため、ドリルダウンリンクは出さない。
const DRILLDOWN_PARAM: Partial<Record<SegmentDimension, string>> = {
  industry: "industry",
  phase: "phase",
};

async function getFilterOptions(accessibleCompanyIds: string[] | null) {
  const supabase = createServerClient();
  let companyQuery = supabase.from("companies").select("industry");
  if (accessibleCompanyIds) companyQuery = companyQuery.in("id", accessibleCompanyIds);
  const { data: companies } = await companyQuery;
  const industries = Array.from(new Set((companies ?? []).map((c) => c.industry).filter(Boolean))) as string[];

  const { data: users } = await supabase.from("users").select("id, name").order("name");
  return { industries, owners: (users ?? []) as { id: string; name: string }[] };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: {
    groupBy?: string;
    industry?: string;
    phase?: string;
    ownerId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const supabase = createServerClient();
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);

  const groupBy = (
    Object.keys(SEGMENT_DIMENSION_LABEL).includes(searchParams.groupBy ?? "") ? searchParams.groupBy : "industry"
  ) as SegmentDimension;

  const [{ industries, owners }, result] = await Promise.all([
    getFilterOptions(accessibleCompanyIds),
    getSegmentedAnalytics({
      groupBy,
      industry: searchParams.industry || undefined,
      phase: (searchParams.phase as SupportPhase) || undefined,
      ownerId: searchParams.ownerId || undefined,
      dateFrom: searchParams.dateFrom || undefined,
      dateTo: searchParams.dateTo || undefined,
      accessibleCompanyIds,
    }),
  ]);

  const { summary, segments, monthlyTrend } = result;
  const drilldownParam = DRILLDOWN_PARAM[groupBy];

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="分析"
        description="企業・案件のあらゆる項目を軸に、全社横断でセグメント分析ができます。"
      />

      <Suspense>
        <AnalyticsFilters industries={industries} owners={owners} />
      </Suspense>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={<Briefcase className="h-4 w-4" />} label="対象案件数" value={summary.totalDealCount} unit="件" />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="見込み金額(進行中)"
          value={summary.openExpectedRevenue.toLocaleString("ja-JP")}
          unit="円"
        />
        <SummaryCard
          icon={<Trophy className="h-4 w-4" />}
          label="受注金額"
          value={summary.wonAmount.toLocaleString("ja-JP")}
          unit="円"
          accent="text-emerald-600"
        />
        <SummaryCard
          icon={<Percent className="h-4 w-4" />}
          label="受注率(受注/決着済み)"
          value={(summary.winRate * 100).toFixed(1)}
          unit="%"
        />
      </div>

      {segments.length === 0 ? (
        <EmptyState icon={Briefcase} title="対象データがありません" description="フィルタ条件を変えてお試しください。" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SegmentBreakdownChart segments={segments} />
            <MonthlyTrendChart data={monthlyTrend} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {SEGMENT_DIMENSION_LABEL[groupBy]}別ランキング
              </h3>
              <SegmentExportButton segments={segments} dimensionLabel={SEGMENT_DIMENSION_LABEL[groupBy]} />
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{SEGMENT_DIMENSION_LABEL[groupBy]}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">件数</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">受注件数</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">受注金額</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">見込み金額</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">受注率</th>
                    {drilldownParam && <th className="whitespace-nowrap px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {segments.map((s) => (
                    <tr key={s.segment} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{s.segmentLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.dealCount}件</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.wonCount}件</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.wonAmount.toLocaleString("ja-JP")}円</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {s.openExpectedRevenue.toLocaleString("ja-JP")}円
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{(s.winRate * 100).toFixed(1)}%</td>
                      {drilldownParam && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {s.segment && (
                            <Link
                              href={`/companies?${drilldownParam}=${encodeURIComponent(s.segment)}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                            >
                              企業一覧へ
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
