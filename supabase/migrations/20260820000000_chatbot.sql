-- 챗봇 Phase A 스키마 (순수 가산 — 기존 posts/attachments/featured_slots 미변경)
--
-- Supabase Free 플랜의 조직당 프로젝트 2개 한도로 별도 dev 프로젝트를 만들 수 없어,
-- env 컬럼으로 preview(dev)/production 행을 분리한다. 전환 시 dev 행만 삭제하면 된다.

create table if not exists chatbot_logs (
  id           bigint generated always as identity primary key,
  env          text        not null default 'development',
  session_id   text        not null,
  kind         text        not null check (kind in ('button','faq_hit','policy_block','ai_answer','fallback')),
  user_input   text,                       -- maskPII() 적용 후 저장
  ref_id       text,                       -- 노드/FAQ/정책 ID
  source_doc_ids text[],                   -- Phase B: AI 근거 문서
  created_at   timestamptz not null default now()
);

create index if not exists chatbot_logs_created_idx on chatbot_logs (created_at desc);
create index if not exists chatbot_logs_kind_idx    on chatbot_logs (env, kind);

-- 정책을 만들지 않음 = anon/authenticated 접근 불가, service_role만 접근 가능
alter table chatbot_logs enable row level security;

-- Phase B AI 서킷브레이커용 일일 카운터
create table if not exists chatbot_usage (
  day       date primary key,
  env       text not null default 'development',
  ai_calls  integer not null default 0
);
alter table chatbot_usage enable row level security;
