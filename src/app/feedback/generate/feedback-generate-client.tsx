"use client";

import { useState, useTransition } from "react";
import { FileText, Sparkles, CheckCircle2, Target, BarChart3, MessageSquareText, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { storeFeedbackToDeal } from "./actions";

export interface TranscriptOption {
  id: string;
  label: string;
}

interface BantField {
  result: string;
  evidence: string;
}
interface BantResult {
  budget: BantField;
  authority: BantField;
  need: BantField;
  timeline: BantField;
}
interface MeetingMinutes {
  participants: string[];
  agenda: string[];
  decisions: string[];
  concerns: string[];
  homework: string[];
}
interface NextProposalPolicy {
  next_goal: string;
  key_points: string[];
  expected_obstacles: string[];
  materials_needed: string[];
}
interface TemperatureScore {
  score: number;
  positive_factors: string[];
  negative_factors: string[];
}
interface WinProbability {
  win_probability: number;
  reasoning: string;
  risk_factors: string[];
}
interface ForecastReflection {
  summary_for_forecast: string;
  recommended_next_action: string;
  confidence_note: string;
}
interface DealSheetReflection {
  customer_issues_update: string;
  proposal_content_update: string;
  concerns_update: string;
  follow_up_policy_update: string;
}

interface GenerateResults {
  meeting_minutes?: MeetingMinutes;
  next_proposal_policy?: NextProposalPolicy;
  bant_judgement?: BantResult;
  temperature_score?: TemperatureScore;
  win_probability?: WinProbability;
  reinforcement_fb?: { good_points: { point: string; evidence: string; how_to_repeat: string }[] };
  correction_fb?: { improvement_points: { point: string; evidence: string; action: string }[] };
  forecast_reflection?: ForecastReflection;
  deal_sheet_reflection?: DealSheetReflection;
}

const BANT_LABELS: { key: keyof BantResult; title: string }[] = [
  { key: "budget", title: "Budget (予算)" },
  { key: "authority", title: "Authority (決裁権)" },
  { key: "need", title: "Needs (必要性)" },
  { key: "timeline", title: "Timeframe (時期)" },
];

function formatFeedbackText(results: GenerateResults): string {
  const parts: string[] = [];
  if (results.reinforcement_fb?.good_points?.length) {
    parts.push("【行動強化】");
    for (const p of results.reinforcement_fb.good_points) {
      parts.push(`・${p.point}\n  根拠: ${p.evidence}\n  再現方法: ${p.how_to_repeat}`);
    }
  }
  if (results.correction_fb?.improvement_points?.length) {
    parts.push("【行動是正】");
    for (const p of results.correction_fb.improvement_points) {
      parts.push(`・${p.point}\n  根拠: ${p.evidence}\n  改善アクション: ${p.action}`);
    }
  }
  return parts.join("\n\n");
}

export function FeedbackGenerateClient({
  transcripts,
  initialTranscriptId,
}: {
  transcripts: TranscriptOption[];
  initialTranscriptId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    initialTranscriptId ?? transcripts[0]?.id ?? ""
  );
  const [status, setStatus] = useState<"IDLE" | "GENERATING" | "DONE" | "ERROR">("IDLE");
  const [results, setResults] = useState<GenerateResults>({});
  const [error, setError] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);
  const [isStoring, startStoring] = useTransition();
  const [stored, setStored] = useState(false);

  async function handleGenerate() {
    if (!selectedId) return;
    setStatus("GENERATING");
    setError(null);
    setStored(false);
    try {
      const res = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResults(json.results ?? {});
        setDealId(json.dealId ?? null);
        throw new Error(json.error ?? "生成に失敗しました。");
      }
      setResults(json.results ?? {});
      setDealId(json.dealId ?? null);
      setStatus("DONE");
    } catch (e) {
      setError((e as Error).message);
      setStatus("ERROR");
    }
  }

  function handleStoreFeedback() {
    if (!dealId) return;
    const text = formatFeedbackText(results);
    startStoring(async () => {
      try {
        await storeFeedbackToDeal(dealId, text);
        setStored(true);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="商談フィードバック生成"
        description="文字起こしデータから、議事録やネクストアクション、BANT判定を自動生成します。"
      />

      {transcripts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          文字起こしデータがまだありません。先に「文字起こし入力」から登録してください。
        </div>
      ) : (
        <div className="card mb-8 p-6">
          <div className="flex flex-col items-end gap-4 md:flex-row">
            <div className="w-full flex-1">
              <label className="field-label">対象の文字起こしデータ</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field">
                {transcripts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={status === "GENERATING"}
              className="btn-brand w-full disabled:bg-slate-300 md:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {status === "GENERATING" ? "一括生成中..." : "AIで一括生成"}
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">エラー: {error}</p>}
        </div>
      )}

      {(status === "DONE" || status === "ERROR") && Object.keys(results).length > 0 && (
        <div className="space-y-8">
          {/* 議事録・次回提案方針 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {results.meeting_minutes && (
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">議事録サマリ</h3>
                </div>
                <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-700">
                  <MinutesSection title="決定事項" items={results.meeting_minutes.decisions} />
                  <MinutesSection title="懸念点" items={results.meeting_minutes.concerns} />
                  <MinutesSection title="宿題" items={results.meeting_minutes.homework} />
                </div>
              </div>
            )}
            {results.next_proposal_policy && (
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                  <Target className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">次回提案方針</h3>
                </div>
                <div className="p-5 text-sm leading-relaxed text-slate-700">
                  <p className="mb-2 font-medium text-slate-900">
                    {results.next_proposal_policy.next_goal}
                  </p>
                  <MinutesSection title="重点ポイント" items={results.next_proposal_policy.key_points} />
                  <MinutesSection
                    title="想定される障壁"
                    items={results.next_proposal_policy.expected_obstacles}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BANT判定 */}
          {results.bant_judgement && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                BANT判定結果
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {BANT_LABELS.map(({ key, title }) => {
                  const field = results.bant_judgement![key];
                  return (
                    <div key={key} className="card flex h-full flex-col p-4">
                      <span className="mb-2 text-xs font-semibold text-slate-500">{title}</span>
                      <span className="mb-3 inline-block w-max rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {field?.result ?? "不明"}
                      </span>
                      <p className="mt-auto text-xs leading-relaxed text-slate-600">
                        {field?.evidence ?? ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 商談FB */}
          {(results.reinforcement_fb || results.correction_fb) && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageSquareText className="h-4 w-4 text-brand-600" />
                  商談FB
                </h3>
                <button
                  onClick={handleStoreFeedback}
                  disabled={!dealId || isStoring}
                  className="btn-brand btn-sm disabled:opacity-50"
                >
                  {stored ? <Check className="h-3.5 w-3.5" /> : null}
                  {isStoring ? "格納中..." : stored ? "格納済み" : "この案件に格納"}
                </button>
              </div>
              <div className="card grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                {results.reinforcement_fb && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-emerald-700">行動強化</h4>
                    <div className="space-y-3">
                      {results.reinforcement_fb.good_points.map((p, i) => (
                        <div key={i} className="rounded-lg bg-emerald-50/60 p-3 text-xs leading-relaxed text-slate-700">
                          <p className="mb-1 font-medium text-slate-900">{p.point}</p>
                          <p className="text-slate-500">根拠: {p.evidence}</p>
                          <p className="text-slate-500">再現方法: {p.how_to_repeat}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {results.correction_fb && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-amber-700">行動是正</h4>
                    <div className="space-y-3">
                      {results.correction_fb.improvement_points.map((p, i) => (
                        <div key={i} className="rounded-lg bg-amber-50/60 p-3 text-xs leading-relaxed text-slate-700">
                          <p className="mb-1 font-medium text-slate-900">{p.point}</p>
                          <p className="text-slate-500">根拠: {p.evidence}</p>
                          <p className="text-slate-500">改善アクション: {p.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* スコア */}
          {(results.temperature_score || results.win_probability) && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BarChart3 className="h-4 w-4 text-brand-600" />
                スコア分析
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-normal text-amber-700">
                  AI生成(未確認) ・ マネージャー承認前
                </span>
              </h3>
              <div className="card grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                {results.temperature_score && (
                  <ScoreBar
                    label="温度感スコア"
                    value={results.temperature_score.score}
                    max={100}
                    color="bg-brand-500"
                    note={results.temperature_score.positive_factors.join(" / ")}
                  />
                )}
                {results.win_probability && (
                  <ScoreBar
                    label="受注確度 (AI予測)"
                    value={results.win_probability.win_probability}
                    max={100}
                    suffix="%"
                    color="bg-emerald-500"
                    note={results.win_probability.reasoning}
                  />
                )}
              </div>
            </section>
          )}

          {/* ヨミ表・案件管理表への反映案 */}
          {(results.forecast_reflection || results.deal_sheet_reflection) && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-brand-600" />
                ヨミ表・案件管理表への反映案
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-normal text-amber-700">
                  AI生成(反映は手動でご確認の上コピーしてください)
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {results.forecast_reflection && (
                  <div className="card p-5 text-sm leading-relaxed text-slate-700">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">ヨミ表反映(週次報告用要約)</h4>
                    <p className="mb-2 font-medium text-slate-900">
                      {results.forecast_reflection.summary_for_forecast}
                    </p>
                    <p className="mb-1 text-xs text-slate-500">
                      次の対応: {results.forecast_reflection.recommended_next_action}
                    </p>
                    <p className="text-xs text-slate-400">
                      確度の根拠: {results.forecast_reflection.confidence_note}
                    </p>
                  </div>
                )}
                {results.deal_sheet_reflection && (
                  <div className="card p-5 text-sm leading-relaxed text-slate-700">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">案件管理表反映案</h4>
                    <p className="mb-1">
                      <span className="text-xs font-semibold text-slate-500">顧客課題: </span>
                      {results.deal_sheet_reflection.customer_issues_update}
                    </p>
                    <p className="mb-1">
                      <span className="text-xs font-semibold text-slate-500">提案内容: </span>
                      {results.deal_sheet_reflection.proposal_content_update}
                    </p>
                    <p className="mb-1">
                      <span className="text-xs font-semibold text-slate-500">懸念点: </span>
                      {results.deal_sheet_reflection.concerns_update}
                    </p>
                    <p>
                      <span className="text-xs font-semibold text-slate-500">フォロー方針: </span>
                      {results.deal_sheet_reflection.follow_up_policy_update}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MinutesSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="text-xs font-bold text-slate-500">{title}</span>
      <ul className="ml-4 mt-1 list-disc space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
  note,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note?: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-2xl font-semibold text-slate-900">
          {value}
          <span className="text-sm font-normal text-slate-500">
            /{max}
            {suffix}
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
