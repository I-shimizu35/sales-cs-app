-- ============================================================
-- 支援ステータス(支援中/支援終了)+ 複数担当者アサイン(支援チーム)
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

alter table companies
  add column if not exists support_status text not null default 'active'
    check (support_status in ('active', 'inactive'));

-- どのクライアントに誰が支援担当としてアサインされているか(複数可)。
-- 既存の owner_user_id(権限チェックに使う単一の主担当者)とは別に、
-- 表示用の支援チームを管理する。
create table if not exists company_supporters (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_supporters_company_id on company_supporters(company_id);
create index if not exists idx_company_supporters_user_id on company_supporters(user_id);

alter table company_supporters enable row level security;
create policy "authenticated users can read all" on company_supporters for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on company_supporters for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can delete" on company_supporters for delete using (auth.role() = 'authenticated');
