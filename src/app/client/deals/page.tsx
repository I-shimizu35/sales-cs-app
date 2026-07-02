import { getCurrentClient } from "@/lib/auth";
import { getDealsTableRows } from "@/lib/deals-table-data";
import { DealsTable } from "@/components/deals-table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDealsPage() {
  const client = await getCurrentClient();
  if (!client) return null;

  const rows = await getDealsTableRows({ companyId: client.companyId });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-8 py-10">
      <PageHeader title="案件管理表" description="自社の案件をヨミ表形式で一覧・編集できます。" />
      {rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />
      ) : (
        <DealsTable rows={rows} showCompanyColumn={false} isClient />
      )}
    </div>
  );
}
