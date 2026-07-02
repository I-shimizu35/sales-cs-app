import { getCurrentClient } from "@/lib/auth";
import { getLeadsTableRows } from "@/lib/leads-table-data";
import { LeadsTable } from "@/components/leads-table";
import { NewLeadForm } from "@/components/new-lead-form";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientLeadsPage() {
  const client = await getCurrentClient();
  if (!client) return null;

  const rows = await getLeadsTableRows({ companyId: client.companyId });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-8 py-10">
      <PageHeader title="リード一覧" description="失注案件から自動登録されたリードと、手動追加したリードを一元管理します。" />
      <NewLeadForm fixedCompanyId={client.companyId} />
      {rows.length === 0 ? (
        <EmptyState icon={Target} title="まだリードが登録されていません" />
      ) : (
        <LeadsTable rows={rows} />
      )}
    </div>
  );
}
