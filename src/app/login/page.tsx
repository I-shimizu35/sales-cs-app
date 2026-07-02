"use client";

import { Building2, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

const FEATURES = [
  { icon: Sparkles, text: "AIによる商談準備・議事録・FB生成を自動化" },
  { icon: BarChart3, text: "案件状況とスコアをダッシュボードで一元管理" },
  { icon: ShieldCheck, text: "ロール別権限と監査ログでデータを保護" },
];

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert(`ログインに失敗しました: ${error.message}`);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* 左パネル: ブランディング */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 px-14 py-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(90,120,246,0.35), transparent 45%), radial-gradient(circle at 80% 75%, rgba(61,89,224,0.25), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">営業・CS統括システム</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            商談準備から受注後フォローまで、
            <br />
            一気通貫で管理する。
          </h1>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-300">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-brand-300" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} 社内利用専用</p>
      </div>

      {/* 右パネル: ログイン */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">営業・CS統括システム</h1>
          </div>

          <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">おかえりなさい</h2>
          <p className="mb-8 text-sm text-slate-500">
            社内Googleアカウントを使用してログインしてください。
          </p>

          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-brand-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Googleでログイン
          </button>

          <p className="mt-8 text-center text-xs text-slate-400">
            権限が付与されていない場合は、システム管理者へお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
