-- 역할별 권한(GRANT) 부여.
--
-- 운영 DB는 Supabase 대시보드에서 테이블을 만들면서 기본 권한이 자동 부여됐지만,
-- 마이그레이션 파일에는 그 내용이 없었다. 그래서 migrations만으로 새 DB를 만들면
-- anon/service_role 모두 "permission denied for table posts"가 발생해 API가 죽는다.
-- (2026-08-20 로컬 Supabase 구성 중 발견)
--
-- 실제 접근 제어는 GRANT가 아니라 RLS가 담당한다. 모든 테이블에 RLS가 켜져 있고,
-- 공개 읽기 정책이 있는 테이블만 anon이 읽을 수 있다.
-- chatbot_logs/chatbot_usage는 RLS만 켜고 정책이 없으므로 service_role 외에는 접근 불가.
--
-- 운영 DB에는 이미 동일한 권한이 있으므로 재적용해도 변화가 없다(멱등).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- 이후 추가되는 객체에도 동일하게 적용
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
