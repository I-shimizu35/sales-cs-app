-- 商談戦略設計(AI)機能用のカラム追加。
-- business_summary(事業内容)・current_issues(課題)は既存列をそのまま流用し、
-- ここでは企業情報ヒアリング・商談戦略ヒアリングで新たに必要な項目のみ追加する。
alter table companies
  add column if not exists founded_year int,
  add column if not exists employee_count int,
  add column if not exists target_customer_profile text,
  add column if not exists pricing_plan text,
  add column if not exists key_differentiators text,
  add column if not exists appeal_axis text,
  add column if not exists strategy_reference_doc_url text,
  add column if not exists principle_scores jsonb;
