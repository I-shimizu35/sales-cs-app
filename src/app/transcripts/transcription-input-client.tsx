"use client";

import { useState } from "react";
import Link from "next/link";
import { Save, History, Clock, FileAudio, Eye, X } from "lucide-react";
import { createTranscript } from "./actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export interface DealOption {
  id: string;
  title: string;
  companyName: string;
}

export interface TranscriptHistoryItem {
  id: string;
  createdAt: string;
  heldAt: string | null;
  dealTitle: string;
  companyName: string;
  length: number;
  rawText: string;
}

interface Props {
  deals: DealOption[];
  history: TranscriptHistoryItem[];
}

function TranscriptDetailModal({
  item,
  onClose,
}: {
  item: TranscriptHistoryItem;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {item.companyName} - {item.dealTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {item.heldAt ?? new Date(item.createdAt).toLocaleDateString("ja-JP")} • 文字数:{" "}
              {item.length.toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.rawText}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <Link href={`/feedback/generate?transcriptId=${item.id}`} className="btn-brand btn-sm">
            FB生成へ進む
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TranscriptionInputClient({ deals, history }: Props) {
  const [viewingItem, setViewingItem] = useState<TranscriptHistoryItem | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <PageHeader title="文字起こしデータの登録" description="商談の文字起こしテキストを保存し、AI生成の対象にします。" />

      {deals.length === 0 ? (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          対象となる案件がまだありません。先に企業詳細ページの「案件・商談履歴」タブから案件を作成してください。
        </div>
      ) : (
        <form action={createTranscript} className="card mb-12 space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="field-label">対象案件</label>
              <select name="deal_id" required className="field">
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} - {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">商談日</label>
              <input type="date" name="held_at" className="field" />
            </div>
          </div>

          <div>
            <label className="field-label">文字起こしテキスト</label>
            <textarea
              name="raw_text"
              required
              placeholder="Zoomなどの文字起こしテキストをここに貼り付けてください..."
              className="field min-h-[400px] resize-y leading-relaxed"
            ></textarea>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">※目安: 10,000文字程度まで</span>
              <button type="submit" className="btn-brand">
                <Save className="h-4 w-4" />
                保存する
              </button>
            </div>
          </div>
        </form>
      )}

      {/* History */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">過去の文字起こしデータ</h2>
        </div>
        {history.length === 0 ? (
          <EmptyState icon={FileAudio} title="まだ登録されていません" />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="group card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-400">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      {item.companyName} - {item.dealTitle}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.heldAt ?? new Date(item.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                      <span>文字数: {item.length.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingItem(item)}
                    className="btn-secondary btn-sm"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    全文を見る
                  </button>
                  <Link
                    href={`/feedback/generate?transcriptId=${item.id}`}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    FB生成へ進む →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingItem && (
        <TranscriptDetailModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
    </div>
  );
}
