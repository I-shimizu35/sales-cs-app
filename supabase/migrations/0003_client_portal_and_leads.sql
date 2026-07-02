-- ============================================================
-- クライアントポータル + 案件管理表(ヨミ表統合)+ リード管理
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

-- ------------------------------------------------------------
-- deals: 案件管理表(ヨミ表統合)用の列を追加
-- ------------------------------------------------------------
alter table deals
  add column if not exists deal_category text,              -- 案件区分
  add column if not exists contact_name text,                -- 担当者名(クライアント側の商談窓口)
  add column if not exists contact_title text,                -- 役職
  add column if not exists lead_source text,                  -- 流入経路
  add column if not exists expected_revenue numeric,          -- 見込み売上
  add column if not exists first_meeting_date date,           -- 新規商談日
  add column if not exists proposal_meeting_date date,        -- 提案商談日
  add column if not exists forecast_meeting_date date,        -- ヨミ商談日
  add column if not exists expected_close_date date,          -- 受注予定日
  add column if not exists last_contact_date date,            -- 最終接触日
  add column if not exists next_meeting_at timestamptz,       -- 次回商談時間
  add column if not exists customer_issues text,              -- 顧客(先方)課題
  add column if not exists proposal_content text,             -- 提案内容
  add column if not exists concerns text,                     -- 懸念点
  add column if not exists lost_reason text,                  -- 失注理由
  add column if not exists follow_up_policy text,             -- フォロー方針
  add column if not exists minutes_doc_url text,               -- 商談議事録(ドキュメント)
  add column if not exists first_meeting_video_url text,      -- 一次商談動画
  add column if not exists second_meeting_video_url text,     -- 二次商談動画
  add column if not exists proposal_doc_url text,              -- 提案書
  add column if not exists quote_doc_url text,                 -- 見積もり
  add column if not exists meeting_feedback text;              -- 商談FB(社内のみ編集、クライアントは閲覧のみ)

-- ------------------------------------------------------------
-- companies: クライアントポータル用の列を追加
-- ------------------------------------------------------------
alter table companies
  add column if not exists client_login_slug text unique,          -- 専用ログインURL識別子
  add column if not exists client_password_hash text,               -- bcryptハッシュ
  add column if not exists client_portal_enabled boolean not null default false;

-- ------------------------------------------------------------
-- leads: リード一覧(失注案件の自動登録 + 手動追加)
-- company_id = どのクライアントのリードか(テナントスコープ)
-- lead_company_name = 見込み客(プロスペクト)自身の企業名
-- ------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete restrict,
  converted_from_deal_id uuid references deals(id),
  lead_company_name text not null,
  approach_list_name text,
  last_approach_result text,
  last_approach_at timestamptz,
  activity_summary text,
  phone text,
  follow_call_desired boolean,
  follow_call_summary text,
  email text,
  website_url text,
  postal_code text,
  address text,
  material_shipping_destination text,
  material_request_department text,
  material_request_contact_name text,
  lead_source text,
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_updated_at before update on leads
  for each row execute function set_updated_at();

create index if not exists idx_leads_company_id on leads(company_id);
create index if not exists idx_leads_converted_from_deal_id on leads(converted_from_deal_id);

alter table leads enable row level security;
create policy "authenticated users can read all" on leads for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on leads for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update" on leads for update using (auth.role() = 'authenticated');

-- 注意: クライアントポータルはSupabase Authを使わない独自セッション(service_role経由)のため、
-- 上記RLSは内部スタッフ(Supabase Auth経由)にのみ意味を持つ。クライアント側の権限制御は
-- 既存方針を踏襲しアプリケーション層(Server Action内)で行う。
