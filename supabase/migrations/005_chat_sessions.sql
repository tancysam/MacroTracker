-- Chat sessions table: stores per-user chat histories with the MacroTracker AI.
-- Each row = one conversation session (array of messages in JSONB).

create table if not exists chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'New conversation',
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast per-user listing ordered by most recent
create index if not exists chat_sessions_user_updated
  on chat_sessions(user_id, updated_at desc);

-- Row-level security: users can only see/edit their own sessions
alter table chat_sessions enable row level security;

revoke all on table chat_sessions from anon;
grant select, insert, update, delete on table chat_sessions to authenticated;

create policy "Users can manage their own chat sessions"
  on chat_sessions
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Auto-update updated_at on any row change
create or replace function update_chat_session_timestamp()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chat_sessions_updated_at
  before update on chat_sessions
  for each row execute procedure update_chat_session_timestamp();
