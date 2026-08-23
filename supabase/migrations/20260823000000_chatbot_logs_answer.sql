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
