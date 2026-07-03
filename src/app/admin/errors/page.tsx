import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const SOURCE_LABEL: Record<string, string> = {
  ai_generate: "AI生成(分析レポート)",
  ai_generate_feedback: "AI生成(商談FB連鎖)",
  email_send: "メール送信",
  cron_overdue_actions: "期日超過アクション通知(cron)",
};

interface ErrorLogRow {
  id: string;
  source: string;
  message: string;
  detail: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

interface SearchParams {
  source?: string;
  page?: string;
}

export default async function AdminErrorsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createServerClient();
  const requestedPage = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  let countQuery = supabase.from("error_logs").select("id", { count: "exact", head: true });
  if (searchParams.source) countQuery = countQuery.eq("source", searchParams.source);
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) {
    return (
      <p className="text-sm text-red-600">
        エラーログの取得に失敗しました(error_logsテーブルが未作成の可能性があります): {countError.message}
      </p>
    );
  }

  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let dataQuery = supabase
    .from("error_logs")
    .select("id, source, message, detail, user_id, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (searchParams.source) dataQuery = dataQuery.eq("source", searchParams.source);
  const { data, error } = await dataQuery;
  if (error) {
    return <p className="text-sm text-red-600">エラーログの取得に失敗しました: {error.message}</p>;
  }
  const logs = (data ?? []) as ErrorLogRow[];

  const userIds = Array.from(new Set(logs.map((l) => l.user_id).filter((id): id is string => !!id)));
  const userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, name").in("id", userIds);
    for (const u of users ?? []) userMap[u.id] = u.name;
  }

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (searchParams.source) params.set("source", searchParams.source);
    params.set("page", String(targetPage));
    return `/admin/errors?${params.toString()}`;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        AI生成・メール送信・cronジョブ等でシステム内部エラーが発生した際の記録です。頻発している場合は原因調査の目安にしてください。
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/errors"
          className={`badge ${!searchParams.source ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
        >
          すべて
        </Link>
        {Object.entries(SOURCE_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/errors?source=${key}`}
            className={`badge ${searchParams.source === key ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {total}件中 {logs.length === 0 ? 0 : from + 1}-{from + logs.length}件を表示
      </p>

      {logs.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="エラーログはありません" description="対象期間・種別に該当するエラーは記録されていません。" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">日時</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">種別</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">操作者</th>
                <th className="px-4 py-3 font-medium">メッセージ</th>
                <th className="px-4 py-3 font-medium">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {new Date(log.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="badge border-red-200 bg-red-50 text-red-700">
                      {SOURCE_LABEL[log.source] ?? log.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.user_id ? userMap[log.user_id] ?? "(退会済みユーザー)" : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.message}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {log.detail ? JSON.stringify(log.detail) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-md border border-slate-200 px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            前へ
          </Link>
          <span className="text-slate-500">
            {page} / {pageCount}
          </span>
          <Link
            href={pageHref(Math.min(pageCount, page + 1))}
            aria-disabled={page >= pageCount}
            className={`rounded-md border border-slate-200 px-3 py-1.5 ${
              page >= pageCount ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            次へ
          </Link>
        </div>
      )}
    </div>
  );
}
