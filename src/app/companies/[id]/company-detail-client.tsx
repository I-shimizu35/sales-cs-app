"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowLeft, Loader2, Sparkles, AlertCircle, CheckCircle2, Rocket, X } from "lucide-react";
import { Company, GeneratedReport, ReportType, AppUser } from "@/lib/types";
import { DEAL_STATUS_LABEL, DEAL_STATUS_BADGE_CLASS } from "@/lib/status";
import { GeneratedContentView } from "@/components/generated-content-view";
import { EmptyState } from "@/components/empty-state";
import { ClientPortalPanel } from "@/components/client-portal-panel";
import { SupportTeamPanel } from "@/components/support-team-panel";
import { updateCompany } from "../actions";

type TabType = "basic" | "prep";

const PREP_REPORTS: { type: ReportType; label: string }[] = [
  { type: "company_analysis", label: "企業分析" },
  { type: "hearing_items", label: "ヒアリング項目" },
  { type: "talk_script", label: "商談トーク" },
];

interface Props {
  company: Company;
  generatedReports: GeneratedReport[];
  users: AppUser[];
  supporters: { id: string; user_id: string }[];
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

      {showSavedBanner && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          保存しました
        </div>
      )}

      {showNewBanner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <div className="flex items-start gap-2">
            <Rocket className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">企業を登録しました。次にやることの例:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-brand-700">
                <li>下の「支援状況」で支援担当者をアサインする</li>
                <li>クライアント自身に使ってもらう場合は「クライアントポータル」を有効化する</li>
                <li>案件の記録を始める場合は上の「この企業の管理画面に入る」から案件管理表へ</li>
              </ul>
            </div>
          </div>
          <button onClick={dismissNewBanner} className="shrink-0 text-brand-400 hover:text-brand-700">
            <X className="h-4 w-4" />
          </button>
        </div>
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
              <span className={`badge ${DEAL_STATUS_BADGE_CLASS[company.deal_status]}`}>
                {DEAL_STATUS_LABEL[company.deal_status]}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              業種: {company.industry ?? "未設定"} • 担当者:{" "}
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="field-label">会社名</label>
                  <input name="name" defaultValue={company.name} required disabled={!canEditCompany} className="field" />
                </div>
                <div>
                  <label className="field-label">担当者</label>
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
              supporters={supporters}
              users={users}
            />
          </div>
        )}

        {activeTab === "basic" && isManagerOrAdmin && (
          <div className="mt-8">
            <ClientPortalPanel companyId={company.id} portalEnabled={company.client_portal_enabled} />
          </div>
        )}

        {/* 商談準備タブ */}
        {activeTab === "prep" && (
          <div>
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

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">エラー: {error}</p>
            )}

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
