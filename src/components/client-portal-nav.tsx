"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Target,
  BarChart3,
  LogOut,
  Building,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { logoutClient } from "@/app/client/login/actions";

const NAV_ITEMS = [
  { href: "/client/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/client/deals", label: "案件管理", icon: Briefcase },
  { href: "/client/leads", label: "リード一覧", icon: Target },
  { href: "/client/analytics", label: "分析", icon: BarChart3 },
];

const COLLAPSE_STORAGE_KEY = "client-sidebar-collapsed";

export function ClientPortalNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className={`flex items-center gap-2 px-5 py-5 ${collapsed ? "justify-center px-0" : ""}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Building className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
            クライアントポータル
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
              } ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-600" : "text-slate-400"}`} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "サイドバーを広げる" : "サイドバーを折りたたむ"}
          className={`mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && "折りたたむ"}
        </button>
        <form action={logoutClient}>
          <button
            type="submit"
            title={collapsed ? "ログアウト" : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "ログアウト"}
          </button>
        </form>
      </div>
    </aside>
  );
}
