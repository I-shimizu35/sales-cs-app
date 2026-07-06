import { Briefcase, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { getAnalyticsData } from "@/lib/analytics-data";
import { PipelineFunnel } from "@/components/pipeline-funnel";
import { SummaryCard } from "@/components/summary-card";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboardPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const [{ data: deals }, { yomiSummary }] = await Promise.all([
    supabase.from("deals").select("stage, amount, updated_at").eq("company_id", params.id),
    getAnalyticsData({ companyId: params.id }),
  ]);

  const allDeals = deals ?? [];
  const now = new Date();
  const wonThisMonthCount = allDeals.filter((d) => {
    if (d.stage !== "won") return false;
    const updated = new Date(d.updated_at);
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Briefcase className="h-4 w-4" />}
          label="案件数"
          value={allDeals.length}
          unit="件"
          href={`/companies/${params.id}/workspace/deals`}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="ヨミ件数"
          value={yomiSummary.yomiCount}
          unit="件"
          accent="text-brand-600"
          href={`/companies/${params.id}/workspace/deals`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="見込み受注金額"
          value={`¥${yomiSummary.expectedRevenueTotal.toLocaleString()}`}
          accent="text-emerald-600"
          href={`/companies/${params.id}/workspace/deals`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="受注(今月)"
          value={wonThisMonthCount}
          unit="件"
          accent="text-emerald-600"
          href={`/companies/${params.id}/workspace/deals?stage=won`}
        />
      </div>
      <PipelineFunnel deals={allDeals} />
    </div>
  );
}
