-- 한 문서 안의 출발지·목적지·연결통로 근거를 함께 반환한다.
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
  ), per_document as (
    select document_id, doc_key, seq,
           (array_agg(chunk_id order by similarity desc, chunk_id))[1] as chunk_id,
           string_agg(content, E'\n\n' order by similarity desc, chunk_id) as content,
           max(similarity) as similarity
      from ranked
     where document_rank <= 4
     group by document_id, doc_key, seq
  )
  select chunk_id, document_id, doc_key, seq, content, similarity
    from per_document
   order by similarity desc
   limit greatest(1, least(p_limit, 50));
$fn$;

revoke all on function match_kb_chunks(extensions.vector, integer)
  from public, anon, authenticated;
grant execute on function match_kb_chunks(extensions.vector, integer)
  to service_role;
