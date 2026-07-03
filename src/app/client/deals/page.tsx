import { getCurrentClient } from "@/lib/auth";
import { getDealsTableRows } from "@/lib/deals-table-data";
import { getActionItemsByDeal } from "@/lib/action-items-data";
import { createServerClient } from "@/lib/supabase";
import { DealsTable } from "@/components/deals-table";
import { NewDealForm } from "@/components/new-deal-form";
import { ActionItemsPanel } from "@/components/action-items-panel";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClientOnboardingBanner } from "@/components/client-onboarding-banner";
import { AppUser } from "@/lib/types";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDealsPage() {
  const client = await getCurrentClient();
  if (!client) return null;

  const supabase = createServerClient();
  const [rows, actionItemGroups, { data: users }] = await Promise.all([
    getDealsTableRows({ companyId: client.companyId }),
    getActionItemsByDeal(client.companyId),
    supabase.from("users").select("*").order("name"),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-8 py-10">
      <PageHeader title="案件管理表" description="自社の案件をヨミ表形式で一覧・編集できます。" />
      <ClientOnboardingBanner />
      <NewDealForm companyId={client.companyId} />
      {rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />
      ) : (
        <DealsTable rows={rows} showCompanyColumn={false} isClient />
      )}
      <ActionItemsPanel groups={actionItemGroups} users={(users ?? []) as AppUser[]} />
    </div>
  );
}
