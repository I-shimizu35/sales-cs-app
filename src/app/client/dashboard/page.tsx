import { Briefcase, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { getCurrentClient } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getAnalyticsData } from "@/lib/analytics-data";
import { PageHeader } from "@/components/page-header";
import { PipelineFunnel } from "@/components/pipeline-funnel";
import { SummaryCard } from "@/components/summary-card";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const client = await getCurrentClient();
  if (!client) return null;

  const supabase = createServerClient();
  const [{ data: company }, { data: deals }, { yomiSummary }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", client.companyId).maybeSingle(),
    supabase.from("deals").select("stage, amount, updated_at").eq("company_id", client.companyId),
    getAnalyticsData({ companyId: client.companyId }),
  ]);

  const allDeals = deals ?? [];
  const now = new Date();
  const wonThisMonthCount = allDeals.filter((d) => {
    if (d.stage !== "won") return false;
    const updated = new Date(d.updated_at);
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader
        title="ダッシュボード"
        description={`${company?.name ?? ""} 様の案件状況を一目で確認できます。`}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Briefcase className="h-4 w-4" />} label="案件数" value={allDeals.length} unit="件" />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="ヨミ件数"
          value={yomiSummary.yomiCount}
          unit="件"
          accent="text-brand-600"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="見込み受注金額"
          value={`¥${yomiSummary.expectedRevenueTotal.toLocaleString()}`}
          accent="text-emerald-600"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="受注(今月)"
          value={wonThisMonthCount}
          unit="件"
          accent="text-emerald-600"
        />
      </div>
      <PipelineFunnel deals={allDeals} />
    </div>
  );
}
