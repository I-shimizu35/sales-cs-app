import Link from "next/link";
import { Building2, Users, ArrowRight } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { SUPPORT_STATUS_LABEL, SUPPORT_STATUS_BADGE_CLASS } from "@/lib/status";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface ClientRosterRow {
  id: string;
  name: string;
  support_status: "active" | "inactive";
  supporterNames: string[];
}

async function getClientRoster(): Promise<ClientRosterRow[]> {
  const supabase = createServerClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, support_status")
    .order("name");
  if (error) throw new Error(`企業一覧の取得に失敗しました: ${error.message}`);

  const { data: supporters } = await supabase
    .from("company_supporters")
    .select("company_id, users(name)");

  const supporterNamesByCompany: Record<string, string[]> = {};
  for (const s of (supporters ?? []) as any[]) {
    const name = s.users?.name;
    if (!name) continue;
    if (!supporterNamesByCompany[s.company_id]) supporterNamesByCompany[s.company_id] = [];
    supporterNamesByCompany[s.company_id].push(name);
  }

  return (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    support_status: c.support_status,
    supporterNames: supporterNamesByCompany[c.id] ?? [],
  }));
}

export default async function DashboardPage() {
  const roster = await getClientRoster();
  const activeCount = roster.filter((c) => c.support_status === "active").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-10">
      <PageHeader title="クライアント一覧" description="支援先クライアントの状況と担当者を一目で確認できます。" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Building2 className="h-4 w-4" />
            <h2 className="text-sm font-medium">クライアント数</h2>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            {roster.length}
            <span className="ml-1 text-sm font-normal text-slate-500">社</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <Users className="h-4 w-4" />
            <h2 className="text-sm font-medium">支援中</h2>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            {activeCount}
            <span className="ml-1 text-sm font-normal text-slate-500">社</span>
          </div>
        </div>
      </div>

      {roster.length === 0 ? (
        <EmptyState icon={Building2} title="まだクライアントが登録されていません" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 font-medium">クライアント名</th>
                <th className="px-6 py-3.5 font-medium">支援ステータス</th>
                <th className="px-6 py-3.5 font-medium">支援担当者</th>
                <th className="px-6 py-3.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5">
                    <Link href={`/companies/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`badge ${SUPPORT_STATUS_BADGE_CLASS[c.support_status]}`}>
                      {SUPPORT_STATUS_LABEL[c.support_status]}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {c.supporterNames.length > 0 ? c.supporterNames.join("、") : <span className="text-slate-400">未設定</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      href={`/companies/${c.id}/workspace/dashboard`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                    >
                      管理画面へ
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
