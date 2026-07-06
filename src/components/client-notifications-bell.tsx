"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/app/client/notifications-actions";
import { ClientNotification } from "@/lib/client-notifications";

export function ClientNotificationsBell({ notifications }: { notifications: ClientNotification[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();
  const unreadCount = items.filter((n) => !n.read_at).length;

  function handleItemClick(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    startTransition(async () => {
      await markNotificationRead(id).catch(() => {});
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    startTransition(async () => {
      await markAllNotificationsRead().catch(() => {});
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
        title="通知"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-900">通知</span>
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:underline">
                  全て既読にする
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">通知はありません</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n.id)}
                    className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left text-xs last:border-b-0 hover:bg-slate-50 ${
                      n.read_at ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    <p className={n.read_at ? "" : "font-medium"}>{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString("ja-JP")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
