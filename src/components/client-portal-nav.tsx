"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Target, BarChart3, LogOut, Building } from "lucide-react";
import { logoutClient } from "@/app/client/login/actions";

const NAV_ITEMS = [
  { href: "/client/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/client/deals", label: "案件管理", icon: Briefcase },
  { href: "/client/leads", label: "リード一覧", icon: Target },
  { href: "/client/analytics", label: "分析", icon: BarChart3 },
];

export function ClientPortalNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Building className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          クライアントポータル
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? "text-brand-600" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <form action={logoutClient}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}
