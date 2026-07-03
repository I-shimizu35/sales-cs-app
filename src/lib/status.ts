import {
  DealStatus,
  DealStage,
  ScoreStatus,
  ActionItemStatus,
  ReportType,
  SupportStatus,
  SupportPhase,
} from "./types";

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  active: "支援中",
  inactive: "支援終了",
};

export const SUPPORT_STATUS_BADGE_CLASS: Record<SupportStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-400 border-slate-100",
};

/** SU2.0支援フローの進行フェーズ。企業ごとに今どの段階にいるかを管理する。 */
export const SUPPORT_PHASE_LABEL: Record<SupportPhase, string> = {
  initial_design: "初期設計・取材",
  material_collection: "素材回収",
  deal_sheet_setup: "案件管理表・ヨミ表作成",
  sales_materials: "営業資料・台本作成",
  gpt_setup: "GPT構築",
  operation_prep: "稼働準備",
  operating: "稼働中",
};

export const SUPPORT_PHASE_ORDER: SupportPhase[] = [
  "initial_design",
  "material_collection",
  "deal_sheet_setup",
  "sales_materials",
  "gpt_setup",
  "operation_prep",
  "operating",
];

export const SUPPORT_PHASE_BADGE_CLASS: Record<SupportPhase, string> = {
  initial_design: "bg-slate-100 text-slate-600 border-slate-200",
  material_collection: "bg-amber-50 text-amber-700 border-amber-200",
  deal_sheet_setup: "bg-amber-50 text-amber-700 border-amber-200",
  sales_materials: "bg-blue-50 text-blue-700 border-blue-200",
  gpt_setup: "bg-blue-50 text-blue-700 border-blue-200",
  operation_prep: "bg-brand-50 text-brand-700 border-brand-200",
  operating: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  prospect: "見込",
  in_progress: "商談中",
  won: "受注",
  lost: "失注",
  dormant: "休眠",
};

export const DEAL_STATUS_BADGE_CLASS: Record<DealStatus, string> = {
  prospect: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  dormant: "bg-slate-50 text-slate-400 border-slate-100",
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  first_contact: "初回接触",
  hearing: "ヒアリング",
  proposal: "提案",
  closing: "クロージング",
  won: "受注",
  lost: "失注",
};

export const SCORE_STATUS_LABEL: Record<ScoreStatus, string> = {
  ai_draft: "AI生成(未確認)",
  manager_confirmed: "マネージャー確認済",
};

export const ACTION_ITEM_STATUS_LABEL: Record<ActionItemStatus, string> = {
  todo: "未着手",
  in_progress: "対応中",
  done: "完了",
};

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  company_analysis: "企業分析",
  industry_analysis: "業界分析",
  distribution_analysis: "商流分析",
  profit_structure_analysis: "収益構造分析",
  assumed_issues: "想定課題",
  hearing_items: "ヒアリング項目",
  talk_script: "商談トーク",
  qa_list: "Q&Aリスト",
  meeting_minutes: "議事録",
  reinforcement_fb: "行動強化FB",
  correction_fb: "行動是正FB",
  next_proposal_policy: "次回提案方針",
  bant_judgement: "BANT判定",
  temperature_score: "温度感スコア",
  win_probability: "受注確度",
  forecast_reflection: "ヨミ表反映",
  deal_sheet_reflection: "案件管理表反映",
};
