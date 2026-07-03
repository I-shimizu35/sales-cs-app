import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { ReportType } from "@/lib/types";
import { REPORT_TYPE_LABEL } from "@/lib/status";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ReportsSearchClient } from "./reports-search-client";
import { ReportsList, ReportListItem } from "./reports-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface RawReport {
  id: string;
  target_type: "company" | "deal" | "meeting";
  target_id: string;
  report_type: ReportType;
  content: Record<string, unknown>;
  google_doc_url: string | null;
  generated_by: string | null;
  created_at: string;
}

interface SearchParams {
  targetType?: string;
  reportType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

interface ScopeIds {
  companyIds: string[];
  dealIds: string[];
  meetingIds: string[];
}

/**
 * admin/manager以外は自分の担当企業に紐づくレポート(company/deal/meeting)のみに絞り込む。
 * generated_reportsのtarget_typeはポリモーフィックなため、種別ごとにIDリストを用意し
 * .or()でtarget_type別のIN条件を組み立てる。担当企業が0件の場合はマッチしないid条件を返す。
 */
async function resolveScope(supabase: ReturnType<typeof createServerClient>): Promise<ScopeIds | null> {
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);
  if (accessibleCompanyIds === null) return null; // admin/manager: 制限なし

  if (accessibleCompanyIds.length === 0) {
    return { companyIds: [], dealIds: [], meetingIds: [] };
  }

  const { data: deals } = await supabase.from("deals").select("id").in("company_id", accessibleCompanyIds);
  const dealIds = (deals ?? []).map((d) => d.id);

  let meetingIds: string[] = [];
  if (dealIds.length > 0) {
    const { data: meetings } = await supabase.from("meetings").select("id").in("deal_id", dealIds);
    meetingIds = (meetings ?? []).map((m) => m.id);
  }

  return { companyIds: accessibleCompanyIds, dealIds, meetingIds };
}

function scopeOrFilter(scope: ScopeIds): string {
  const NEVER_MATCH = "00000000-0000-0000-0000-000000000000";
  const clauses = [
    `and(target_type.eq.company,target_id.in.(${scope.companyIds.length ? scope.companyIds.join(",") : NEVER_MATCH}))`,
    `and(target_type.eq.deal,target_id.in.(${scope.dealIds.length ? scope.dealIds.join(",") : NEVER_MATCH}))`,
    `and(target_type.eq.meeting,target_id.in.(${scope.meetingIds.length ? scope.meetingIds.join(",") : NEVER_MATCH}))`,
  ];
  return clauses.join(",");
}

