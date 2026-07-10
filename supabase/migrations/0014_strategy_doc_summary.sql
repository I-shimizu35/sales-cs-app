-- 商談戦略ヒアリングでアップロードした参考資料(PDF/Word)の内容をAIが要約した結果を保存する。
alter table companies
  add column if not exists strategy_reference_doc_summary text;
