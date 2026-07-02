import Link from "next/link";
import { Briefcase, Activity, AlertCircle, Calendar, ArrowRight, Sparkles, CalendarCheck } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { Deal } from "@/lib/types";
import { DEAL_STAGE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PipelineFunnel } from "@/components/pipeline-funnel";

export const dynamic = "force-dynamic";

interface DealWithCompany extends Deal {
  companies: { name: string } | null;
}

async function getDashboardData() {
  const supabase = createServerClient();

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("*, companies(name)")
    .order("created_at", { ascending: false });
  if (dealsError) throw new Error(`案件情報の取得に失敗しました: ${dealsError.message}`);

  const { data: recentReports, error: reportsError } = await supabase
    .from("generated_reports")
    .select("id, report_type, created_at, target_type, target_id")
    .in("report_type", ["meeting_minutes", "temperature_score"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (reportsError) throw new Error(`生成履歴の取得に失敗しました: ${reportsError.message}`);

  const { data: actionItems, error: actionError } = await supabase
    .from("action_items")
    .select("id, title, due_date, status, deal_id, deals(title, company_id, companies(name))")
    .neq("status", "done")
    .order("due_date", { ascending: true })
    .limit(5);
  if (actionError) throw new Error(`次回アクションの取得に失敗しました: ${actionError.message}`);

  return {
    deals: (deals ?? []) as DealWithCompany[],
    recentReports: recentReports ?? [],
    actionItems: (actionItems ?? []) as any[],
  };
}

export default async function DashboardPage() {
  const { deals, actionItems } = await getDashboardData();

  const totalCount = deals.length;
  const inProgressCount = deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
  const wonThisMonthCount = deals.filter((d) => {
    if (d.stage !== "won") return false;
    const updated = new Date(d.updated_at);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  }).length;
  const needsReviewCount = deals.filter((d) => d.score_status === "ai_draft").length;

  const today = new Date();

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      <PageHeader title="ダッシュボード" description="担当案件の状況と次回アクションを一目で確認できます。" />

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard icon={<Briefcase className="h-4 w-4" />} label="案件数" value={totalCount} unit="件" />
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label="対応中"
          value={inProgressCount}
          unit="件"
          accent="text-brand-600"
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label="受注 (今月)"
          value={wonThisMonthCount}
          unit="件"
          accent="text-emerald-600"
        />
        <SummaryCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="スコア要確認"
          value={needsReviewCount}
          unit="件"
          accent="text-amber-600"
        />
      </div>

      <div className="mb-8">
        <PipelineFunnel deals={deals.map((d) => ({ stage: d.stage, amount: d.amount }))} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Deals list */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-brand-600" />
              案件一覧
            </h2>
          </div>
          <div className="card overflow-hidden">
            {deals.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Briefcase} title="まだ案件が登録されていません" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {deals.slice(0, 8).map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/companies/${deal.company_id}`}
                      className="group flex items-center justify-between p-4 transition-colors hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {deal.companies?.name ?? "(企業不明)"} - {deal.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          フェーズ: {DEAL_STAGE_LABEL[deal.stage]}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {deal.temperature_score !== null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            温度感: {deal.temperature_score}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Actions */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Calendar className="h-4 w-4 text-slate-500" />
            次回アクション期限
          </h2>
          <div className="space-y-3">
            {actionItems.length === 0 && (
              <EmptyState icon={CalendarCheck} title="登録されているアクションはありません" />
            )}
            {actionItems.map((task) => {
              const due = new Date(task.due_date);
              const urgent = due.getTime() - today.getTime() < 1000 * 60 * 60 * 24 * 2; // 2日以内
              const companyId = task.deals?.company_id;
              return (
                <Link
                  key={task.id}
                  href={companyId ? `/companies/${companyId}` : "#"}
                  className={`block rounded-xl border p-4 shadow-xs transition-colors hover:bg-slate-50 ${urgent ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {task.deals?.companies?.name ?? ""} {task.deals?.title ?? ""}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgent ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {task.due_date}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${urgent ? "text-red-900" : "text-slate-900"}`}>
                    {task.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
  accent = "text-slate-500",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className={`mb-2 flex items-center gap-2 ${accent}`}>
        {icon}
        <h2 className="text-sm font-medium">{label}</h2>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">
        {value}
        <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
