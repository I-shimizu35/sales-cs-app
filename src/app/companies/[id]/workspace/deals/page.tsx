import { getDealsTableRows } from "@/lib/deals-table-data";
import { DealsTable } from "@/components/deals-table";
import { NewDealForm } from "@/components/new-deal-form";
import { EmptyState } from "@/components/empty-state";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceDealsPage({ params }: { params: { id: string } }) {
  const rows = await getDealsTableRows({ companyId: params.id });

  return (
    <div className="space-y-6">
      <NewDealForm companyId={params.id} />
      {rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />
      ) : (
        <DealsTable rows={rows} showCompanyColumn={false} isClient={false} />
      )}
    </div>
  );
}
