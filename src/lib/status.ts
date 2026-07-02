import { DealStatus, DealStage, ScoreStatus, ActionItemStatus, ReportType, SupportStatus } from "./types";

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  active: "支援中",
  inactive: "支援終了",
};

export const SUPPORT_STATUS_BADGE_CLASS: Record<SupportStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-400 border-slate-100",
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
