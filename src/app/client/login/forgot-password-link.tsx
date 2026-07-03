"use client";

import { useState, useTransition } from "react";
import { requestClientPasswordReset } from "./actions";

export function ForgotPasswordLink({ slug }: { slug: string }) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRequest() {
    startTransition(async () => {
      await requestClientPasswordReset(slug);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">
        リクエストを送信しました。担当スタッフからの連絡をお待ちください。
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 w-full text-center text-xs text-slate-400 underline hover:text-slate-600"
      >
        パスワードを忘れた方はこちら
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <p className="mb-2 text-xs text-slate-500">
        担当スタッフへ再発行のリクエストを送信します。ご本人確認のうえ、担当者から新しいパスワードをご連絡します。
      </p>
      <button
        type="button"
        onClick={handleRequest}
        disabled={isPending}
        className="btn-secondary btn-sm w-full disabled:opacity-50"
      >
        {isPending ? "送信中..." : "再発行をリクエストする"}
      </button>
    </div>
  );
}
