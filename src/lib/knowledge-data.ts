import { createServerClient } from "./supabase";
import { DealStage } from "./types";

export interface KnowledgeStats {
  companyCount: number;
  caseCount: number;
  industryCount: number;
  wonCount: number;
}

export interface KnowledgeCaseHit {
  dealId: string;
  title: string;
  stage: DealStage;
  amount: number | null;
  lostReason: string | null;
}

export interface KnowledgeCompanyResult {
  companyId: string;
  companyName: string;
  industry: string | null;
  keyDifferentiators: string | null;
  appealAxis: string | null;
  referenceDocSummary: string | null;
  cases: KnowledgeCaseHit[];
}

interface CompanyRow {
  id: string;
  name: string;
  industry: string | null;
  key_differentiators: string | null;
  appeal_axis: string | null;
  strategy_reference_doc_summary: string | null;
}

async function attachCases(
  companies: CompanyRow[],
  accessibleCompanyIds: string[] | null
): Promise<KnowledgeCompanyResult[]> {
  if (companies.length === 0) return [];
  const supabase = createServerClient();

  let dealQuery = supabase
    .from("deals")
    .select("id, company_id, title, stage, amount, lost_reason")
    .in(
      "company_id",
      companies.map((c) => c.id)
    );
  if (accessibleCompanyIds) dealQuery = dealQuery.in("company_id", accessibleCompanyIds);
  const { data: deals, error } = await dealQuery;
  if (error) throw new Error(`案件情報の取得に失敗しました: ${error.message}`);

  const dealsByCompany = new Map<string, KnowledgeCaseHit[]>();
  for (const d of deals ?? []) {
    const list = dealsByCompany.get(d.company_id) ?? [];
    list.push({ dealId: d.id, title: d.title, stage: d.stage, amount: d.amount, lostReason: d.lost_reason });
    dealsByCompany.set(d.company_id, list);
  }

  return companies
    .map((c) => ({
      companyId: c.id,
      companyName: c.name,
      industry: c.industry,
      keyDifferentiators: c.key_differentiators,
      appealAxis: c.appeal_axis,
      referenceDocSummary: c.strategy_reference_doc_summary,
      cases: dealsByCompany.get(c.id) ?? [],
    }))
    .filter((c) => c.cases.length > 0);
}

/** ナレッジベースの統計カード用データ。案件(ケース)が1件以上ある企業のみを母数とする。 */
export async function getKnowledgeBaseStats(accessibleCompanyIds: string[] | null): Promise<KnowledgeStats> {
  const supabase = createServerClient();

  let companyQuery = supabase.from("companies").select("id, industry");
  if (accessibleCompanyIds) companyQuery = companyQuery.in("id", accessibleCompanyIds);
  let dealQuery = supabase.from("deals").select("id, company_id, stage");
  if (accessibleCompanyIds) dealQuery = dealQuery.in("company_id", accessibleCompanyIds);

  const [{ data: companies, error: companiesError }, { data: deals, error: dealsError }] = await Promise.all([
    companyQuery,
    dealQuery,
  ]);
  if (companiesError) throw new Error(`企業情報の取得に失敗しました: ${companiesError.message}`);
  if (dealsError) throw new Error(`案件情報の取得に失敗しました: ${dealsError.message}`);

  const companyIdsWithCases = new Set((deals ?? []).map((d) => d.company_id));
  const industries = new Set(
    (companies ?? [])
      .filter((c) => companyIdsWithCases.has(c.id) && c.industry)
      .map((c) => c.industry as string)
  );
  const wonCount = (deals ?? []).filter((d) => d.stage === "won").length;

  return {
    companyCount: companyIdsWithCases.size,
    caseCount: (deals ?? []).length,
    industryCount: industries.size,
    wonCount,
  };
}

const COMPANY_SEARCH_COLUMNS = [
  "name",
  "industry",
  "key_differentiators",
  "appeal_axis",
  "strategy_reference_doc_summary",
] as const;
const DEAL_SEARCH_COLUMNS = ["title", "lost_reason"] as const;
const COMPANY_SELECT =
  "id, name, industry, key_differentiators, appeal_axis, strategy_reference_doc_summary";

