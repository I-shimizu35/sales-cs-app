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

        {isManagerOrAdmin && (
          <>
            <div className="my-3 border-t border-slate-100" />
            <Link
              href="/admin"
              title={collapsed ? "管理者設定" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
              } ${isActive("/admin") ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Settings className={`h-4 w-4 shrink-0 ${isActive("/admin") ? "text-brand-600" : "text-slate-400"}`} />
              {!collapsed && "管理者設定"}
            </Link>
          </>
        )}
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
        <div className={`flex items-center rounded-lg px-2 py-1.5 ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          {!collapsed && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {ROLE_LABEL[role]}
            </span>
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
    </aside>
  );
}
