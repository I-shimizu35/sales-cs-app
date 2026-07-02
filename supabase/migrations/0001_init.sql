-- ============================================================
-- 営業・CS支援アプリ 初期スキーマ (MVP)
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

create extension if not exists "uuid-ossp";

-- ロール定義は enum ではなく text + check 制約にして
-- 将来ロール追加時にマイグレーション不要で運用できるようにする
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique, -- supabase auth.users.id と紐付け
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'manager', 'cs', 'sales', 'support')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text,
  industry text,
  location text,
  business_summary text,
  introduced_units text[],
  contract_start date,
  contract_end date,
  support_purpose text,
  current_issues text,
  goals text,
  deal_status text not null default 'prospect'
    check (deal_status in ('prospect', 'in_progress', 'won', 'lost', 'dormant')),
  owner_user_id uuid references users(id),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete restrict,
  title text not null,
  stage text not null default 'first_contact'
    check (stage in ('first_contact', 'hearing', 'proposal', 'closing', 'won', 'lost')),
  amount numeric,
  owner_user_id uuid references users(id),
  bant_budget text,
  bant_authority text,
  bant_need text,
  bant_timeline text,
  temperature_score int check (temperature_score between 0 and 100),
  win_probability int check (win_probability between 0 and 100),
  score_status text not null default 'ai_draft'
    check (score_status in ('ai_draft', 'manager_confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id) on delete restrict,
  held_at date,
  meeting_type text not null default 'hearing'
    check (meeting_type in ('first', 'hearing', 'proposal', 'follow_up')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transcripts (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references meetings(id) on delete restrict,
  raw_text text not null,
  input_method text not null default 'paste' check (input_method in ('paste', 'file_upload')),
  registered_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prompts (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique, -- 例: 'company_analysis', 'bant_judgement' など
  template_text text not null,
  version int not null default 1,
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_reports (
  id uuid primary key default uuid_generate_v4(),
  target_type text not null check (target_type in ('company', 'deal', 'meeting')),
  target_id uuid not null,
  report_type text not null,
  content jsonb not null,
  google_doc_url text,
  generated_by uuid references users(id),
  prompt_id uuid references prompts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists forecast_items (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id) on delete restrict,
  forecast_month text not null, -- 'YYYY-MM'
  forecast_category text not null check (forecast_category in ('A', 'B', 'C')),
  expected_amount numeric not null,
  reflected_to_sheets boolean not null default false,
  reflected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists action_items (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id) on delete restrict,
  title text not null,
  due_date date not null,
  assignee_id uuid references users(id),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- 更新日時を自動更新するトリガー(全テーブル共通)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'users','companies','deals','meetings','transcripts',
    'prompts','generated_reports','forecast_items','action_items'
  ])
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t
    );
  end loop;
end $$;

-- インデックス(検索・結合で頻出するカラム)
create index if not exists idx_deals_company_id on deals(company_id);
create index if not exists idx_meetings_deal_id on meetings(deal_id);
create index if not exists idx_transcripts_meeting_id on transcripts(meeting_id);
create index if not exists idx_generated_reports_target on generated_reports(target_type, target_id);
create index if not exists idx_forecast_items_deal_id on forecast_items(deal_id);
create index if not exists idx_action_items_deal_id on action_items(deal_id);

-- ============================================================
-- Row Level Security(MVP版: ログイン済みユーザーは全件読み書き可、
-- 細かいロール別制御はアプリケーション層で行う。
-- Phase2でロール別のRLSポリシーに強化する)
-- ============================================================
alter table companies enable row level security;
alter table deals enable row level security;
alter table meetings enable row level security;
alter table transcripts enable row level security;
alter table generated_reports enable row level security;
alter table forecast_items enable row level security;
alter table action_items enable row level security;
alter table audit_logs enable row level security;

create policy "authenticated users can read all" on companies for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on companies for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update" on companies for update using (auth.role() = 'authenticated');

create policy "authenticated users can read all" on deals for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on deals for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update" on deals for update using (auth.role() = 'authenticated');

create policy "authenticated users can read all" on meetings for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on meetings for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can read all" on transcripts for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on transcripts for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can read all" on generated_reports for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on generated_reports for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can read all" on forecast_items for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on forecast_items for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update" on forecast_items for update using (auth.role() = 'authenticated');

create policy "authenticated users can read all" on action_items for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on action_items for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update" on action_items for update using (auth.role() = 'authenticated');

create policy "authenticated users can read audit logs" on audit_logs for select using (auth.role() = 'authenticated');
create policy "authenticated users can write audit logs" on audit_logs for insert with check (auth.role() = 'authenticated');
