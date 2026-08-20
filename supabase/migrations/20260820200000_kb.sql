-- 챗봇 지식베이스 (Phase B)
--
-- 코퍼스가 59문서로 작아 임베딩 대신 "LLM 라우터" 방식을 1순위로 검증한다
-- (통합구현플랜 11.1-#8). 문서 제목·예상질문 목록을 프롬프트에 넣어 관련 문서를
-- 고르게 하고, 선택된 문서의 '답변 가이드'를 근거로 답한다.
-- embedding 컬럼은 후보 비교를 위해 nullable로 둔다.

create table if not exists kb_documents (
  id            bigint generated always as identity primary key,
  doc_key       text not null unique,        -- 파일명 기반 안정 키 (예: '04_편의지원사업_당일 신청 문의')
  seq           integer not null,            -- 파일 앞 번호
  category      text not null,               -- [카테고리]
  topic         text not null,               -- 세부주제
  questions     text[] not null default '{}', -- 예상 질문
  answer        text not null,               -- 답변 가이드 (그대로 사용이 원칙)
  body          text not null,               -- 원문 전체
  published     boolean not null default true,
  version       integer not null default 1,
  updated_at    timestamptz not null default now()
);

create index if not exists kb_documents_seq_idx      on kb_documents (seq);
create index if not exists kb_documents_category_idx on kb_documents (category);

alter table kb_documents enable row level security;
-- 공개 읽기: 게시된 문서만 (챗봇이 anon 키로 읽을 수 있게)
drop policy if exists "public read published kb" on kb_documents;
create policy "public read published kb" on kb_documents
  for select using (published = true);

grant all on kb_documents to anon, authenticated, service_role;
