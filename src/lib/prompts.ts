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

  industry_analysis: `
以下の企業情報をもとに、業界分析を行ってください。

会社名: {{company_name}}
業種: {{industry}}
事業内容: {{business_summary}}

入力にない具体的な市場規模数値・競合社名を創作しないでください。
一般的な業界動向として述べる場合は推測である旨を明記してください。
以下のJSON形式のみで出力してください:
{
  "industry_trends": ["string"],
  "competitive_landscape": "string(推測である旨を含む)",
  "regulatory_or_external_factors": ["string"],
  "opportunities_for_client": ["string"]
}`.trim(),

  distribution_analysis: `
以下の企業情報をもとに、商流(販売チャネル・顧客構造)の分析を行ってください。

会社名: {{company_name}}
業種: {{industry}}
事業内容: {{business_summary}}
現状課題: {{current_issues}}

入力にない具体的な取引先名を創作しないでください。
以下のJSON形式のみで出力してください:
{
  "estimated_customer_segments": ["string"],
  "sales_channel_hypothesis": "string",
  "intermediaries_or_partners": ["string"],
  "distribution_challenges": ["string"]
}`.trim(),

  profit_structure_analysis: `
以下の企業情報をもとに、収益構造の仮説分析を行ってください。

会社名: {{company_name}}
業種: {{industry}}
事業内容: {{business_summary}}

入力にない具体的な財務数値(売上高・利益率等)を創作しないでください。
すべて仮説であることが分かるように記述してください。
以下のJSON形式のみで出力してください:
{
  "revenue_model_hypothesis": "string",
  "cost_structure_hypothesis": "string",
  "margin_pressure_points": ["string"],
  "notes": "string(推測の前提条件・不確実性)"
}`.trim(),

  assumed_issues: `
以下の企業情報をもとに、想定される課題を整理してください。

会社名: {{company_name}}
業種: {{industry}}
事業内容: {{business_summary}}
現状課題: {{current_issues}}
目標: {{goals}}

根拠のない決めつけを避け、それぞれの課題がなぜ想定されるかの根拠を示してください。
以下のJSON形式のみで出力してください:
{
  "issues": [
    { "issue": "string", "impact": "string", "hypothesis_basis": "string" }
  ]
}`.trim(),

  qa_list: `
以下の情報をもとに、商談中に想定される質問・懸念とその回答案を作成してください。

企業分析: {{company_analysis}}
現状課題: {{current_issues}}
支援目的: {{support_purpose}}

「必ず」「絶対に」等の誇大な効果保証表現は使わないでください。
以下のJSON形式のみで出力してください:
{
  "qa_pairs": [
    { "question": "string(想定される質問・懸念)", "suggested_answer": "string" }
  ]
}`.trim(),

  forecast_reflection: `
以下の商談情報をもとに、週次のヨミ表・報告にそのまま転記できる要約を作成してください。

議事録: {{meeting_minutes}}
BANT判定結果: {{bant_result}}
温度感スコア: {{temperature_score}}
受注確度: {{win_probability}}
案件フェーズ: {{deal_stage}}

断定的な受注確約表現は避けてください。
以下のJSON形式のみで出力してください:
{
  "summary_for_forecast": "string(ヨミ表・週次報告にそのまま転記できる1〜2文の要約)",
  "recommended_next_action": "string",
  "confidence_note": "string(確度判定の根拠・注意点)"
}`.trim(),

  deal_sheet_reflection: `
以下の商談情報をもとに、案件管理表の各欄に反映する内容案を作成してください。

議事録: {{meeting_minutes}}
次回提案方針: {{next_proposal_policy}}
現在の顧客課題欄: {{current_issues}}
現在の提案内容欄: {{proposal_content}}

議事録に記載のない内容を創作しないでください。
以下のJSON形式のみで出力してください:
{
  "customer_issues_update": "string(顧客課題欄への反映案)",
  "proposal_content_update": "string(提案内容欄への反映案)",
  "concerns_update": "string(懸念点欄への反映案)",
  "follow_up_policy_update": "string(フォロー方針欄への反映案)"
}`.trim(),

  strategy_intake_turn: `
あなたは商談戦略設計を支援するAIアシスタントです。ユーザー企業(自社)の基礎情報を
会話形式でヒアリングしています。

これまでに判明している情報: {{known_fields}}
未取得の項目: {{missing_fields}}
これまでの会話: {{conversation_history}}
ユーザーの直前の発言: {{latest_user_message}}

ユーザーの発言から読み取れる項目があれば抽出し、まだ聞けていない項目のうち
最も自然な流れの1つだけを次の質問として返してください。一度に複数の質問を
しないでください。全ての項目(会社名・URL・設立年・従業員数・事業内容・
顧客層・現状課題・料金プラン)が揃ったら is_complete を true にし、
reply には簡潔なお礼と次のステップへ進む案内を入れてください。
入力にない情報を創作しないでください。
以下のJSON形式のみで出力してください:
{
  "reply": "string(次の質問、または完了メッセージ)",
  "extracted": {
    "name": "string(会社名)",
    "url": "string",
    "founded_year": 0,
    "employee_count": 0,
    "business_summary": "string(事業内容)",
    "target_customer_profile": "string(顧客層)",
    "current_issues": "string(現状課題)",
    "pricing_plan": "string(料金プラン)"
  },
  "is_complete": false
}
extractedには今回新たに判明した項目のみを含め、不明な項目のキーは省略してください。`.trim(),

  strategy_positioning_turn: `
あなたは商談戦略設計を支援するAIアシスタントです。企業情報ヒアリングが完了した
自社について、商談での見せ方を検討するための戦略ヒアリングを行っています。

自社の基礎情報: {{company_profile_summary}}
アップロードされた参考資料の要約: {{reference_doc_summary}}
これまでに判明している戦略情報: {{known_fields}}
これまでの会話: {{conversation_history}}
ユーザーの直前の発言: {{latest_user_message}}

自社の強み・差別化要因・どの訴求軸(コスト削減/成長投資/リスク回避/運用改善)が
最もフィットするかを、一度に1つずつヒアリングしてください。
差別化要因(key_differentiators)と訴求軸(appeal_axis)の両方が判明したら
is_complete を true にしてください。
入力にない情報を創作しないでください。
以下のJSON形式のみで出力してください:
{
  "reply": "string(次の質問、または完了メッセージ)",
  "extracted": {
    "key_differentiators": "string",
    "appeal_axis": "string(コスト削減/成長投資/リスク回避/運用改善のいずれか)"
  },
  "is_complete": false
}
extractedには今回新たに判明した項目のみを含め、不明な項目のキーは省略してください。`.trim(),

  strategy_principle_scoring: `
以下の自社情報をもとに、購買心理7原則(関心・興味・連想・欲望・比較・信念・決意)の
それぞれについて、自社の訴求がどれだけ強く機能しそうかを0〜100のスコアで評価して
ください。

会社名: {{company_name}}
事業内容: {{business_summary}}
顧客層: {{target_customer_profile}}
差別化要因: {{key_differentiators}}
訴求軸: {{appeal_axis}}
現状課題: {{current_issues}}
アップロードされた参考資料の要約: {{reference_doc_summary}}

スコアは入力情報から論理的に導ける範囲に留め、根拠のない高スコアを避けてください。
以下のJSON形式のみで出力してください:
{
  "principle_scores": { "関心": 0, "興味": 0, "連想": 0, "欲望": 0, "比較": 0, "信念": 0, "決意": 0 },
  "summary": "string(スコア全体の傾向と、特に強み・弱みとなる原則の解説)"
}`.trim(),

  strategy_abm_recommendation: `
以下の自社の商談戦略プロファイルと、商談相手(プロスペクト)の情報をもとに、
この相手に対して自社事業をどう見せるべきかを提案してください。

自社の購買心理7原則スコア: {{principle_scores}}
自社の差別化要因: {{key_differentiators}}
自社の訴求軸: {{appeal_axis}}
商談相手企業名: {{prospect_name}}
商談相手に関する情報・メモ: {{prospect_notes}}
商談相手のリード実績データ: {{lead_context}}

リード実績データがある場合は、一般論ではなくその実際のアプローチ経路・活動履歴・
直近の反応を踏まえた具体的な提案にしてください。
商談相手の情報が乏しい場合は、一般論に基づく提案である旨を明記してください。
以下のJSON形式のみで出力してください:
{
  "recommended_angle": "string(この相手に最適な見せ方の要約)",
  "key_messages": ["string(具体的に伝えるべきメッセージ)"],
  "principles_to_emphasize": ["string(重点的に訴求すべき原則とその理由)"],
  "cautions": ["string(避けるべき訴求・注意点)"]
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
