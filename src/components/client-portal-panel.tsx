"use client";

import { useState, useTransition } from "react";
import { KeyRound, Copy, Check } from "lucide-react";
import { enableClientPortal, disableClientPortal, ClientPortalCredentials } from "@/app/companies/actions";

export function ClientPortalPanel({
  companyId,
  portalEnabled,
}: {
  companyId: string;
  portalEnabled: boolean;
}) {
  const [credentials, setCredentials] = useState<ClientPortalCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "password" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await enableClientPortal(companyId);
        setCredentials(result);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      try {
        await disableClientPortal(companyId);
        setCredentials(null);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function copy(value: string, which: "url" | "password") {
    navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-brand-600" />
          クライアントポータル
        </h3>
        <span
          className={`badge ${
            portalEnabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {portalEnabled ? "有効" : "未発行"}
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        発行すると専用ログインURLとパスワードが生成されます。クライアントへ共有してください。再発行すると古いURL・パスワードは無効になります。
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">エラー: {error}</p>}

      {credentials ? (
        <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">
            この内容は今だけ表示されます。必ずコピーしてクライアントへ共有してください。
          </p>
          <div>
            <label className="mb-1 block text-xs text-amber-700">ログインURL</label>
            <div className="flex items-center gap-2">
              <input readOnly value={credentials.loginUrl} className="field font-mono text-xs" />
              <button
                type="button"
                onClick={() => copy(credentials.loginUrl, "url")}
                className="btn-secondary btn-sm shrink-0"
              >
                {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-amber-700">パスワード</label>
            <div className="flex items-center gap-2">
              <input readOnly value={credentials.password} className="field font-mono text-xs" />
              <button
                type="button"
                onClick={() => copy(credentials.password, "password")}
                className="btn-secondary btn-sm shrink-0"
              >
                {copied === "password" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={handleEnable} disabled={isPending} className="btn-secondary btn-sm disabled:opacity-50">
          {portalEnabled ? "URL・パスワードを再発行" : "クライアントポータルを有効化"}
        </button>
        {portalEnabled && (
          <button
            type="button"
            onClick={handleDisable}
            disabled={isPending}
            className="btn-ghost btn-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            無効化
          </button>
        )}
      </div>
    </section>
  );
}
