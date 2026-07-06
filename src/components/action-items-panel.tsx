"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import {
  createActionItem,
  updateActionItem,
  updateActionItemStatus,
  deleteActionItem,
} from "@/app/companies/[id]/action-item-actions";
import { ACTION_ITEM_STATUS_LABEL } from "@/lib/status";
import { AppUser, ActionItem } from "@/lib/types";
import { DealActionItemsGroup } from "@/lib/action-items-data";

function ActionItemRow({
  item,
  dealId,
  users,
}: {
  item: ActionItem;
  dealId: string;
  users: AppUser[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const updateStatusWithId = updateActionItemStatus.bind(null, item.id);
  const updateItemWithId = updateActionItem.bind(null, item.id);
  const deleteWithId = deleteActionItem.bind(null, item.id, dealId);

  if (isEditing) {
    return (
      <form
        action={updateItemWithId}
        onSubmit={() => setIsEditing(false)}
        className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50/50 px-2.5 py-1.5 text-xs"
      >
        <input
          name="title"
          defaultValue={item.title}
          required
          className="field-sm min-w-[180px] flex-1"
        />
        <input name="due_date" type="date" defaultValue={item.due_date} required className="field-sm w-auto" />
        <select name="assignee_id" defaultValue={item.assignee_id ?? ""} className="field-sm w-auto">
          <option value="">担当: 未設定</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary btn-sm" title="更新">
          <Check className="h-3.5 w-3.5" />
          更新
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-slate-400 hover:text-slate-600"
          title="キャンセル"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
      <span className="w-full text-slate-700 sm:w-auto sm:flex-1">{item.title}</span>
      <span className="text-slate-400">
        期日: {item.due_date} • 担当: {users.find((u) => u.id === item.assignee_id)?.name ?? "未設定"}
      </span>
      <form action={updateStatusWithId} className="inline-flex">
        <select
          name="status"
          defaultValue={item.status}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="field-sm w-auto py-1"
        >
          {Object.entries(ACTION_ITEM_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </form>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-slate-400 hover:text-brand-600"
        title="編集"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <form action={deleteWithId}>
        <button type="submit" className="text-slate-400 hover:text-red-600" title="削除">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

export function ActionItemsPanel({
  groups,
  users,
}: {
  groups: DealActionItemsGroup[];
  users: AppUser[];
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">次回アクション</h3>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.dealId} className="card p-4">
            <p className="mb-3 text-xs font-semibold text-slate-500">{group.dealTitle}</p>

            {group.items.length === 0 ? (
              <p className="mb-3 text-xs text-slate-400">次回アクションは登録されていません。</p>
            ) : (
              <div className="mb-3 space-y-2">
                {group.items.map((item) => (
                  <ActionItemRow key={item.id} item={item} dealId={group.dealId} users={users} />
                ))}
              </div>
            )}

            <form action={createActionItem.bind(null, group.dealId)} className="flex flex-wrap items-center gap-2">
              <input
                name="title"
                required
                placeholder="次回アクション(例: 見積提示)"
                className="field-sm min-w-[180px] flex-1"
              />
              <input name="due_date" type="date" required className="field-sm w-auto" />
              <select name="assignee_id" defaultValue="" className="field-sm w-auto">
                <option value="">担当: 未設定</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary btn-sm">
                追加
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
