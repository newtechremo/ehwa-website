\set ON_ERROR_STOP on

begin;
delete from chatbot_usage_events where env = 'test-budget-v2';
delete from chatbot_usage where env = 'test-budget-v2';

do $test$
declare
  result record;
  outcomes text[];
  operations text[];
  current_used integer;
begin
  select * into result from consume_chatbot_budget_v2(
    date '2026-08-24', 'test-budget-v2', 2,
    '00000000-0000-0000-0000-000000000001', 'session', 'embedding'
  );
  if result.allowed is not true or result.used <> 1 then raise exception 'first call failed: %', result; end if;

  select * into result from consume_chatbot_budget_v2(
    date '2026-08-24', 'test-budget-v2', 2,
    '00000000-0000-0000-0000-000000000002', 'session', 'generation'
  );
  if result.allowed is not true or result.used <> 2 then raise exception 'second call failed: %', result; end if;

  select * into result from consume_chatbot_budget_v2(
    date '2026-08-24', 'test-budget-v2', 2,
    '00000000-0000-0000-0000-000000000003', 'session', 'generation'
  );
  if result.allowed is not false or result.used <> 2 then raise exception 'limit call failed: %', result; end if;

  select array_agg(outcome order by id), array_agg(operation order by id)
    into outcomes, operations
    from chatbot_usage_events where env = 'test-budget-v2';
  if outcomes <> array['allowed','allowed','exhausted'] then raise exception 'bad outcomes: %', outcomes; end if;
  if operations <> array['embedding','generation','generation'] then raise exception 'bad operations: %', operations; end if;

  perform adjust_chatbot_budget(date '2026-08-24', 'test-budget-v2', 1, 'test adjustment');
  select ai_calls into current_used from chatbot_usage
    where day = date '2026-08-24' and env = 'test-budget-v2';
  if current_used <> 1 then raise exception 'adjustment failed: %', current_used; end if;
  if not exists (
    select 1 from chatbot_usage_events
    where env = 'test-budget-v2' and operation = 'adjustment'
      and outcome = 'adjusted' and delta = -1 and used_after = 1
  ) then raise exception 'adjustment event missing'; end if;
end;
$test$;

rollback;

do $test$
begin
  if exists (select 1 from chatbot_usage_events where env = 'test-budget-v2') then
    raise exception 'rollback left audit rows';
  end if;
end;
$test$;

select 'chatbot-budget: PASS' as result;
