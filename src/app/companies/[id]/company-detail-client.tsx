"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Download,
  Paperclip,
  Target,
} from "lucide-react";
import { Company, GeneratedReport, ReportType, AppUser, CompanyNote } from "@/lib/types";
import { LeadsTableRow } from "@/components/leads-table";
import { getSupportState, SUPPORT_STATE_LABEL, SUPPORT_STATE_BADGE_CLASS } from "@/lib/status";
import { GeneratedContentView } from "@/components/generated-content-view";
import { EmptyState } from "@/components/empty-state";
import { ClientPortalPanel } from "@/components/client-portal-panel";
import { SupportTeamPanel } from "@/components/support-team-panel";
import { CompanyNotesPanel } from "@/components/company-notes-panel";
import { StrategyChatPanel } from "@/components/strategy-chat-panel";
import { InlineAlert } from "@/components/inline-alert";
import { StrategyExtractionPanel } from "@/components/strategy-extraction-panel";
import { StrategyPrincipleChart } from "@/components/strategy-principle-chart";
import { updateCompany, exportCompanyDataJson } from "../actions";
import {
  uploadStrategyReferenceDoc,
  generatePrincipleScores,
  generateAbmRecommendation,
  AbmRecommendation,
} from "./strategy-actions";

type TabType = "basic" | "prep";

const PREP_REPORTS: { type: ReportType; label: string }[] = [
  { type: "company_analysis", label: "企業分析" },
  { type: "industry_analysis", label: "業界分析" },
  { type: "distribution_analysis", label: "商流分析" },
  { type: "profit_structure_analysis", label: "収益構造分析" },
  { type: "assumed_issues", label: "想定課題" },
  { type: "hearing_items", label: "ヒアリング項目" },
  { type: "talk_script", label: "商談トーク" },
  { type: "qa_list", label: "Q&Aリスト" },
];

interface Props {
  company: Company;
  generatedReports: GeneratedReport[];
  users: AppUser[];
  supporters: { id: string; user_id: string }[];
  notes: CompanyNote[];
  leads: LeadsTableRow[];
  userNameById: Record<string, string>;
  currentUserId: string | null;
  canEditCompany: boolean;
  isManagerOrAdmin: boolean;
  initialSaved?: boolean;
  isNewlyCreated?: boolean;
}