/**
 * 企業横断のナレッジ検索。企業名・業種・差別化要因・訴求軸・参考資料要約・
 * 案件名・失注理由のいずれかにキーワードが含まれる企業をヒットとし、
 * その企業の案件(ケース)一覧をあわせて返す。
 * .or()はカンマ・括弧を含む検索語で構文が壊れるため、/searchページと同様に列ごとに
 * 別クエリを投げてIDで結合する。
 */
export async function searchKnowledgeBase(
  query: string,
  accessibleCompanyIds: string[] | null
): Promise<KnowledgeCompanyResult[]> {
  const supabase = createServerClient();
  const like = `%${query}%`;

  const companyMatchQueries = COMPANY_SEARCH_COLUMNS.map((col) => {
    let q = supabase.from("companies").select(COMPANY_SELECT).ilike(col, like).limit(30);
    if (accessibleCompanyIds) q = q.in("id", accessibleCompanyIds);
    return q;
  });

  const dealMatchQueries = DEAL_SEARCH_COLUMNS.map((col) => {
    let q = supabase.from("deals").select("company_id").ilike(col, like).limit(30);
    if (accessibleCompanyIds) q = q.in("company_id", accessibleCompanyIds);
    return q;
  });

  const [companyResults, dealResults] = await Promise.all([
    Promise.all(companyMatchQueries),
    Promise.all(dealMatchQueries),
  ]);

  const companyMap = new Map<string, CompanyRow>();
  for (const { data, error } of companyResults) {
    if (error) throw new Error(`企業情報の取得に失敗しました: ${error.message}`);
    for (const c of data ?? []) companyMap.set(c.id, c as CompanyRow);
  }

  const dealMatchedCompanyIds = new Set<string>();
  for (const { data, error } of dealResults) {
    if (error) throw new Error(`案件情報の取得に失敗しました: ${error.message}`);
    for (const d of data ?? []) dealMatchedCompanyIds.add(d.company_id);
  }

  if (dealMatchedCompanyIds.size > 0) {
    let extraCompanyQuery = supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .in("id", Array.from(dealMatchedCompanyIds));
    if (accessibleCompanyIds) extraCompanyQuery = extraCompanyQuery.in("id", accessibleCompanyIds);
    const { data, error } = await extraCompanyQuery;
    if (error) throw new Error(`企業情報の取得に失敗しました: ${error.message}`);
    for (const c of data ?? []) companyMap.set(c.id, c as CompanyRow);
  }

  return attachCases(Array.from(companyMap.values()), accessibleCompanyIds);
}

/**
 * 検索前のデフォルト表示: 案件(ケース)が1件以上ある企業を、直近の案件更新が新しい順に。
 * 統計カードの「登録企業数」(案件がある企業)と母数を揃えることで、
 * 「10社/29件蓄積されている」のに一覧が空、という矛盾を避ける。
 */
export async function getDefaultKnowledgeBaseResults(
  accessibleCompanyIds: string[] | null,
  limit = 10
): Promise<KnowledgeCompanyResult[]> {
  const supabase = createServerClient();

  let dealQuery = supabase.from("deals").select("company_id, updated_at").order("updated_at", { ascending: false });
  if (accessibleCompanyIds) dealQuery = dealQuery.in("company_id", accessibleCompanyIds);
  const { data: deals, error: dealsError } = await dealQuery;
  if (dealsError) throw new Error(`案件情報の取得に失敗しました: ${dealsError.message}`);

  const latestCompanyIds: string[] = [];
  const seen = new Set<string>();
  for (const d of deals ?? []) {
    if (seen.has(d.company_id)) continue;
    seen.add(d.company_id);
    latestCompanyIds.push(d.company_id);
    if (latestCompanyIds.length >= limit) break;
  }
  if (latestCompanyIds.length === 0) return [];

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .in("id", latestCompanyIds);
  if (companiesError) throw new Error(`企業情報の取得に失敗しました: ${companiesError.message}`);

  const companyById = new Map((companies ?? []).map((c) => [c.id, c as CompanyRow]));
  const orderedCompanies = latestCompanyIds.map((id) => companyById.get(id)).filter((c): c is CompanyRow => !!c);

  return attachCases(orderedCompanies, accessibleCompanyIds);
}
