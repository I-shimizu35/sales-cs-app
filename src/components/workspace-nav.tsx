"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function WorkspaceNav({ companyId, companyName }: { companyId: string; companyName: string }) {
  const pathname = usePathname();
  const base = `/companies/${companyId}/workspace`;

  const NAV_ITEMS = [
    { href: `${base}/dashboard`, label: "ダッシュボード" },
    { href: `${base}/deals`, label: "案件管理表" },
    { href: `${base}/leads`, label: "リード一覧" },
    { href: `${base}/analytics`, label: "分析" },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="mb-6">
      <Link
        href={`/companies/${companyId}`}
        className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        企業詳細へ戻る
      </Link>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">{companyName} の管理画面</h1>
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
