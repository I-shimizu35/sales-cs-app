import {
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

export type SupportState = "preparing" | "operating" | "stopped";

/**
 * support_status(支援中/支援終了)とsupport_phase(7段階)から、
 * 「稼働中/準備中/支援終了」という一目で分かる支援状況を導出する。
 * このアプリで扱う企業は基本的に契約済みのクライアントであり、
 * 「見込み/失注」のような営業獲得目線のステータスは実態と合わないため、
 * 支援の稼働状況のみを表す3値に統一している。
 */
export function getSupportState(supportStatus: SupportStatus, supportPhase: SupportPhase): SupportState {
  if (supportStatus === "inactive") return "stopped";
  if (supportPhase === "operating") return "operating";
  return "preparing";
}

export const SUPPORT_STATE_LABEL: Record<SupportState, string> = {
  preparing: "準備中",
  operating: "稼働中",
  stopped: "支援終了",
};

export const SUPPORT_STATE_BADGE_CLASS: Record<SupportState, string> = {
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  operating: "bg-emerald-50 text-emerald-700 border-emerald-200",
  stopped: "bg-slate-50 text-slate-400 border-slate-100",
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
  strategy_intake_turn: "企業情報ヒアリング",
  strategy_positioning_turn: "商談戦略ヒアリング",
  strategy_principle_scoring: "購買心理7原則スコアリング",
  strategy_abm_recommendation: "個社相関(ABM)提案",
};
