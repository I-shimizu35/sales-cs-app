"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { verifyClientLogin } from "./actions";

export function ClientLoginForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("password", password);
    startTransition(async () => {
      const result = await verifyClientLogin(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label className="field-label">パスワード</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className="field pl-9"
            placeholder="••••••••"
          />
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button type="submit" disabled={isPending} className="btn-brand w-full disabled:opacity-50">
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
