import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { CalendarCompanyFilter } from "@/components/calendar-company-filter";

export const dynamic = "force-dynamic";

interface ActionRow {
  id: string;
  title: string;
  due_date: string;
  companyId: string;
  companyName: string;
  overdue: boolean;
}

function parseMonthParam(month: string | undefined): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

async function getActionsInRange(fromIso: string, toIso: string, companyId?: string): Promise<ActionRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("action_items")
    .select("id, title, due_date, deals(company_id, companies(name))")
    .neq("status", "done")
    .gte("due_date", fromIso)
    .lte("due_date", toIso)
    .order("due_date", { ascending: true });
  if (error) throw new Error(`次回アクションの取得に失敗しました: ${error.message}`);

  const todayStr = new Date().toISOString().slice(0, 10);
  return ((data ?? []) as any[])
    .filter((item) => item.deals?.company_id)
    .filter((item) => !companyId || item.deals.company_id === companyId)
    .map((item) => ({
      id: item.id,
      title: item.title,
      due_date: item.due_date,
      companyId: item.deals.company_id,
      companyName: item.deals.companies?.name ?? "(企業不明)",
      overdue: item.due_date < todayStr,
    }));
}

async function getCompanyOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("companies").select("id, name").order("name");
  if (error) throw new Error(`企業一覧の取得に失敗しました: ${error.message}`);
  return data ?? [];
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; companyId?: string };
}) {
  const { year, month } = parseMonthParam(searchParams.month);

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  // カレンダー表示上、月初の週の前・月末の週の後ろにはみ出る日付も含めて取得する
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  const [actions, companies] = await Promise.all([
    getActionsInRange(toIsoDate(gridStart), toIsoDate(gridEnd), searchParams.companyId),
    getCompanyOptions(),
  ]);

  const actionsByDate: Record<string, ActionRow[]> = {};
  for (const a of actions) {
    if (!actionsByDate[a.due_date]) actionsByDate[a.due_date] = [];
    actionsByDate[a.due_date].push(a);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const todayStr = toIsoDate(new Date());

  const companyQuerySuffix = searchParams.companyId ? `&companyId=${searchParams.companyId}` : "";

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader title="次回アクションカレンダー" description="全クライアントの次回アクションを月表示で確認できます。" />

      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/calendar?month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}${companyQuerySuffix}`}
          className="btn-secondary btn-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          前月
        </Link>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          {year}年{month + 1}月
        </h2>
        <Link
          href={`/calendar?month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}${companyQuerySuffix}`}
          className="btn-secondary btn-sm"
        >
          翌月
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <CalendarCompanyFilter companies={companies} />
        </Suspense>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-medium text-slate-500">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = toIsoDate(d);
            const inMonth = d.getMonth() === month;
            const dayActions = actionsByDate[iso] ?? [];
            return (
              <div
                key={iso}
                className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 ${
                  inMonth ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <div
                  className={`mb-1 text-xs font-medium ${
                    iso === todayStr
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"
                      : inMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {dayActions.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={`/companies/${a.companyId}/workspace/deals`}
                      className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight hover:opacity-80 ${
                        a.overdue ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-700"
                      }`}
                      title={`${a.companyName} - ${a.title}`}
                    >
                      {a.companyName} {a.title}
                    </Link>
                  ))}
                  {dayActions.length > 3 && (
                    <div className="text-[11px] text-slate-400">他{dayActions.length - 3}件</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
