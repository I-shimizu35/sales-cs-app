import Link from "next/link";
import { Search, Briefcase, UserPlus } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getCurrentClient } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ClientSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const client = await getCurrentClient();
  if (!client) return null;

  const q = (searchParams.q ?? "").trim();
  const supabase = createServerClient();
  const like = `%${q}%`;

  const [{ data: deals }, { data: leads }] = q
    ? await Promise.all([
        supabase
          .from("deals")
          .select("id, title")
          .eq("company_id", client.companyId)
          .ilike("title", like)
          .limit(30),
        supabase
          .from("leads")
          .select("id, lead_company_name")
          .eq("company_id", client.companyId)
          .ilike("lead_company_name", like)
          .limit(30),
      ])
    : [{ data: [] }, { data: [] }];

  const dealHits = deals ?? [];
  const leadHits = leads ?? [];
  const totalHits = dealHits.length + leadHits.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <PageHeader title="横断検索" description="自社の案件・リードを検索できます。" />

      <form className="card mb-8 flex items-center gap-3 p-4">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="案件名・リード企業名で検索..."
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
          {dealHits.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Briefcase className="h-4 w-4 text-brand-600" />
                案件 ({dealHits.length}件)
              </h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {dealHits.map((d) => (
                  <Link
                    key={d.id}
                    href="/client/deals"
                    className="flex items-center px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {leadHits.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserPlus className="h-4 w-4 text-brand-600" />
                リード ({leadHits.length}件)
              </h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {leadHits.map((l) => (
                  <Link
                    key={l.id}
                    href="/client/leads"
                    className="flex items-center px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                  >
                    {l.lead_company_name}
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
