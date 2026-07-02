import { getLeadsTableRows } from "@/lib/leads-table-data";
import { LeadsTable } from "@/components/leads-table";
import { NewLeadForm } from "@/components/new-lead-form";
import { EmptyState } from "@/components/empty-state";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceLeadsPage({ params }: { params: { id: string } }) {
  const rows = await getLeadsTableRows({ companyId: params.id });

  return (
    <div className="space-y-6">
      <NewLeadForm fixedCompanyId={params.id} />
      {rows.length === 0 ? (
        <EmptyState icon={Target} title="まだリードが登録されていません" />
      ) : (
        <LeadsTable rows={rows} />
      )}
    </div>
  );
}
