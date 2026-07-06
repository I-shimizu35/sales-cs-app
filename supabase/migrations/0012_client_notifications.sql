-- クライアントポータル内の通知(ベルアイコン)用。
-- 商談FBの更新・次回アクションの期日超過等、クライアントが能動的に
-- 見に行かなくても気づけるようにするための通知を格納する。
create table if not exists client_notifications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_notifications_company_id_created_at_idx
  on client_notifications (company_id, created_at desc);

alter table client_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'client_notifications' and policyname = 'client_notifications_authenticated_all'
  ) then
    create policy client_notifications_authenticated_all on client_notifications
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
