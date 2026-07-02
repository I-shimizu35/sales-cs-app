import { getDealsTableRows } from "@/lib/deals-table-data";
import { DealsTable } from "@/components/deals-table";
import { EmptyState } from "@/components/empty-state";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceDealsPage({ params }: { params: { id: string } }) {
  const rows = await getDealsTableRows({ companyId: params.id });

  if (rows.length === 0) {
    return <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />;
  }

  return <DealsTable rows={rows} showCompanyColumn={false} isClient={false} />;
}
