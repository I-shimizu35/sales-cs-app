"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mb-2 text-lg font-semibold text-slate-900">問題が発生しました</h1>
      <p className="mb-6 max-w-md text-sm text-slate-500">{error.message || "予期しないエラーが発生しました。"}</p>
      <button onClick={reset} className="btn-primary">
        もう一度試す
      </button>
    </div>
  );
}
