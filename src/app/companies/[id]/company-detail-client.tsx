"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Company, Deal, GeneratedReport, ReportType, AppUser, ActionItem } from "@/lib/types";
import {
  DEAL_STATUS_LABEL,
  DEAL_STATUS_BADGE_CLASS,
  DEAL_STAGE_LABEL,
  ACTION_ITEM_STATUS_LABEL,
} from "@/lib/status";
import { GeneratedContentView } from "@/components/generated-content-view";
import { EmptyState } from "@/components/empty-state";
import { ClientPortalPanel } from "@/components/client-portal-panel";
import { updateCompany } from "../actions";
import { createDeal, updateDealStage } from "./deal-actions";
import { createActionItem, updateActionItemStatus, deleteActionItem } from "./action-item-actions";

type TabType = "basic" | "prep" | "history";

const PREP_REPORTS: { type: ReportType; label: string }[] = [
  { type: "company_analysis", label: "企業分析" },
  { type: "hearing_items", label: "ヒアリング項目" },
  { type: "talk_script", label: "商談トーク" },
];

interface Props {
  company: Company;
  deals: Deal[];
  generatedReports: GeneratedReport[];
  users: AppUser[];
  actionItems: ActionItem[];
  currentUserId: string | null;
  canEditCompany: boolean;
  isManagerOrAdmin: boolean;
  initialSaved?: boolean;
}

export function CompanyDetailClient({
  company,
  deals,
  generatedReports,
  users,
  actionItems,
  currentUserId,
  canEditCompany,
  isManagerOrAdmin,
  initialSaved,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [showSavedBanner, setShowSavedBanner] = useState(!!initialSaved);
  const [loadingType, setLoadingType] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const createDealWithId = createDeal.bind(null, company.id);

  function canEditDeal(deal: Deal): boolean {
    return isManagerOrAdmin || deal.owner_user_id === currentUserId;
  }

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
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { id: "basic", label: "基本情報" },
            { id: "prep", label: "商談準備 (AI)" },
            { id: "history", label: "案件・商談履歴" },
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

        {/* 案件・商談履歴タブ */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">案件一覧</h3>
              {deals.length === 0 ? (
                <EmptyState icon={Calendar} title="まだ案件が登録されていません" />
              ) : (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      users={users}
                      actionItems={actionItems.filter((a) => a.deal_id === deal.id)}
                      canEdit={canEditDeal(deal)}
                    />
                  ))}
                </div>
              )}
            </div>

            {canEditCompany ? (
              <div className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">新規案件を作成</h3>
                <form action={createDealWithId} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    name="title"
                    required
                    placeholder="案件名(例: 2026年度導入検討)"
                    className="field flex-1"
                  />
                  <select name="owner_user_id" defaultValue="" className="field sm:w-auto">
                    <option value="">担当者: 未設定</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">
                    作成
                  </button>
                </form>
                <p className="mt-2 text-xs text-slate-400">
                  案件を作成すると、文字起こし登録・商談FB生成の対象として選択できるようになります。
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                この企業の担当者ではないため、新規案件の作成はできません。
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  users,
  actionItems,
  canEdit,
}: {
  deal: Deal;
  users: AppUser[];
  actionItems: ActionItem[];
  canEdit: boolean;
}) {
  const updateStageWithId = updateDealStage.bind(null, deal.id);
  const createActionItemWithId = createActionItem.bind(null, deal.id);

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{deal.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <form action={updateStageWithId} className="inline-flex items-center gap-1">
              <span>フェーズ:</span>
              <select
                name="stage"
                defaultValue={deal.stage}
                disabled={!canEdit}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="field-sm w-auto py-1"
              >
                {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </form>
            <span>
              • 担当者: {users.find((u) => u.id === deal.owner_user_id)?.name ?? "未設定"}
            </span>
            {deal.temperature_score !== null && <span>• 温度感: {deal.temperature_score}</span>}
            {deal.win_probability !== null && <span>• 受注確度: {deal.win_probability}%</span>}
          </div>
        </div>
      </div>

      {/* 次回アクション */}
      <div className="mt-3 ml-11 space-y-2 border-t border-slate-100 pt-3">
        {actionItems.length === 0 ? (
          <p className="text-xs text-slate-400">次回アクションは登録されていません。</p>
        ) : (
          actionItems.map((item) => (
            <ActionItemRow key={item.id} item={item} users={users} canEdit={canEdit} />
          ))
        )}

        {canEdit && (
          <form action={createActionItemWithId} className="flex flex-wrap items-center gap-2 pt-1">
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
        )}
      </div>
    </div>
  );
}

function ActionItemRow({
  item,
  users,
  canEdit,
}: {
  item: ActionItem;
  users: AppUser[];
  canEdit: boolean;
}) {
  const updateStatusWithId = updateActionItemStatus.bind(null, item.id);
  const deleteWithId = deleteActionItem.bind(null, item.id, item.deal_id);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
      <span className="flex-1 text-slate-700">{item.title}</span>
      <span className="text-slate-400">
        期日: {item.due_date} • 担当: {users.find((u) => u.id === item.assignee_id)?.name ?? "未設定"}
      </span>
      <form action={updateStatusWithId} className="inline-flex">
        <select
          name="status"
          defaultValue={item.status}
          disabled={!canEdit}
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
      {canEdit && (
        <form action={deleteWithId}>
          <button type="submit" className="text-slate-400 hover:text-red-600" title="削除">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