function applyFilters<T>(query: T, params: SearchParams, scope: ScopeIds | null): T {
  let q = query as any;
  if (params.targetType) q = q.eq("target_type", params.targetType);
  if (params.reportType) q = q.eq("report_type", params.reportType);
  if (params.dateFrom) q = q.gte("created_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) q = q.lte("created_at", `${params.dateTo}T23:59:59`);
  if (scope) q = q.or(scopeOrFilter(scope));
  return q;
}

async function getReports(
  params: SearchParams
): Promise<{ reports: RawReport[]; total: number; page: number; pageCount: number }> {
  const supabase = createServerClient();
  const scope = await resolveScope(supabase);
  const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // 件数を先に確認し、ページ番号が総ページ数を超えないようclampする
  // (絞り込み条件の変更等で総件数が減った場合、超過したrangeをPostgRESTへ渡すと
  // 416 Requested range not satisfiableで例外になるため)
  const countQuery = applyFilters(
    supabase.from("generated_reports").select("id", { count: "exact", head: true }),
    params,
    scope
  );
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw new Error(`生成履歴の取得に失敗しました: ${countError.message}`);

  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  if (total === 0) {
    return { reports: [], total: 0, page: 1, pageCount: 1 };
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const dataQuery = applyFilters(
    supabase
      .from("generated_reports")
      .select("id, target_type, target_id, report_type, content, google_doc_url, generated_by, created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
    params,
    scope
  );
  const { data, error } = await dataQuery;
  if (error) throw new Error(`生成履歴の取得に失敗しました: ${error.message}`);

  return {
    reports: (data ?? []) as RawReport[],
    total,
    page,
    pageCount,
  };
}

/**
 * generated_reportsのtarget_typeはポリモーフィック(company/deal/meeting)なため、
 * 表示に必要な「対象企業名・リンク先company_id」をページ単位でまとめて逆引きする(N+1回避)。
 */
async function resolveTargets(
  reports: RawReport[]
): Promise<Record<string, { label: string; companyId: string | null }>> {
  const supabase = createServerClient();

  const companyIdsFromCompanyTarget = reports
    .filter((r) => r.target_type === "company")
    .map((r) => r.target_id);
  const dealIdsFromDealTarget = reports
    .filter((r) => r.target_type === "deal")
    .map((r) => r.target_id);
  const meetingIds = reports.filter((r) => r.target_type === "meeting").map((r) => r.target_id);

  const meetingMap: Record<string, { deal_id: string }> = {};
  if (meetingIds.length > 0) {
    const { data } = await supabase
      .from("meetings")
      .select("id, deal_id")
      .in("id", meetingIds);
    for (const m of data ?? []) meetingMap[m.id] = { deal_id: m.deal_id };
  }

  const dealIds = Array.from(
    new Set([...dealIdsFromDealTarget, ...Object.values(meetingMap).map((m) => m.deal_id)])
  );
  const dealMap: Record<string, { company_id: string; title: string }> = {};
  if (dealIds.length > 0) {
    const { data } = await supabase
      .from("deals")
      .select("id, company_id, title")
      .in("id", dealIds);
    for (const d of data ?? []) dealMap[d.id] = { company_id: d.company_id, title: d.title };
  }

  const companyIds = Array.from(
    new Set([...companyIdsFromCompanyTarget, ...Object.values(dealMap).map((d) => d.company_id)])
  );
  const companyMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data } = await supabase.from("companies").select("id, name").in("id", companyIds);
    for (const c of data ?? []) companyMap[c.id] = c.name;
  }

  const result: Record<string, { label: string; companyId: string | null }> = {};
  for (const r of reports) {
    if (r.target_type === "company") {
      result[r.id] = { label: companyMap[r.target_id] ?? "(企業不明)", companyId: r.target_id };
    } else if (r.target_type === "deal") {
      const deal = dealMap[r.target_id];
      result[r.id] = {
        label: deal ? `${companyMap[deal.company_id] ?? "(企業不明)"} - ${deal.title}` : "(案件不明)",
        companyId: deal?.company_id ?? null,
      };
    } else {
      const meeting = meetingMap[r.target_id];
      const deal = meeting ? dealMap[meeting.deal_id] : undefined;
      result[r.id] = {
        label: deal ? `${companyMap[deal.company_id] ?? "(企業不明)"} - ${deal.title}` : "(商談不明)",
        companyId: deal?.company_id ?? null,
      };
    }
  }
  return result;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { reports, total, page, pageCount } = await getReports(searchParams);
  const targets = await resolveTargets(reports);

  const generatorIds = Array.from(
    new Set(reports.map((r) => r.generated_by).filter((id): id is string => !!id))
  );
  const generatorMap: Record<string, string> = {};
  if (generatorIds.length > 0) {
    const supabase = createServerClient();
    const { data } = await supabase.from("users").select("id, name").in("id", generatorIds);
    for (const u of data ?? []) generatorMap[u.id] = u.name;
  }

  const items: ReportListItem[] = reports.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    reportType: r.report_type,
    targetLabel: targets[r.id]?.label ?? "(不明)",
    companyId: targets[r.id]?.companyId ?? null,
    generatorName: r.generated_by ? generatorMap[r.generated_by] ?? "不明" : "-",
    googleDocUrl: r.google_doc_url,
    content: r.content,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="生成履歴"
        description="AIによって生成された全ての企業分析・議事録・スコア等を横断して検索できます。"
      />

      <Suspense>
        <ReportsSearchClient
          reportTypeOptions={Object.entries(REPORT_TYPE_LABEL) as [ReportType, string][]}
        />
      </Suspense>

      <p className="mb-3 text-xs text-slate-500">
        {total}件中 {reports.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
        {(page - 1) * PAGE_SIZE + reports.length}件を表示
      </p>

      <Suspense>
        <ReportsList items={items} page={page} pageCount={pageCount} />
      </Suspense>
    </div>
  );
}
