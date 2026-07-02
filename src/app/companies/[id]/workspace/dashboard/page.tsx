import { createServerClient } from "@/lib/supabase";
import { PipelineFunnel } from "@/components/pipeline-funnel";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: deals } = await supabase.from("deals").select("stage, amount").eq("company_id", params.id);

  return <PipelineFunnel deals={deals ?? []} />;
}
