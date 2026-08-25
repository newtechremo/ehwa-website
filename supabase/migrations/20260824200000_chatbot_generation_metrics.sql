alter table chatbot_logs
  add column if not exists request_id uuid,
  add column if not exists retrieval_method text,
  add column if not exists embedding_attempts integer,
  add column if not exists generation_attempts integer,
  add column if not exists model_attempts integer,
  add column if not exists embedding_error_code text,
  add column if not exists provider_error_code text;

create unique index if not exists chatbot_logs_request_id_idx
  on chatbot_logs(request_id) where request_id is not null;