export function CompanyDetailClient({
  company,
  generatedReports,
  users,
  supporters,
  notes,
  leads,
  userNameById,
  currentUserId,
  canEditCompany,
  isManagerOrAdmin,
  initialSaved,
  isNewlyCreated,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [showSavedBanner, setShowSavedBanner] = useState(!!initialSaved);
  const [showNewBanner, setShowNewBanner] = useState(!!isNewlyCreated);
  const [loadingType, setLoadingType] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 商談戦略設計(AI)
  const [strategyStep, setStrategyStep] = useState<"intake" | "positioning" | "abm">("intake");
  const [isUploadingDoc, startUploadDocTransition] = useTransition();
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);
  const [isScoringPending, startScoringTransition] = useTransition();
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [scoringSummary, setScoringSummary] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [prospectName, setProspectName] = useState("");
  const [prospectNotes, setProspectNotes] = useState("");
  const [abmResult, setAbmResult] = useState<AbmRecommendation | null>(null);
  const [isAbmPending, startAbmTransition] = useTransition();
  const [abmError, setAbmError] = useState<string | null>(null);

  function handleUploadReferenceDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadDocError(null);
    const formData = new FormData();
    formData.set("file", file);
    startUploadDocTransition(async () => {
      const result = await uploadStrategyReferenceDoc(company.id, formData);
      if ("error" in result) {
        setUploadDocError(result.error);
      } else {
        router.refresh();
      }
    });
    e.target.value = "";
  }

  function handleGenerateScores() {
    setScoringError(null);
    startScoringTransition(async () => {
      const result = await generatePrincipleScores(company.id);
      if ("error" in result) {
        setScoringError(result.error);
      } else {
        setScoringSummary(result.summary);
        router.refresh();
      }
    });
  }

  function handleSelectLead(leadId: string) {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    setProspectName(lead.lead_company_name);
    setProspectNotes(
      [lead.activity_summary, lead.last_approach_result].filter(Boolean).join(" / ") || ""
    );
  }

  function handleGenerateAbm() {
    setAbmError(null);
    setAbmResult(null);
    startAbmTransition(async () => {
      const result = await generateAbmRecommendation(company.id, {
        name: prospectName,
        notes: prospectNotes,
        leadId: selectedLeadId || null,
      });
      if ("error" in result) {
        setAbmError(result.error);
      } else {
        setAbmResult(result);
      }
    });
  }

  async function handleExportJson() {
    setIsExporting(true);
    try {
      const data = await exportCompanyDataJson(company.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${company.name}_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  function dismissNewBanner() {
    setShowNewBanner(false);
    router.replace(`/companies/${company.id}`, { scroll: false });
  }

  // 保存完了直後(?saved=1付きでリダイレクトされてきた場合)にバナーを表示し、
  // 数秒後に自動で消してURLからクエリパラメータを取り除く
  useEffect(() => {
    if (initialSaved) {
      const timer = setTimeout(() => {
        setShowSavedBanner(false);
        router.replace(`/companies/${company.id}`, { scroll: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [initialSaved, company.id, router]);

  // report_typeごとに最新の生成結果だけを保持する
  const [latestReports, setLatestReports] = useState<Partial<Record<ReportType, GeneratedReport>>>(
    () => {
      const map: Partial<Record<ReportType, GeneratedReport>> = {};
      for (const r of generatedReports) {
        if (!map[r.report_type] || map[r.report_type]!.created_at < r.created_at) {
          map[r.report_type] = r;
        }
      }
      return map;
    }
  );

  const hasAnyReport = useMemo(() => Object.keys(latestReports).length > 0, [latestReports]);
  const updateCompanyWithId = updateCompany.bind(null, company.id);

  async function handleGenerate(reportType: ReportType) {
    setLoadingType(reportType);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "company",
          targetId: company.id,
          reportType,
          variables: {
            company_name: company.name,
            url: company.url ?? "",
            industry: company.industry ?? "",
            business_summary: company.business_summary ?? "",
            current_issues: company.current_issues ?? "",
            goals: company.goals ?? "",
            support_purpose: company.support_purpose ?? "",
            company_analysis: latestReports.company_analysis
              ? JSON.stringify(latestReports.company_analysis.content)
              : "",
            meeting_phase: "初回",
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "生成に失敗しました。");
      setLatestReports((prev) => ({ ...prev, [reportType]: json.report as GeneratedReport }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-10">
      <Link
        href="/companies"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        企業一覧へ戻る
      </Link>

      {showSavedBanner && <InlineAlert variant="success">保存しました</InlineAlert>}

      {showNewBanner && (
        <InlineAlert variant="info" onDismiss={dismissNewBanner}>
          <p className="font-medium">企業を登録しました。次にやることの例:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-brand-700">
            <li>下の「支援状況」で支援担当者をアサインする</li>
            <li>クライアント自身に使ってもらう場合は「クライアントポータル」を有効化する</li>
            <li>案件の記録を始める場合は上の「この企業の管理画面に入る」から案件管理表へ</li>
          </ul>
        </InlineAlert>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{company.name}</h1>
              {(() => {
                const state = getSupportState(company.support_status, company.support_phase);
                return (
                  <span className={`badge ${SUPPORT_STATE_BADGE_CLASS[state]}`}>{SUPPORT_STATE_LABEL[state]}</span>
                );
              })()}
            </div>
            <p className="text-sm text-slate-500">
              業種: {company.industry ?? "未設定"} • 主担当(社内):{" "}
              {users.find((u) => u.id === company.owner_user_id)?.name ?? "未設定"} • 最終更新:{" "}
              {new Date(company.updated_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>
        <Link href={`/companies/${company.id}/workspace/dashboard`} className="btn-brand shrink-0">
          この企業の管理画面に入る
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { id: "basic", label: "基本情報" },
            { id: "prep", label: "商談準備 (AI)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-brand-600" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {/* 基本情報タブ */}
        {activeTab === "basic" && (
          <form action={updateCompanyWithId} className="space-y-8">
            {!canEditCompany && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                この企業の担当者ではないため、編集はできません(閲覧のみ)。
              </p>
            )}
            <section className="card p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">企業情報</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="field-label">会社名</label>
                  <input name="name" defaultValue={company.name} required disabled={!canEditCompany} className="field" />
                </div>
                <div>
                  <label className="field-label">主担当(社内)</label>
                  {users.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-2 text-xs text-slate-400">
                      <Link href="/admin/users" className="text-brand-600 underline">
                        ユーザー管理
                      </Link>
                      から先に担当者を登録してください。
                    </p>
                  ) : (
                    <select
                      name="owner_user_id"
                      defaultValue={company.owner_user_id ?? ""}
                      disabled={!canEditCompany || !isManagerOrAdmin}
                      className="field"
                    >
                      <option value="">未設定</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="field-label">業種</label>
                  <input name="industry" defaultValue={company.industry ?? ""} disabled={!canEditCompany} className="field" />
                </div>
                <div>
                  <label className="field-label">URL</label>
                  <input name="url" defaultValue={company.url ?? ""} disabled={!canEditCompany} className="field" />
                </div>
                <div>
                  <label className="field-label">所在地</label>
                  <input name="location" defaultValue={company.location ?? ""} disabled={!canEditCompany} className="field" />
                </div>
                <div>
                  <label className="field-label">通知先メールアドレス</label>
                  <input
                    type="email"
                    name="notification_email"
                    defaultValue={company.notification_email ?? ""}
                    disabled={!canEditCompany}
                    placeholder="client@example.com"
                    className="field"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    商談FBが届いた際などにこのアドレスへ通知メールを送信します。未入力の場合は通知しません。
                  </p>
                </div>
                <div>
                  <label className="field-label">契約開始日</label>
                  <input
                    type="date"
                    name="contract_start"
                    defaultValue={company.contract_start ?? ""}
                    disabled={!canEditCompany}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">契約終了日(更新予定日)</label>
                  <input
                    type="date"
                    name="contract_end"
                    defaultValue={company.contract_end ?? ""}
                    disabled={!canEditCompany}
                    className="field"
                  />
                  <p className="mt-1 text-xs text-slate-400">残り60日以内になるとダッシュボードに更新リマインドが表示されます。</p>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="mb-2 text-xs font-semibold text-slate-500">案件テンプレート(新規案件作成時のデフォルト値)</h4>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="field-label">デフォルト案件区分</label>
                    <input
                      name="default_deal_category"
                      defaultValue={company.default_deal_category ?? ""}
                      disabled={!canEditCompany}
                      placeholder="例: 新規導入"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">デフォルト流入経路</label>
                    <input
                      name="default_lead_source"
                      defaultValue={company.default_lead_source ?? ""}
                      disabled={!canEditCompany}
                      placeholder="例: マッチング"
                      className="field"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">設定すると、この企業で新規案件を追加した際に自動で入力されます。</p>
              </div>
              <div className="mt-6">
                <label className="field-label">事業内容</label>
                <textarea
                  name="business_summary"
                  defaultValue={company.business_summary ?? ""}
                  rows={3}
                  disabled={!canEditCompany}
                  className="field"
                />
              </div>
              <div className="mt-6">
                <h4 className="mb-2 text-xs font-semibold text-slate-500">
                  商談戦略設計データ(「商談準備(AI)」タブのチャットで自動入力されます)
                </h4>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="field-label">設立年</label>
                    <input
                      type="number"
                      name="founded_year"
                      defaultValue={company.founded_year ?? ""}
                      disabled={!canEditCompany}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">従業員数</label>
                    <input
                      type="number"
                      name="employee_count"
                      defaultValue={company.employee_count ?? ""}
                      disabled={!canEditCompany}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">顧客層</label>
                    <input
                      name="target_customer_profile"
                      defaultValue={company.target_customer_profile ?? ""}
                      disabled={!canEditCompany}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">料金プラン</label>
                    <input
                      name="pricing_plan"
                      defaultValue={company.pricing_plan ?? ""}
                      disabled={!canEditCompany}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">差別化要因</label>
                    <input
                      name="key_differentiators"
                      defaultValue={company.key_differentiators ?? ""}
                      disabled={!canEditCompany}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label">訴求軸</label>
                    <input
                      name="appeal_axis"
                      defaultValue={company.appeal_axis ?? ""}
                      disabled={!canEditCompany}
                      placeholder="例: コスト削減/成長投資/リスク回避/運用改善"
                      className="field"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>購買心理7原則スコア:</span>
                  {company.principle_scores ? (
                    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">算定済み</span>
                  ) : (
                    <span className="badge border-slate-100 bg-slate-50 text-slate-400">未算定</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("prep")}
                    className="text-brand-600 underline hover:no-underline"
                  >
                    商談準備(AI)タブで確認・算出する
                  </button>
                </div>
              </div>
            </section>
            <section className="card p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">目標・課題設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="field-label">支援目的</label>
                  <textarea
                    name="support_purpose"
                    defaultValue={company.support_purpose ?? ""}
                    rows={2}
                    disabled={!canEditCompany}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">現状課題</label>
                  <textarea
                    name="current_issues"
                    defaultValue={company.current_issues ?? ""}
                    rows={3}
                    disabled={!canEditCompany}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">目標</label>
                  <textarea name="goals" defaultValue={company.goals ?? ""} rows={3} disabled={!canEditCompany} className="field" />
                </div>
              </div>
              {canEditCompany && (
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="btn-brand">
                    保存する
                  </button>
                </div>
              )}
            </section>
          </form>
        )}

        {activeTab === "basic" && canEditCompany && (
          <div className="mt-8">
            <SupportTeamPanel
              companyId={company.id}
              supportStatus={company.support_status}
              supportPhase={company.support_phase}
              supporters={supporters}
              users={users}
            />
          </div>
        )}

        {activeTab === "basic" && (
          <div className="mt-8">
            <CompanyNotesPanel
              companyId={company.id}
              notes={notes}
              userNameById={userNameById}
              currentUserId={currentUserId}
              isManagerOrAdmin={isManagerOrAdmin}
            />
          </div>
        )}

        {activeTab === "basic" && isManagerOrAdmin && (
          <div className="mt-8">
            <ClientPortalPanel companyId={company.id} portalEnabled={company.client_portal_enabled} />
          </div>
        )}

        {activeTab === "basic" && canEditCompany && (
          <div className="mt-8 card p-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">データエクスポート</h3>
            <p className="mb-3 text-xs text-slate-500">
              この企業の企業情報・案件・リード・次回アクションを1つのJSONファイルとしてダウンロードします。バックアップや他システムへの移行にご利用ください(復元機能はありません)。
            </p>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={isExporting}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              全データをJSONでエクスポート
            </button>
          </div>
        )}

        {/* 商談準備タブ */}
        {activeTab === "prep" && (
          <div>
            {/* 商談戦略設計(AI) */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Target className="h-4 w-4 text-brand-600" />
                商談戦略設計(AI)
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                チャット形式で企業情報・商談戦略をヒアリングし、購買心理7原則のスコアと
                商談相手ごとの見せ方を提案します。
              </p>

              <div className="mb-5 flex gap-1.5 border-b border-slate-100">
                {(
                  [
                    { key: "intake", label: "① 企業情報" },
                    { key: "positioning", label: "② 商談戦略" },
                    { key: "abm", label: "③ 個社相関(ABM)" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStrategyStep(s.key)}
                    className={`relative px-3 py-2 text-xs font-medium transition-colors ${
                      strategyStep === s.key ? "text-brand-700" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {s.label}
                    {strategyStep === s.key && (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />
                    )}
                  </button>
                ))}
              </div>

              {strategyStep === "intake" && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                  <StrategyChatPanel
                    companyId={company.id}
                    step="intake"
                    onAdvance={() => setStrategyStep("positioning")}
                  />
                  <StrategyExtractionPanel
                    fields={[
                      { label: "会社名", value: company.name },
                      { label: "URL", value: company.url },
                      { label: "設立年", value: company.founded_year },
                      { label: "従業員数", value: company.employee_count },
                      { label: "事業内容", value: company.business_summary },
                      { label: "顧客層", value: company.target_customer_profile },
                      { label: "現状課題", value: company.current_issues },
                      { label: "料金プラン", value: company.pricing_plan },
                    ]}
                  />
                </div>
              )}

              {strategyStep === "positioning" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed border-slate-200 p-4">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-600">
                      <Paperclip className="h-3.5 w-3.5" />
                      {isUploadingDoc
                        ? "アップロード・内容解析中..."
                        : company.strategy_reference_doc_url
                          ? "参考資料をアップロード済み(再アップロードで差し替え)"
                          : "参考資料(提案資料・PPT/PDF等)をアップロード"}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        className="hidden"
                        disabled={isUploadingDoc}
                        onChange={handleUploadReferenceDoc}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-slate-400">
                      PDF・Wordは内容をAIが読み取り戦略ヒアリングに活用します。PowerPoint等は保存のみで内容解析には未対応です。
                    </p>
                    {company.strategy_reference_doc_url && (
                      <a
                        href={company.strategy_reference_doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-brand-600 underline"
                      >
                        アップロード済みの資料を開く
                      </a>
                    )}
                    {company.strategy_reference_doc_url && (
                      <div className="mt-2 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">
                        <span className="font-medium text-slate-500">AIによる資料の要約: </span>
                        {company.strategy_reference_doc_summary ?? (
                          <span className="text-slate-400">(この形式は内容解析に対応していません)</span>
                        )}
                      </div>
                    )}
                    {uploadDocError && <p className="mt-2 text-xs text-red-600">{uploadDocError}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                    <StrategyChatPanel
                      companyId={company.id}
                      step="positioning"
                      onAdvance={() => setStrategyStep("abm")}
                    />
                    <StrategyExtractionPanel
                      fields={[
                        { label: "差別化要因", value: company.key_differentiators },
                        { label: "訴求軸", value: company.appeal_axis },
                      ]}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <button
                      type="button"
                      onClick={handleGenerateScores}
                      disabled={isScoringPending}
                      className="btn-brand btn-sm disabled:opacity-50"
                    >
                      {isScoringPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isScoringPending ? "算出中..." : "購買心理7原則スコアを算出する"}
                    </button>
                    {scoringError && <p className="mt-2 text-xs text-red-600">{scoringError}</p>}
                    {scoringSummary && <p className="mt-3 text-sm text-slate-600">{scoringSummary}</p>}
                    <div className="mt-4">
                      <StrategyPrincipleChart scores={company.principle_scores} />
                    </div>
                  </div>
                </div>
              )}

              {strategyStep === "abm" && (
                <div className="space-y-4">
                  {leads.length > 0 && (
                    <div>
                      <label className="field-label">既存のリードから選択(任意)</label>
                      <select
                        value={selectedLeadId}
                        onChange={(e) => handleSelectLead(e.target.value)}
                        className="field"
                      >
                        <option value="">自由入力する</option>
                        {leads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.lead_company_name}
                            {l.last_approach_result ? `(直近: ${l.last_approach_result})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        リードを選択すると、実際のアプローチ経路・活動履歴もAIへの入力に加わり、
                        より具体的な提案になります。
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label">商談相手企業名</label>
                      <input
                        value={prospectName}
                        onChange={(e) => {
                          setSelectedLeadId("");
                          setProspectName(e.target.value);
                        }}
                        placeholder="例: 株式会社サンプル"
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">商談相手に関する情報・メモ</label>
                      <input
                        value={prospectNotes}
                        onChange={(e) => setProspectNotes(e.target.value)}
                        placeholder="業種、課題感、担当者の役職など分かる範囲で"
                        className="field"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateAbm}
                    disabled={isAbmPending || !prospectName.trim()}
                    className="btn-brand btn-sm disabled:opacity-50"
                  >
                    {isAbmPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isAbmPending ? "生成中..." : "見せ方の提案を生成する"}
                  </button>
                  {abmError && <p className="text-xs text-red-600">{abmError}</p>}
                  {abmResult && (
                    <div className="card space-y-4 p-5">
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          推奨アングル
                        </h4>
                        <p className="text-sm text-slate-700">{abmResult.recommended_angle}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          伝えるべきメッセージ
                        </h4>
                        <ul className="ml-4 list-disc space-y-1 text-sm text-slate-700">
                          {abmResult.key_messages.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          重点的に訴求すべき原則
                        </h4>
                        <ul className="ml-4 list-disc space-y-1 text-sm text-slate-700">
                          {abmResult.principles_to_emphasize.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">注意点</h4>
                        <ul className="ml-4 list-disc space-y-1 text-sm text-slate-700">
                          {abmResult.cautions.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50/70 to-white p-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  AI商談準備アシスタント
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  企業情報をもとに、商談に必要な分析・トーク・ヒアリング項目を生成します。
                </p>
              </div>
            </div>

            {error && <InlineAlert variant="error">エラー: {error}</InlineAlert>}

            <div className="mb-6 flex flex-wrap gap-2">
              {PREP_REPORTS.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => handleGenerate(type)}
                  disabled={loadingType !== null}
                  className={
                    loadingType === type
                      ? "btn cursor-not-allowed bg-slate-200 px-4 py-2 text-slate-500"
                      : "btn-brand disabled:opacity-50"
                  }
                >
                  {loadingType === type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loadingType === type ? "生成中..." : `${label}を生成`}
                </button>
              ))}
            </div>

            {!hasAnyReport && loadingType === null && (
              <EmptyState
                icon={AlertCircle}
                title="まだ分析情報が生成されていません"
                description="上のボタンからAIによる生成を開始してください"
              />
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {PREP_REPORTS.map(({ type, label }) => {
                const report = latestReports[type];
                if (!report) return null;
                return (
                  <div key={type} className="card overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
                      <p className="text-[11px] text-slate-400">
                        生成日時: {new Date(report.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <div className="space-y-3 p-4 text-sm text-slate-700">
                      <GeneratedContentView content={report.content} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
