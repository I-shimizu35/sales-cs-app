import Link from "next/link";
import { requireAdminOrManager } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middlewareで/admin配下はadmin/managerのみに制限済みだが、
  // 直接Server Actionを叩かれた場合等に備えてここでも防御する(defense-in-depth)
  await requireAdminOrManager();

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">管理者設定</h1>
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <Link
            href="/admin/users"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            ユーザー管理
          </Link>
          <Link
            href="/admin/prompts"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            AIプロンプト管理
          </Link>
          <Link
            href="/admin/clients"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            クライアント管理
          </Link>
          <Link
            href="/admin/audit-logs"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            操作履歴
          </Link>
          <Link
            href="/admin/errors"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            エラーログ
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
