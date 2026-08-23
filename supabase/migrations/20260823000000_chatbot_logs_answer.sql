-- 대화 로그에 "실제로 내보낸 답변"과 관측 지표를 남긴다.
--
-- 기존 스키마는 질문(user_input)과 근거(ref_id/source_doc_ids)만 저장했다.
-- 버튼·FAQ 답변은 고정 문구라 ref_id로 역추적되지만, AI 답변은 매번 새로 생성되므로
-- source_doc_ids만으로는 이용자가 실제로 본 문장을 복원할 수 없다.
-- 병원 서비스에서 "챗봇이 이렇게 안내했다"는 민원이 들어오면 확인할 방법이 없다.
-- 채널톡은 대화 전문을 남기므로, 이 컬럼이 없으면 대체 시 기능이 후퇴한다.
--
-- latency/token/provider 는 비용·성능 추적용이다. 응답이 느려지거나 캐시 적중률이
-- 떨어져도 지금은 알아챌 방법이 없다.

alter table chatbot_logs
  add column if not exists answer          text,
  add column if not exists fallback_reason text,
  add column if not exists provider        text,
  add column if not exists model           text,
  add column if not exists latency_ms      integer,
  add column if not exists tokens_in       integer,
  add column if not exists tokens_out      integer,
  add column if not exists tokens_cached   integer;

-- 관리자 화면에서 한 대화를 시간순으로 펼쳐 보기 위한 인덱스
create index if not exists chatbot_logs_session_idx
  on chatbot_logs (session_id, created_at);

-- 답변 본문까지 저장하게 되어 보관량이 늘어난다. 보존기간을 코드가 아니라
-- DB 함수로 둬서 cron·수동 어느 쪽에서 호출해도 같은 규칙이 적용되게 한다.
create or replace function purge_chatbot_logs(retain_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  removed integer;
begin
  delete from chatbot_logs
   where created_at < now() - make_interval(days => retain_days);
  get diagnostics removed = row_count;
  return removed;
end;
$fn$;

revoke all on function purge_chatbot_logs(integer) from public, anon, authenticated;
grant execute on function purge_chatbot_logs(integer) to service_role;

-- ─────────────────────────────────────────────────────────
-- 일일 AI 예산을 원자적으로 차감한다.
--
-- 기존 구현은 "select ai_calls → 비교 → upsert(ai_calls+1)" 두 단계였다.
-- 동시 요청이 같은 값을 읽으면 둘 다 통과해 한도를 넘긴다. 한도는 과금 방어선이므로
-- DB 가 한 문장으로 판정·증가를 함께 처리해야 한다.
--   allowed=true  → 증가 반영됨, used 는 증가 후 값
--   allowed=false → 증가하지 않음, used 는 현재 값(없으면 한도)
-- ─────────────────────────────────────────────────────────
create or replace function consume_chatbot_budget(
  p_day date,
  p_env text,
  p_limit integer
)
returns table(used integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  current_used integer;
begin
  insert into chatbot_usage(day, env, ai_calls)
  values (p_day, p_env, 1)
  on conflict(day, env) do update
    set ai_calls = chatbot_usage.ai_calls + 1
    where chatbot_usage.ai_calls < p_limit
  returning ai_calls into current_used;

  if current_used is null then
    select ai_calls into current_used
      from chatbot_usage where day = p_day and env = p_env;
    return query select coalesce(current_used, p_limit), false;
    -- return query 는 행을 추가만 하고 계속 실행된다. 여기서 끝내지 않으면
    -- 아래 allowed=true 행까지 함께 반환돼 호출부가 2행을 받는다(실측).
    return;
  end if;

  return query select current_used, true;
end;
$fn$;

revoke all on function consume_chatbot_budget(date, text, integer) from public, anon, authenticated;
grant execute on function consume_chatbot_budget(date, text, integer) to service_role;
