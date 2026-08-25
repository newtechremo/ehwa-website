-- AI 제공자 호출을 namespace/KST 일자별로 제한하고 모든 시도를 감사한다.
create table chatbot_usage_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  day date not null,
  env text not null,
  session_hash text not null,
  operation text not null check (operation in ('embedding','generation','adjustment')),
  outcome text not null check (outcome in ('allowed','exhausted','adjusted')),
  delta integer not null,
  used_after integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index chatbot_usage_events_env_day_idx
  on chatbot_usage_events(env, day, created_at);
alter table chatbot_usage_events enable row level security;
revoke all on table chatbot_usage_events from public, anon, authenticated;
grant select on table chatbot_usage_events to service_role;

create or replace function consume_chatbot_budget_v2(
  p_day date,
  p_env text,
  p_limit integer,
  p_event_id uuid,
  p_session_hash text,
  p_operation text
)
returns table(used integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  current_used integer;
  was_allowed boolean;
begin
  if p_limit <= 0 then raise exception 'p_limit must be positive'; end if;
  if p_env !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,63}$' then raise exception 'invalid namespace'; end if;
  if p_operation not in ('embedding', 'generation') then raise exception 'invalid operation'; end if;
  if coalesce(p_session_hash, '') = '' then raise exception 'session hash is required'; end if;

  insert into chatbot_usage(day, env, ai_calls)
  values (p_day, p_env, 1)
  on conflict(day, env) do update
    set ai_calls = chatbot_usage.ai_calls + 1
    where chatbot_usage.ai_calls < p_limit
  returning ai_calls into current_used;

  was_allowed := current_used is not null;
  if not was_allowed then
    select ai_calls into current_used
      from chatbot_usage where day = p_day and env = p_env;
    current_used := coalesce(current_used, p_limit);
  end if;

  insert into chatbot_usage_events(
    event_id, day, env, session_hash, operation, outcome, delta, used_after
  ) values (
    p_event_id, p_day, p_env, p_session_hash, p_operation,
    case when was_allowed then 'allowed' else 'exhausted' end,
    case when was_allowed then 1 else 0 end,
    current_used
  );

  return query select current_used, was_allowed;
end;
$fn$;

revoke all on function consume_chatbot_budget_v2(date, text, integer, uuid, text, text)
  from public, anon, authenticated;
grant execute on function consume_chatbot_budget_v2(date, text, integer, uuid, text, text)
  to service_role;

create or replace function adjust_chatbot_budget(
  p_day date,
  p_env text,
  p_new_value integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  previous_used integer;
begin
  if p_new_value < 0 then raise exception 'p_new_value must not be negative'; end if;
  if p_env !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,63}$' then raise exception 'invalid namespace'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason is required'; end if;

  select ai_calls into previous_used
    from chatbot_usage where day = p_day and env = p_env for update;
  previous_used := coalesce(previous_used, 0);

  insert into chatbot_usage(day, env, ai_calls)
  values (p_day, p_env, p_new_value)
  on conflict(day, env) do update set ai_calls = excluded.ai_calls;

  insert into chatbot_usage_events(
    event_id, day, env, session_hash, operation, outcome, delta, used_after, reason
  ) values (
    gen_random_uuid(), p_day, p_env, 'manual', 'adjustment', 'adjusted',
    p_new_value - previous_used, p_new_value, trim(p_reason)
  );

  return p_new_value;
end;
$fn$;

revoke all on function adjust_chatbot_budget(date, text, integer, text)
  from public, anon, authenticated;
grant execute on function adjust_chatbot_budget(date, text, integer, text)
  to service_role;
