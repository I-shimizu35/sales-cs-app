-- ============================================================
-- 案件テンプレート(新規案件作成時のデフォルト値)
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

alter table companies
  add column if not exists default_deal_category text,
  add column if not exists default_lead_source text;
