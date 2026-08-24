create extension if not exists vector with schema extensions;

create table kb_chunks (
  id bigint generated always as identity primary key,
  document_id bigint not null references kb_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  content_hash text not null,
  embedding extensions.vector(768) not null,
  updated_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index kb_chunks_embedding_idx on kb_chunks
using hnsw (embedding extensions.vector_cosine_ops);
alter table kb_chunks enable row level security;
revoke all on table kb_chunks from public, anon, authenticated;
grant select, insert, update, delete on table kb_chunks to service_role;
grant usage, select on sequence kb_chunks_id_seq to service_role;

create or replace function match_kb_chunks(
  p_embedding extensions.vector(768),
  p_limit integer default 12
)
returns table(
  chunk_id bigint,
  document_id bigint,
  doc_key text,
  seq integer,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $fn$
  with ranked as (
    select c.id as chunk_id, d.id as document_id, d.doc_key, d.seq, c.content,
           1 - (c.embedding <=> p_embedding) as similarity,
           row_number() over (
             partition by d.id order by c.embedding <=> p_embedding
           ) as document_rank
      from kb_chunks c
      join kb_documents d on d.id = c.document_id
     where d.published = true
  )
  select chunk_id, document_id, doc_key, seq, content, similarity
    from ranked
   where document_rank = 1
   order by similarity desc
   limit greatest(1, least(p_limit, 50));
$fn$;

revoke all on function match_kb_chunks(extensions.vector, integer)
  from public, anon, authenticated;
grant execute on function match_kb_chunks(extensions.vector, integer)
  to service_role;
