// CSVインポート/エクスポートで使う列ラベル⇔DBカラム名の対応(案件管理表のCSVダウンロードと同じ並び)。
// 次回アクション日・経過日数・次回アクション内容は他データから計算される表示専用の列のため対象外。
//
// "use server"ファイル(deal-actions.ts)は非同期関数以外をエクスポートできないため、
// この定数は独立したファイルに置き、サーバーアクション側・クライアントコンポーネント側の
// 両方から参照する。
export const DEAL_CSV_COLUMNS: { key: string; label: string }[] = [
  { key: "title", label: "案件名" },
  { key: "stage", label: "案件ステータス" },
  { key: "deal_category", label: "案件区分" },
  { key: "contact_name", label: "担当者名" },
  { key: "contact_title", label: "役職" },
  { key: "lead_source", label: "流入経路" },
  { key: "amount", label: "見積もり金額" },
  { key: "win_probability", label: "確度(%)" },
  { key: "expected_revenue", label: "見込み売上" },
  { key: "first_meeting_date", label: "新規商談日" },
  { key: "proposal_meeting_date", label: "提案商談日" },
  { key: "forecast_meeting_date", label: "ヨミ商談日" },
  { key: "expected_close_date", label: "受注予定日" },
  { key: "last_contact_date", label: "最終接触日" },
  { key: "next_meeting_at", label: "次回商談時間" },
  { key: "customer_issues", label: "顧客(先方)課題" },
  { key: "proposal_content", label: "提案内容" },
  { key: "bant_budget", label: "B:予算" },
  { key: "bant_authority", label: "A:決裁者" },
  { key: "bant_need", label: "N:必要性" },
  { key: "bant_timeline", label: "T:時期" },
  { key: "concerns", label: "懸念点" },
  { key: "lost_reason", label: "失注理由" },
  { key: "follow_up_policy", label: "フォロー方針" },
  { key: "roleplay_conducted_at", label: "ロープレ実施日" },
  { key: "minutes_doc_url", label: "商談議事録" },
  { key: "first_meeting_video_url", label: "一次商談動画" },
  { key: "second_meeting_video_url", label: "二次商談動画" },
  { key: "proposal_doc_url", label: "提案書" },
  { key: "quote_doc_url", label: "見積もり" },
];
