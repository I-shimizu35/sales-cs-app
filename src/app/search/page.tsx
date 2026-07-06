import Link from "next/link";
import { Search, Building2, Briefcase, UserPlus } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface CompanyHit {
  id: string;
  name: string;
  industry: string | null;
}
interface DealHit {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
}
interface LeadHit {
  id: string;
  leadCompanyName: string;
  companyId: string;
  companyName: string;
}

async function searchAll(
  q: string,
  accessibleCompanyIds: string[] | null
): Promise<{ companies: CompanyHit[]; deals: DealHit[]; leads: LeadHit[] }> {
  const supabase = createServerClient();
  const like = `%${q}%`;

  // .or()はカンマ・括弧を含む検索語でフィルタ構文が壊れるため、name/industryは別クエリにして結合する
  let companyByNameQuery = supabase.from("companies").select("id, name, industry").ilike("name", like).limit(20);
  let companyByIndustryQuery = supabase
    .from("companies")
    .select("id, name, industry")
    .ilike("industry", like)
    .limit(20);
  if (accessibleCompanyIds) {
    companyByNameQuery = companyByNameQuery.in("id", accessibleCompanyIds);
    companyByIndustryQuery = companyByIndustryQuery.in("id", accessibleCompanyIds);
  }

  let dealQuery = supabase
    .from("deals")
    .select("id, title, company_id, companies(name)")
    .ilike("title", like)
    .limit(20);
  if (accessibleCompanyIds) dealQuery = dealQuery.in("company_id", accessibleCompanyIds);

  let leadQuery = supabase
    .from("leads")
    .select("id, lead_company_name, company_id, companies(name)")
    .ilike("lead_company_name", like)
    .limit(20);
  if (accessibleCompanyIds) leadQuery = leadQuery.in("company_id", accessibleCompanyIds);

  const [{ data: companiesByName }, { data: companiesByIndustry }, { data: deals }, { data: leads }] =
    await Promise.all([companyByNameQuery, companyByIndustryQuery, dealQuery, leadQuery]);

  const companyMap = new Map<string, { id: string; name: string; industry: string | null }>();
  for (const c of [...(companiesByName ?? []), ...(companiesByIndustry ?? [])]) {
    companyMap.set(c.id, c);
  }
  const companies = Array.from(companyMap.values());

  return {
    companies: companies.map((c) => ({ id: c.id, name: c.name, industry: c.industry })),
    deals: (deals ?? []).map((d: any) => ({
      id: d.id,
      title: d.title,
      companyId: d.company_id,
      companyName: d.companies?.name ?? "(企業不明)",
    })),
    leads: (leads ?? []).map((l: any) => ({
      id: l.id,
      leadCompanyName: l.lead_company_name,
      companyId: l.company_id,
      companyName: l.companies?.name ?? "(企業不明)",
    })),
  };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createServerClient();
  const accessibleCompanyIds = q ? await getAccessibleCompanyIds(supabase) : null;
  const results = q
    ? await searchAll(q, accessibleCompanyIds)
    : { companies: [], deals: [], leads: [] };

  const totalHits = results.companies.length + results.deals.length + results.leads.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <PageHeader title="横断検索" description="企業・案件・リードをまとめて検索できます。" />

      <form className="card mb-8 flex items-center gap-3 p-4">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="企業名・案件名・リード企業名で検索..."
          className="field flex-1 border-0 p-0 focus:ring-0"
          autoFocus
        />
        <button type="submit" className="btn-brand btn-sm">
          検索
        </button>
      </form>

      {!q ? (
        <EmptyState icon={Search} title="検索キーワードを入力してください" />
      ) : totalHits === 0 ? (
        <EmptyState icon={Search} title={`「${q}」に一致する結果がありません`} />
      ) : (
        <div className="space-y-8">
          {results.companies.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="h-4 w-4 text-brand-600" />
                企業 ({results.companies.length}件)
              </h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {results.companies.map((c) => (
                  <Link
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.industry ?? ""}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.deals.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Briefcase className="h-4 w-4 text-brand-600" />
                案件 ({results.deals.length}件)
              </h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {results.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/companies/${d.companyId}/workspace/deals`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{d.title}</span>
                    <span className="text-xs text-slate-400">{d.companyName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.leads.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserPlus className="h-4 w-4 text-brand-600" />
                リード ({results.leads.length}件)
              </h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {results.leads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/companies/${l.companyId}/workspace/leads`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{l.leadCompanyName}</span>
                    <span className="text-xs text-slate-400">{l.companyName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
