import { Target, Building2, PhoneCall } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { getLeadsTableRows } from "@/lib/leads-table-data";
import { LeadsTable } from "@/components/leads-table";
import { CalendarCompanyFilter } from "@/components/calendar-company-filter";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

async function getFilterCompanies(accessibleCompanyIds: string[] | null): Promise<{ id: string; name: string }[]> {
  const supabase = createServerClient();
  let query = supabase.from("companies").select("id, name").order("name");
  if (accessibleCompanyIds) query = query.in("id", accessibleCompanyIds);

  const { data, error } = await query;
  if (error) throw new Error(`企業一覧の取得に失敗しました: ${error.message}`);
  return data ?? [];
}

export default async function LeadsPage({ searchParams }: { searchParams: { companyId?: string } }) {
  const supabase = createServerClient();
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);

  const [rows, filterCompanies] = await Promise.all([
    getLeadsTableRows({ companyId: searchParams.companyId, accessibleCompanyIds }),
    getFilterCompanies(accessibleCompanyIds),
  ]);

  const companyCount = new Set(rows.map((r) => r.companyId)).size;
  const followCallCount = rows.filter((r) => r.follow_call_desired === true).length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-8 py-10">
      <PageHeader
        title="リード一覧"
        description="全クライアント企業のリード(失注案件からの自動登録・手動追加)を横断して確認できます。"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <Target className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">総リード数</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {rows.length}
            <span className="ml-1 text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">対象クライアント企業数</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {companyCount}
            <span className="ml-1 text-xs font-normal text-slate-500">社</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
            <PhoneCall className="h-3.5 w-3.5" />
            <h2 className="text-xs font-medium">フォローコール希望</h2>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {followCallCount}
            <span className="ml-1 text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
      </div>

      <CalendarCompanyFilter companies={filterCompanies} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="まだリードが登録されていません"
          description="失注案件からの自動登録、または各企業のワークスペースから手動で追加できます。"
        />
      ) : (
        <LeadsTable rows={rows} showClientCompany />
      )}
    </div>
  );
}
