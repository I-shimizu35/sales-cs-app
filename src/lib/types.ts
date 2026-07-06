// DBスキーマ(supabase/migrations/0001_init.sql)に対応する型定義。
// Supabase CLIの型自動生成(`supabase gen types typescript`)に置き換え可能だが、
// MVP初期は手書きで十分な範囲に留める。

export type UserRole = "admin" | "manager" | "cs" | "sales" | "support";

export type NotifyFrequency = "daily" | "weekly";

export interface AppUser {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  notify_overdue_actions: boolean;
  notify_frequency: NotifyFrequency;
}

export type DealStatus = "prospect" | "in_progress" | "won" | "lost" | "dormant";

export type SupportStatus = "active" | "inactive";

export type SupportPhase =
  | "initial_design"
  | "material_collection"
  | "deal_sheet_setup"
  | "sales_materials"
  | "gpt_setup"
  | "operation_prep"
  | "operating";

export interface Company {
  id: string;
  name: string;
  url: string | null;
  industry: string | null;
  location: string | null;
  business_summary: string | null;
  introduced_units: string[] | null;
  contract_start: string | null;
  contract_end: string | null;
  support_purpose: string | null;
  current_issues: string | null;
  goals: string | null;
  deal_status: DealStatus;
  support_status: SupportStatus;
  support_phase: SupportPhase;
  owner_user_id: string | null;
  created_by: string | null;
  client_login_slug: string | null;
  client_portal_enabled: boolean;
  notification_email: string | null;
  default_deal_category: string | null;
  default_lead_source: string | null;
  created_at: string;
  updated_at: string;
}

export type DealStage = "first_contact" | "hearing" | "proposal" | "closing" | "won" | "lost";
export type ScoreStatus = "ai_draft" | "manager_confirmed";

export interface Deal {
  id: string;
  company_id: string;
  title: string;
  stage: DealStage;
  amount: number | null;
  owner_user_id: string | null;
  bant_budget: string | null;
  bant_authority: string | null;
  bant_need: string | null;
  bant_timeline: string | null;
  temperature_score: number | null;
  win_probability: number | null;
  score_status: ScoreStatus;
  // 案件管理表(ヨミ表統合)用フィールド
  deal_category: string | null;
  contact_name: string | null;
  contact_title: string | null;
  lead_source: string | null;
  expected_revenue: number | null;
  first_meeting_date: string | null;
  proposal_meeting_date: string | null;
  forecast_meeting_date: string | null;
  expected_close_date: string | null;
  last_contact_date: string | null;
  next_meeting_at: string | null;
  customer_issues: string | null;
  proposal_content: string | null;
  concerns: string | null;
  lost_reason: string | null;
  follow_up_policy: string | null;
  minutes_doc_url: string | null;
  first_meeting_video_url: string | null;
  second_meeting_video_url: string | null;
  proposal_doc_url: string | null;
  quote_doc_url: string | null;
  meeting_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  deal_id: string;
  held_at: string | null;
  meeting_type: "first" | "hearing" | "proposal" | "follow_up";
}

export interface Transcript {
  id: string;
  meeting_id: string;
  raw_text: string;
  input_method: "paste" | "file_upload";
  registered_by: string | null;
}

export type ReportType =
  | "company_analysis"
  | "industry_analysis"
  | "distribution_analysis"
  | "profit_structure_analysis"
  | "assumed_issues"
  | "hearing_items"
  | "talk_script"
  | "qa_list"
  | "meeting_minutes"
  | "reinforcement_fb"
  | "correction_fb"
  | "next_proposal_policy"
  | "bant_judgement"
  | "temperature_score"
  | "win_probability"
  | "forecast_reflection"
  | "deal_sheet_reflection";

export interface GeneratedReport {
  id: string;
  target_type: "company" | "deal" | "meeting";
  target_id: string;
  report_type: ReportType;
  content: Record<string, unknown>;
  google_doc_url: string | null;
  generated_by: string | null;
  prompt_id: string | null;
  created_at: string;
}

export type ActionItemStatus = "todo" | "in_progress" | "done";

export interface ActionItem {
  id: string;
  deal_id: string;
  title: string;
  due_date: string;
  assignee_id: string | null;
  status: ActionItemStatus;
  created_at: string;
  updated_at: string;
}

export interface CompanySupporter {
  id: string;
  company_id: string;
  user_id: string;
  created_at: string;
}

export interface CompanyNote {
  id: string;
  company_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
}

// company_id: どのクライアントのリードか(テナントスコープ)。
// lead_company_name: 見込み客(プロスペクト)自身の企業名で company_id とは別物。
export interface Lead {
  id: string;
  company_id: string;
  converted_from_deal_id: string | null;
  lead_company_name: string;
  approach_list_name: string | null;
  last_approach_result: string | null;
  last_approach_at: string | null;
  activity_summary: string | null;
  phone: string | null;
  follow_call_desired: boolean | null;
  follow_call_summary: string | null;
  email: string | null;
  website_url: string | null;
  postal_code: string | null;
  address: string | null;
  material_shipping_destination: string | null;
  material_request_department: string | null;
  material_request_contact_name: string | null;
  lead_source: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}
