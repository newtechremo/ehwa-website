-- ehwa_website 초기 스키마 (SQLite → Postgres 이관)
-- 적용: Supabase project jfkevhtdiicrmytmwyes (Seoul / ap-northeast-2)
-- 컬럼명은 기존 코드 호환을 위해 camelCase 따옴표 유지 (1차 이전)

-- ============ posts ============
create table if not exists public.posts (
  id              bigint primary key,
  "title"         text not null,
  "content"       text not null,
  "thumbnailImage" text,
  category        text not null check (category in ('공지','행사','뉴스')),
  status          boolean not null default true,
  "viewCount"     integer not null default 0,
  "publishedAt"   timestamptz not null,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);
create index if not exists idx_posts_status on public.posts(status);
create index if not exists idx_posts_category on public.posts(category);
create index if not exists idx_posts_published on public.posts("publishedAt");

-- ============ attachments (posts 1:N) ============
create table if not exists public.attachments (
  id          bigint generated always as identity primary key,
  "postId"    bigint not null references public.posts(id) on delete cascade,
  name        text not null,
  path        text,
  size        integer not null default 0,
  "isLegacy"  boolean not null default false,
  "legacyData" text
);
create index if not exists idx_attachments_postid on public.attachments("postId");

-- ============ featured_slots (싱글톤 id=1) ============
create table if not exists public.featured_slots (
  id        integer primary key check (id = 1),
  "slot1Id" bigint references public.posts(id) on delete set null,
  "slot2Id" bigint references public.posts(id) on delete set null,
  "slot3Id" bigint references public.posts(id) on delete set null
);
insert into public.featured_slots (id, "slot1Id", "slot2Id", "slot3Id")
values (1, null, null, null) on conflict (id) do nothing;

-- ============ RLS ============
-- 쓰기는 서버(service_role / sb_secret 키)에서만 → RLS 우회. 공개는 읽기만 허용.
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.featured_slots enable row level security;

drop policy if exists "public read active posts" on public.posts;
create policy "public read active posts" on public.posts
  for select using (status = true);

drop policy if exists "public read attachments" on public.attachments;
create policy "public read attachments" on public.attachments
  for select using (true);

drop policy if exists "public read featured" on public.featured_slots;
create policy "public read featured" on public.featured_slots
  for select using (true);

-- ============ Storage 버킷 ============
insert into storage.buckets (id, name, public)
values ('ehwa-attachments', 'ehwa-attachments', true)
on conflict (id) do nothing;
