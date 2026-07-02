import { ReportType } from "./types";

/**
 * CLAUDE_MOCK=true のとき、実際のClaude API呼び出しを行わずこの固定レスポンスを返す。
 * Anthropicの課金設定を後回しにしても、画面遷移・DB保存・案件へのBANT反映など
 * 課金が絡まない部分を先にテストできるようにするための開発用モード。
 *
 * 各値は該当プロンプトの「出力形式(JSON)」定義(lib/prompts.ts)と
 * 完全に一致させること。形が違うと呼び出し側(APIルート)でエラーになる。
 */
export const MOCK_RESPONSES: Partial<Record<ReportType, Record<string, unknown>>> = {
  company_analysis: {
    summary:
      "[モック] IT関連サービスを展開する中堅企業。直近は組織拡大に伴う業務効率化に課題感があると推測される。",
    strengths: ["[モック] 経営層の意思決定が早い", "[モック] 現場の変化への抵抗感が少ない"],
    issue_hypotheses: [
      "[モック] 部門間の情報共有がサイロ化している可能性",
      "[モック] 営業とCSの引き継ぎに属人化がある可能性",
    ],
    decision_structure_guess: "[モック] 情報不足のため推測不可。ヒアリングで確認が必要。",
  },
  hearing_items: {
    questions: [
      {
        category: "現状把握",
        question: "[モック] 現在の業務フローを教えてください",
        purpose: "[モック] 現状の解像度を上げる",
      },
      {
        category: "予算感",
        question: "[モック] 今期のご予算感はいかがですか",
        purpose: "[モック] Budget項目の確認",
      },
    ],
  },
  talk_script: {
    opening: "[モック] 本日はお時間いただきありがとうございます。",
    hearing_intro: "[モック] まず現状について伺えますでしょうか。",
    value_proposition: "[モック] 弊社サービスは貴社の課題解決に貢献できると考えています。",
    closing: "[モック] 次回、具体的なご提案をさせてください。",
  },
  meeting_minutes: {
    participants: ["[モック] 先方担当者A", "[モック] 自社担当者"],
    agenda: ["[モック] 現状課題の共有", "[モック] 導入スケジュールの相談"],
    decisions: ["[モック] 次回までに見積もりを提示することで合意"],
    concerns: ["[モック] 導入コストへの懸念"],
    homework: ["[モック] 見積書の作成"],
  },
  reinforcement_fb: {
    good_points: [
      {
        point: "[モック] 現状課題を丁寧にヒアリングできていた",
        evidence: "[モック] 議事録内の該当発言",
        how_to_repeat: "[モック] オープンクエスチョンを継続する",
      },
    ],
  },
  correction_fb: {
    improvement_points: [
      {
        point: "[モック] 価格の話に入るタイミングがやや早かった",
        evidence: "[モック] 議事録内の該当発言",
        action: "[モック] 価値訴求を先に行ってから価格提示する",
      },
    ],
  },
  next_proposal_policy: {
    next_goal: "[モック] 決裁者を交えた提案機会の獲得",
    key_points: ["[モック] 導入効果の定量的な提示"],
    expected_obstacles: ["[モック] 決裁者のスケジュール調整"],
    materials_needed: ["[モック] 費用対効果シミュレーション資料"],
  },
  bant_judgement: {
    budget: { result: "[モック] 確保済み", evidence: "[モック] 議事録内の該当発言" },
    authority: { result: "[モック] 確認待ち", evidence: "[モック] 決裁者の同席は次回予定" },
    need: { result: "[モック] 明確", evidence: "[モック] 既存ツールへの不満が語られた" },
    timeline: { result: "[モック] 3ヶ月以内", evidence: "[モック] 契約更新時期が近い" },
  },
  temperature_score: {
    score: 72,
    positive_factors: ["[モック] 質問が具体的だった"],
    negative_factors: ["[モック] 予算感の言及がやや曖昧だった"],
  },
  win_probability: {
    win_probability: 60,
    reasoning: "[モック] BANTのうちAuthorityが未確定のため中程度の確度と判定。",
    risk_factors: ["[モック] 決裁者の合意が取れていない"],
  },
};
