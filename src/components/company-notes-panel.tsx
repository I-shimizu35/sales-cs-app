"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { createCompanyNote, deleteCompanyNote } from "@/app/companies/[id]/note-actions";
import { CompanyNote } from "@/lib/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" });
}

export function CompanyNotesPanel({
  companyId,
  notes,
  userNameById,
  currentUserId,
  isManagerOrAdmin,
}: {
  companyId: string;
  notes: CompanyNote[];
  userNameById: Record<string, string>;
  currentUserId: string | null;
  isManagerOrAdmin: boolean;
}) {
  const createWithId = createCompanyNote.bind(null, companyId);

  return (
    <section className="card p-6">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MessageSquare className="h-4 w-4 text-brand-600" />
        社内メモ
      </h3>
      <p className="mb-4 text-xs text-slate-400">担当者間の申し送り事項です。クライアントには表示されません。</p>

      <form action={createWithId} className="mb-5 space-y-2">
        <textarea
          name="body"
          required
          rows={2}
          placeholder="引き継ぎ事項や注意点を記録できます"
          className="field text-sm"
        />
        <div className="flex justify-end">
          <button type="submit" className="btn-secondary btn-sm">
            投稿する
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-xs text-slate-400">まだメモがありません。</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const canDelete = isManagerOrAdmin || note.user_id === currentUserId;
            return (
              <li key={note.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {note.user_id ? userNameById[note.user_id] ?? "不明なユーザー" : "不明なユーザー"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatDateTime(note.created_at)}</span>
                    {canDelete && (
                      <form action={deleteCompanyNote.bind(null, companyId, note.id)}>
                        <button type="submit" className="text-slate-400 hover:text-red-600" title="削除">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
