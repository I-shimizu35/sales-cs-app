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
  Menu,
  X,
  Search,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  function renderNav(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <>
        <div className={`flex items-center gap-2 px-5 py-5 ${isCollapsed ? "justify-center px-0" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
              クライアントポータル
            </span>
          )}
        </div>

        {!isCollapsed && (
          <form action="/client/search" className="px-3 pb-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 focus-within:border-brand-300">
              <button type="submit" title="検索" className="shrink-0 text-slate-400 hover:text-slate-600">
                <Search className="h-3.5 w-3.5" />
              </button>
              <input
                type="text"
                name="q"
                placeholder="案件・リードを検索"
                className="w-full border-0 bg-transparent p-0 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
          </form>
        )}

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-600" : "text-slate-400"}`} />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          {!forceExpanded && (
            <button
              onClick={toggleCollapsed}
              title={isCollapsed ? "サイドバーを広げる" : "サイドバーを折りたたむ"}
              className={`mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
              {!isCollapsed && "折りたたむ"}
            </button>
          )}
          <form action={logoutClient}>
            <button
              type="submit"
              title={isCollapsed ? "ログアウト" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && "ログアウト"}
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      {/* モバイル用トップバー(md未満のみ表示) */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">クライアントポータル</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
          title="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* モバイル用ドロワー */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
                title="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav(true)}
          </aside>
        </div>
      )}

      {/* デスクトップ用サイドバー(md以上のみ表示) */}
      <aside
        className={`hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {renderNav(false)}
      </aside>
    </>
  );
}
