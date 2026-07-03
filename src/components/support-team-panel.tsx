"use client";

import { X } from "lucide-react";
import { updateSupportStatus, updateSupportPhase, addSupporter, removeSupporter } from "@/app/companies/actions";
import { SUPPORT_STATUS_LABEL, SUPPORT_PHASE_LABEL, SUPPORT_PHASE_ORDER } from "@/lib/status";
import { AppUser, SupportStatus, SupportPhase } from "@/lib/types";

export function SupportTeamPanel({
  companyId,
  supportStatus,
  supportPhase,
  supporters,
  users,
}: {
  companyId: string;
  supportStatus: SupportStatus;
  supportPhase: SupportPhase;
  supporters: { id: string; user_id: string }[];
  users: AppUser[];
}) {
  const updateStatusWithId = updateSupportStatus.bind(null, companyId);
  const updatePhaseWithId = updateSupportPhase.bind(null, companyId);
  const addSupporterWithId = addSupporter.bind(null, companyId);
  const assignedUserIds = new Set(supporters.map((s) => s.user_id));
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));

  return (
    <section className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">支援状況</h3>

      <div className="mb-5">
        <label className="field-label">支援フェーズ</label>
        <form action={updatePhaseWithId}>
          <select
            name="support_phase"
            defaultValue={supportPhase}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="field w-auto"
          >
            {SUPPORT_PHASE_ORDER.map((phase) => (
              <option key={phase} value={phase}>
                {SUPPORT_PHASE_LABEL[phase]}
              </option>
            ))}
          </select>
        </form>
      </div>

      <div className="mb-5">
        <label className="field-label">支援ステータス</label>
        <form action={updateStatusWithId}>
          <select
            name="support_status"
            defaultValue={supportStatus}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="field w-auto"
          >
            {Object.entries(SUPPORT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </form>
      </div>

      <div>
        <label className="field-label">支援担当者</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {supporters.length === 0 && <p className="text-xs text-slate-400">まだ誰もアサインされていません。</p>}
          {supporters.map((s) => {
            const user = users.find((u) => u.id === s.user_id);
            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700"
              >
                {user?.name ?? "不明なユーザー"}
                <form action={removeSupporter.bind(null, s.id, companyId)}>
                  <button type="submit" className="text-slate-400 hover:text-red-600" title="解除">
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </span>
            );
          })}
        </div>
        {availableUsers.length > 0 && (
          <form action={addSupporterWithId} className="flex items-center gap-2">
            <select name="user_id" defaultValue="" required className="field w-auto">
              <option value="" disabled>
                担当者を選択
              </option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary btn-sm">
              追加
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
