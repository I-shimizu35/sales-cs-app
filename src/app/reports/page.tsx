import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { ReportType } from "@/lib/types";
import { REPORT_TYPE_LABEL } from "@/lib/status";
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

async function getReports(
  params: SearchParams
): Promise<{ reports: RawReport[]; total: number; page: number; pageCount: number }> {
  const supabase = createServerClient();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("generated_reports")
    .select("id, target_type, target_id, report_type, content, google_doc_url, generated_by, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.targetType) query = query.eq("target_type", params.targetType);
  if (params.reportType) query = query.eq("report_type", params.reportType);
  if (params.dateFrom) query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);

  const { data, error, count } = await query;
  if (error) throw new Error(`生成履歴の取得に失敗しました: ${error.message}`);

  const total = count ?? 0;
  return {
    reports: (data ?? []) as RawReport[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
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
