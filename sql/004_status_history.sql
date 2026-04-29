-- Ensures status_history exists.
-- Safe to run on a DB where 009_public_recommendations_reset.sql already created it.
create table if not exists status_history (
  id         serial      primary key,
  record_id  integer     not null,
  old_status text,
  new_status text,
  comment    text,
  changed_at timestamptz not null default now()
);

create index if not exists idx_status_history_changed_at on status_history(changed_at);
create index if not exists idx_status_history_record_id  on status_history(record_id);
