"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

const STORAGE_KEY = "client-deals-onboarding-dismissed";

export function ClientOnboardingBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">案件管理表の使い方</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-brand-700">
          <li>上部の「新規案件を追加」から、案件名を入力して案件を作成できます。</li>
          <li>各セルは直接入力できます。行の左端にある「更新」ボタンで、その行の変更内容が保存されます。</li>
          <li>「商談FB」欄は担当スタッフが入力する項目のため、編集はできません。</li>
          <li>右上の「表示列」から、必要な列だけを表示するように絞り込めます。</li>
        </ul>
      </div>
      <button type="button" onClick={handleDismiss} className="shrink-0 text-brand-400 hover:text-brand-700" title="閉じる">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
