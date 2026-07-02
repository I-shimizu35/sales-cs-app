// DBスキーマ(supabase/migrations/0001_init.sql)に対応する型定義。
// Supabase CLIの型自動生成(`supabase gen types typescript`)に置き換え可能だが、
// MVP初期は手書きで十分な範囲に留める。

export type UserRole = "admin" | "manager" | "cs" | "sales" | "support";

export interface AppUser {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
}

export type DealStatus = "prospect" | "in_progress" | "won" | "lost" | "dormant";

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
  owner_user_id: string | null;
  created_by: string | null;
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
