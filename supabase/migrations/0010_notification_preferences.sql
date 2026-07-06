alter table users
  add column if not exists notify_overdue_actions boolean not null default true,
  add column if not exists notify_frequency text not null default 'daily'
    check (notify_frequency in ('daily', 'weekly'));
