import { getDealsTableRows } from "@/lib/deals-table-data";
import { getActionItemsByDeal } from "@/lib/action-items-data";
import { createServerClient } from "@/lib/supabase";
import { DealsTable } from "@/components/deals-table";
import { NewDealForm } from "@/components/new-deal-form";
import { ActionItemsPanel } from "@/components/action-items-panel";
import { EmptyState } from "@/components/empty-state";
import { AppUser } from "@/lib/types";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceDealsPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const [rows, actionItemGroups, { data: users }] = await Promise.all([
    getDealsTableRows({ companyId: params.id }),
    getActionItemsByDeal(params.id),
    supabase.from("users").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <NewDealForm companyId={params.id} />
      {rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />
      ) : (
        <DealsTable rows={rows} showCompanyColumn={false} isClient={false} />
      )}
      <ActionItemsPanel groups={actionItemGroups} users={(users ?? []) as AppUser[]} />
    </div>
  );
}
