-- システム内部エラー(AI生成失敗・メール送信失敗・cronジョブ失敗等)を記録するテーブル。
-- audit_logsは「ユーザーが行った操作」の記録用でtarget_idがNOT NULLのため、
-- 対象を特定できない/しない一般的なシステムエラーには別テーブルを用意する。
create table if not exists error_logs (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  message text not null,
  detail jsonb,
  user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_at_idx on error_logs (created_at desc);

alter table error_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'error_logs' and policyname = 'error_logs_authenticated_all'
  ) then
    create policy error_logs_authenticated_all on error_logs
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
