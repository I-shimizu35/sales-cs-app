"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { sendStrategyChatMessage, ChatMessage } from "@/app/companies/[id]/strategy-actions";

const INITIAL_PROMPT: Record<"intake" | "positioning", string> = {
  intake:
    "こんにちは。御社の基礎情報を一緒に整理していきます。まず会社名やWebサイトのURLを教えてください(URLがない場合は事業内容で大丈夫です)。",
  positioning:
    "こんにちは。商談戦略を一緒に整えていきます。まずは御社が他社と比べて特に強みだと感じる点を教えてください。",
};

export function StrategyChatPanel({
  companyId,
  step,
  onAdvance,
}: {
  companyId: string;
  step: "intake" | "positioning";
  onAdvance: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    const historyBeforeSend = messages;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    startTransition(async () => {
      const result = await sendStrategyChatMessage(companyId, step, historyBeforeSend, text);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        <div className="flex justify-start">
          <p className="flex max-w-[85%] items-start gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
            {INITIAL_PROMPT[step]}
          </p>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <p className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              入力中...
            </p>
          </div>
        )}
      </div>
      {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
      <div className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="回答を入力(Ctrl/Cmd + Enterで送信)"
          className="field-sm flex-1 resize-none"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !input.trim()}
          className="btn-brand btn-sm shrink-0 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          送信
        </button>
      </div>
      <div className="border-t border-slate-100 p-3">
        <button type="button" onClick={onAdvance} className="btn-secondary btn-sm w-full">
          次のステップへ進む
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
