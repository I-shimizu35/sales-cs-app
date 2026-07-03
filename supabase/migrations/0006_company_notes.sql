-- ============================================================
-- 社内向けメモ(担当者間の申し送り事項)。クライアントポータルには一切表示しない。
-- Supabase SQL Editor でそのまま実行可能
-- ============================================================

create table if not exists company_notes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_notes_company_id on company_notes(company_id);

alter table company_notes enable row level security;
create policy "authenticated users can read all" on company_notes for select using (auth.role() = 'authenticated');
create policy "authenticated users can write" on company_notes for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can delete" on company_notes for delete using (auth.role() = 'authenticated');
