-- chatbot_usage 는 env별로 따로 집계해야 한다(preview 사용량이 production 한도를 깎으면 안 됨).
alter table chatbot_usage drop constraint if exists chatbot_usage_pkey;
alter table chatbot_usage add primary key (day, env);
