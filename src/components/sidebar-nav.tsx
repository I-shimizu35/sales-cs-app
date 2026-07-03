"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Sparkles,
  History,
  Settings,
  LogOut,
  Building,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理者",
  manager: "マネージャー",
  cs: "CS担当",
  sales: "営業担当",
  support: "支援担当",
};

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/companies", label: "企業一覧", icon: Building2 },
  { href: "/calendar", label: "アクションカレンダー", icon: CalendarDays },
  { href: "/transcripts/new", label: "文字起こし入力", icon: FileText },
  { href: "/feedback/generate", label: "商談FB生成", icon: Sparkles },
  { href: "/reports", label: "生成履歴", icon: History },
];

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const isManagerOrAdmin = role === "admin" || role === "manager";
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

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
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
              営業・CS統括システム
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

          {isManagerOrAdmin && (
            <>
              <div className="my-3 border-t border-slate-100" />
              <Link
                href="/admin"
                title={isCollapsed ? "管理者設定" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${isActive("/admin") ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Settings className={`h-4 w-4 shrink-0 ${isActive("/admin") ? "text-brand-600" : "text-slate-400"}`} />
                {!isCollapsed && "管理者設定"}
              </Link>
            </>
          )}
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
          <div className={`flex items-center rounded-lg px-2 py-1.5 ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
            {!isCollapsed && (
              <Link
                href="/profile"
                title="プロフィール設定"
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                {ROLE_LABEL[role]}
              </Link>
            )}
            <button
              onClick={handleLogout}
              title="ログアウト"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
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
          <span className="text-sm font-semibold tracking-tight text-slate-900">営業・CS統括システム</span>
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
