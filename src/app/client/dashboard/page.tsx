import { getCurrentClient } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { PipelineFunnel } from "@/components/pipeline-funnel";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const client = await getCurrentClient();
  if (!client) return null;

  const supabase = createServerClient();
  const [{ data: company }, { data: deals }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", client.companyId).maybeSingle(),
    supabase.from("deals").select("stage, amount").eq("company_id", client.companyId),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader
        title="ダッシュボード"
        description={`${company?.name ?? ""} 様の案件状況を一目で確認できます。`}
      />
      <PipelineFunnel deals={deals ?? []} />
    </div>
  );
}
