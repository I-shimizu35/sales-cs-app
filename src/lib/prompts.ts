import { ReportType } from "./types";
import { createServerClient } from "./supabase";

/**
 * プロンプトテンプレート集。
 * {{variable}} 形式のプレースホルダは lib/openai.ts の fillTemplate() で置換される。
 * 本番運用では Supabase の `prompts` テーブルへ移し、管理画面から編集できるようにする
 * (Phase2)。MVPでは変更頻度が低いためコードで管理する。
 */
export const PROMPT_TEMPLATES: Partial<Record<ReportType, string>> = {
  company_analysis: `
以下の企業情報をもとに、企業分析を行ってください。

会社名: {{company_name}}
URL: {{url}}
業種: {{industry}}
事業内容: {{business_summary}}
現状課題: {{current_issues}}
目標: {{goals}}

入力にない財務数値や人事情報を創作しないでください。
以下のJSON形式のみで出力してください:
{
  "summary": "string(事業概要の要約)",
  "strengths": ["string"],
  "issue_hypotheses": ["string(想定される課題仮説)"],
  "decision_structure_guess": "string(意思決定構造の推測。不明な場合はその旨を記載)"
}`.trim(),

  hearing_items: `
以下の情報をもとに、次回商談で使うヒアリング項目を作成してください。

企業分析: {{company_analysis}}
現状課題: {{current_issues}}
目標: {{goals}}
商談フェーズ: {{meeting_phase}}

誘導的すぎる質問、過度にプライベートな質問は避けてください。
10〜15問程度に収めてください。
以下のJSON形式のみで出力してください:
{
  "questions": [
    { "category": "string", "question": "string", "purpose": "string(聞く狙い)" }
  ]
}`.trim(),

  talk_script: `
以下の情報をもとに、商談トークスクリプトを作成してください。

企業分析: {{company_analysis}}
現状課題: {{current_issues}}
目標: {{goals}}
支援目的: {{support_purpose}}

「必ず」「絶対に」等の誇大な効果保証表現は使わないでください。
以下のJSON形式のみで出力してください:
{
  "opening": "string",
  "hearing_intro": "string",
  "value_proposition": "string",
  "closing": "string"
}`.trim(),

  meeting_minutes: `
以下の商談文字起こしをもとに、議事録を作成してください。

商談種別: {{meeting_type}}
文字起こし全文:
{{transcript_text}}

文字起こしに存在しない発言を創作しないでください。
話者が不明な場合は「話者不明」と明記してください。
以下のJSON形式のみで出力してください:
{
  "participants": ["string"],
  "agenda": ["string"],
  "decisions": ["string"],
  "concerns": ["string"],
  "homework": ["string"]
}`.trim(),

  reinforcement_fb: `
以下の議事録と商談トーク準備内容を比較し、行動強化フィードバックを作成してください。

議事録: {{meeting_minutes}}
準備していた商談トーク: {{talk_script}}

根拠のない抽象的な称賛(「頑張った」等)は避け、議事録内の具体的根拠を示してください。
以下のJSON形式のみで出力してください:
{
  "good_points": [
    { "point": "string", "evidence": "string(議事録内の該当箇所)", "how_to_repeat": "string" }
  ]
}`.trim(),

  correction_fb: `
以下の議事録・準備内容・ヒアリング項目を比較し、行動是正フィードバックを作成してください。

議事録: {{meeting_minutes}}
準備していた商談トーク: {{talk_script}}
準備していたヒアリング項目: {{hearing_items}}

人格評価表現・感情的表現は避け、行動ベースで指摘し、具体的な改善アクションを示してください。
以下のJSON形式のみで出力してください:
{
  "improvement_points": [
    { "point": "string", "evidence": "string", "action": "string" }
  ]
}`.trim(),

  next_proposal_policy: `
以下の情報をもとに、次回商談の提案方針を作成してください。

議事録: {{meeting_minutes}}
BANT判定結果: {{bant_result}}
現状課題: {{current_issues}}
目標: {{goals}}

BANT情報が不十分な場合、断定的なクロージング方針を提示せず「情報不足のため要ヒアリング」と明記してください。
以下のJSON形式のみで出力してください:
{
  "next_goal": "string",
  "key_points": ["string"],
  "expected_obstacles": ["string"],
  "materials_needed": ["string"]
}`.trim(),

  bant_judgement: `
以下の議事録をもとに、BANT判定を行ってください。

議事録: {{meeting_minutes}}

議事録に記載のない情報から断定的に推測しないでください。不明な場合は「不明」と明記してください。
以下のJSON形式のみで出力してください:
{
  "budget": { "result": "string", "evidence": "string" },
  "authority": { "result": "string", "evidence": "string" },
  "need": { "result": "string", "evidence": "string" },
  "timeline": { "result": "string", "evidence": "string" }
}`.trim(),

  temperature_score: `
以下の情報をもとに、温度感スコア(0-100)を算出してください。

議事録: {{meeting_minutes}}
BANT判定結果: {{bant_result}}
これまでの商談回数: {{meeting_count}}

単一の発言のみを根拠にした極端な採点は避け、加点/減点要因を明示してください。
以下のJSON形式のみで出力してください:
{
  "score": 0,
  "positive_factors": ["string"],
  "negative_factors": ["string"]
}`.trim(),

  win_probability: `
以下の情報をもとに、受注確度(0-100%)を判定してください。

BANT判定結果: {{bant_result}}
温度感スコア: {{temperature_score}}
案件フェーズ: {{deal_stage}}
これまでの商談回数: {{meeting_count}}

根拠のない断定的な高確度表示は避けてください。
以下のJSON形式のみで出力してください:
{
  "win_probability": 0,
  "reasoning": "string",
  "risk_factors": ["string"]
}`.trim(),
};

export interface PromptTemplateResult {
  template: string;
  promptId: string | null;
}

/**
 * promptsテーブルに管理画面から編集された内容があればそれを優先し、
 * 無ければコード内のフォールバック定数を使う。どちらにも無ければエラー。
 */
export async function getPromptTemplate(reportType: ReportType): Promise<PromptTemplateResult> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("prompts")
    .select("id, template_text")
    .eq("name", reportType)
    .maybeSingle();

  if (data) {
    return { template: data.template_text, promptId: data.id };
  }

  const fallback = PROMPT_TEMPLATES[reportType];
  if (!fallback) {
    throw new Error(`プロンプトテンプレートが未定義です: ${reportType}`);
  }
  return { template: fallback, promptId: null };
}
