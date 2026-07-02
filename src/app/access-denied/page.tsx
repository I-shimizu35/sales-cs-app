"use client";

import { AlertTriangle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

export default function AccessDeniedPage() {
  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
          アクセス権限がありません
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          このアカウントにはまだ利用権限が付与されていません。システム管理者に、利用しているGoogleアカウントのメールアドレスを伝えて登録を依頼してください。
        </p>
        <button onClick={handleLogout} className="btn-secondary w-full">
          ログアウトする
        </button>
      </div>
    </div>
  );
}
