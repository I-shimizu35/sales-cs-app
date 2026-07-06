-- クライアントポータルは企業ごとの共有パスワード1つでログインするため、
-- パスワード総当たり(ブルートフォース)対策として失敗試行を記録し、
-- 直近の失敗回数がしきい値を超えたら一時的にログインを拒否する。
create table if not exists client_login_attempts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists client_login_attempts_slug_created_at_idx
  on client_login_attempts (slug, created_at desc);

alter table client_login_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'client_login_attempts' and policyname = 'client_login_attempts_authenticated_all'
  ) then
    create policy client_login_attempts_authenticated_all on client_login_attempts
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
