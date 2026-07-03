"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const ACTION_LABEL: Record<string, string> = {
  create: "作成",
  update: "更新",
  delete: "削除",
  generate: "AI生成",
  export: "エクスポート",
  reflect: "反映",
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  company: "企業",
  deal: "案件",
  lead: "リード",
  action_item: "次回アクション",
  user: "ユーザー",
  prompt: "AIプロンプト",
  transcript: "文字起こし",
  meeting: "商談",
};

export function AuditLogSearchClient({ users }: { users: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["userId", "action", "targetType", "dateFrom", "dateTo"]) {
      const value = formData.get(key);
      if (typeof value === "string" && value !== "") params.set(key, value);
    }
    router.push(`/admin/audit-logs?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="field-label">操作者</label>
        <select name="userId" defaultValue={searchParams.get("userId") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">操作種別</label>
        <select name="action" defaultValue={searchParams.get("action") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {Object.entries(ACTION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">対象種別</label>
        <select name="targetType" defaultValue={searchParams.get("targetType") ?? ""} className="field w-auto">
          <option value="">すべて</option>
          {Object.entries(TARGET_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">期間(開始)</label>
        <input type="date" name="dateFrom" defaultValue={searchParams.get("dateFrom") ?? ""} className="field w-auto" />
      </div>
      <div>
        <label className="field-label">期間(終了)</label>
        <input type="date" name="dateTo" defaultValue={searchParams.get("dateTo") ?? ""} className="field w-auto" />
      </div>
      <button type="submit" className="btn-primary">
        <Search className="h-4 w-4" />
        検索
      </button>
    </form>
  );
}

export { ACTION_LABEL, TARGET_TYPE_LABEL };
