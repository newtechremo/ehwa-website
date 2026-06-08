# 인프라 이전 실행계획 — Vercel + Supabase (안 A: ehwa 전용 신규 계정)

**작성일:** 2026-06-08
**대상:** `/home/finefit-temp/Desktop/project/ehwa_website`
**서비스:** 이대목동병원 장애인 이용편의 지원센터
**결정 사항:** Supabase 구성은 **안 A — ehwa 전용 신규 Google 계정 + 전용 Supabase 프로젝트**
**문서 성격:** 코드 변경 없이, 단계별 체크리스트 / SQL / 환경변수 / 롤백 / 검증을 담은 실행 계획서

> 선행 문서: `docs/인프라_이전_및_Vercel_Supabase_전략_20260514.md` (전략/배경). 본 문서는 그 전략을 **실제 코드 기준의 실행 단계**로 구체화한 것이다.

---

## 진행 현황 (2026-06-08 업데이트)

### ✅ 완료된 사항
| 항목 | 결과 |
|------|------|
| `.env.tokens` 정리 | Vercel 토큰 제거(전역 로그인 사용), Supabase 토큰만 유지 |
| **Vercel 프로젝트 link** | `remo-dev`(Pro) 팀 → 프로젝트 **`ehwa-website`** (`prj_7ep8cW3DuXnq7T6FGYEtoZx5xw4G`), **GitHub repo 자동 연결** |
| **Supabase 프로젝트 생성** | **`ehwa-website`** / ref **`jfkevhtdiicrmytmwyes`** / 리전 **서울(ap-northeast-2)** ✅ |
| 자격증명 보관 | `.env.tokens`(gitignore): `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` |
| **스키마 적용** | `supabase/migrations/20260608000000_init.sql` → Management API 적용. posts/attachments/featured_slots + RLS(공개읽기 3정책) + 버킷 `ehwa-attachments` ✅ |
| **앱 키 보관** | `.env.local`(gitignore): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(sb_publishable), `SUPABASE_SERVICE_ROLE_KEY`(sb_secret) |
| **데이터 이관** | 게시글7·첨부2·슬롯 → Supabase(REST/service_role JWT). PDF 2개 → Storage 업로드 + path 전환, size 실측 보정. **전체 검증 통과** ✅ |
| **코드 교체(DB계층)** | `lib/db.ts`→supabase-js(async), API 3종 await, `/api/upload`→Storage. better-sqlite3 제거. 브랜치 `feat/supabase-migration` |
| **운영 전환** | 백업 3중(`~/ehwa_backup_20260608/`) 후 `pm2 restart ehwa-website` → **운영 사이트 Supabase 전환 완료**. 원본 SQLite 보존 확인(타임스탬프 4/27 유지) ✅ |
| **Vercel 배포 검수** | env 3종 등록(Production/Development), pnpm stub 삭제→npm, `vercel --prod` → `https://ehwa-website.vercel.app` 빌드/배포 성공. **/api/posts·featured·페이지·Storage 전부 200 검증** ✅ (도메인 미연결이라 barrierfree 무영향) |

### 확정된 계정 구도
| 서비스 | 계정/스코프 | 플랜 | 인증 | 비고 |
|--------|-----------|------|------|------|
| **Vercel** | newtechremo → **`remo-dev` 팀** | **Pro** | 전역 로그인(`newtechremo-2759`) | 다른 운영 프로젝트와 동거 |
| **Supabase** | neuron1103 (`HyeonseokYou's Org` `ocamroqehgsepapbpcha`) | **Free + 일별 cron keepalive** | `.env.tokens` PAT | 백업 부재 → 운영 확정 시 Pro 검토 |

### 🔁 이관(transfer) 고려 — 향후 병원 인수 대비
현재 소유 계정이 Vercel(remo-dev)·Supabase(neuron1103)로 **분리**되어 있어, 추후 병원/ehwa 전용 계정으로 넘길 때 **양쪽 다 이관 필요**.
- **Vercel**: 팀↔팀 transfer 무중단 지원. 대상 팀 member 권한 필요.
- **Supabase**: 조직 간 transfer 지원하나 **리전 변경 불가** → 그래서 **처음부터 서울 리전 고정**(완료). 완전 별도 계정行은 backup/restore.
- ✅ 시사점: Supabase를 서울로 만든 것이 이관 시 제약을 없애줌. 데이터 규모도 작아 이관 부담 낮음.

### 🌐 도메인 전환 — 실측 검증 결과(2026-06-08)
| 항목 | 실측 |
|------|------|
| `barrierfree.eumc.ac.kr` | **A → `49.168.236.221`** 직결, nginx/1.18.0가 443 직접 서빙, **Let's Encrypt 정상**, HTTP 200 (Cloudflare 미사용) |
| CAA 레코드 | **없음** → Vercel(Let's Encrypt) 인증서 발급 차단 위험 없음 ✅ |
| eumc.ac.kr DNS | Gabia 네임서버 (병원 전산팀 관리) |
| remo-test.online | Cloudflare 530 (구 경로 폐기) |

→ **기술적 차단 요소 없음.** Vercel 전환 시 병원 IT에 `barrierfree` 레코드 변경 요청만 필요(A값 `76.76.21.21` 교체 또는 CNAME). 정확값은 Vercel 대시보드/`vercel domains inspect` 확인. 전례 있으므로 절차 검증됨.

### ▶ 다음 액션 (남은 작업)
1. **코드 교체(3단계)**: `lib/db.ts`(better-sqlite3) → `@supabase/supabase-js`, `/api/upload`→Storage, **API 인증 가드 + 관리자 로그인 서버화**, `lib/posts.ts` localStorage 잔재 제거 ← *현재 위치*
2. **Vercel 환경변수 등록**: `.env.local`의 3개 값을 `vercel env`로 `remo-dev/ehwa-website`에 등록(Production/Preview)
3. **cron keepalive**: 일별 DB 쿼리 + (권장)백업 덤프, `CRON_SECRET` 보호
4. **Vercel preview 검증 → 병원 IT에 DNS 변경 요청 → 전환 → 로컬 서버 종료**

### ⚠️ 이관 중 발견된 데이터 이슈
- 첨부 `size` 메타데이터가 실제 파일과 불일치했음(낱장 1443068→675829, 펼침 1445452→61439). **DB `path`가 가리키는 실제 파일을 기준으로 이관**하고 size를 실측 보정함.
- 업로드 폴더에 `_xjuf8m_`(1443068B, DB size와 일치) 등 **path가 안 가리키는 잔여 파일** 존재 → 이관 제외. 추후 정리 대상.

---

## 0. 현재 상태 스냅샷 (2026-06-08 실측)

| 항목 | 실제 값 |
|---|---|
| 호스팅 | 로컬 서버 자체 호스팅 (PM2 `ehwa-website` → nginx:3111 → Next:3112 → Cloudflare Tunnel) |
| 프레임워크 | Next.js 16.0.7 / React 19 / Node 24.13 |
| 데이터 | **SQLite** `data/ehwa.db` (`better-sqlite3`, WAL) |
| 파일 저장 | `public/uploads/attachments` (79MB, 파일 47개 / **DB 참조 2개**) |
| API | `/api/posts`, `/api/featured`, `/api/upload` (모두 **인증 없음**) |
| 관리자 인증 | `admin/admin123` 하드코딩 + `localStorage.isAuthenticated` |
| 도메인 | `barrierfree.eumc.ac.kr` → A레코드 `49.168.236.221` 직결 / `remo-test.online` → Cloudflare(530) |
| 데이터 규모 | 게시글 7개, 첨부 메타 2개, 주요소식 슬롯 1개 |

### ⚠️ 코드 정합성 이슈 (이전 전 반드시 인지)
- **`lib/posts.ts`가 아직 localStorage 기반**(`news_posts`, `featured_slots`)이다. API(`/api/*`)는 SQLite를 쓰는데, 일부 클라이언트 코드가 여전히 localStorage 함수를 호출할 수 있다 → **실제 UI가 어느 경로를 쓰는지 1단계에서 확정 필요** (`app/page.tsx`, `app/blog/page.tsx`, `app/admin/*`의 import 추적).
- `CLAUDE.md` 및 구버전 문서가 "localStorage 저장"으로 오기재되어 있다 → 이전 완료 후 일괄 갱신.

---

## 1. 실제 스키마 (SQLite → Postgres 매핑)

현재 `lib/db.ts` 기준 실제 스키마와 Supabase(Postgres) 목표 매핑.

### 1.1 `posts`
| 컬럼 | SQLite | Postgres 목표 | 비고 |
|---|---|---|---|
| id | INTEGER PK (값=`Date.now()`) | `bigint PRIMARY KEY` | autoincrement 아님. 기존 ID(밀리초 타임스탬프) **그대로 보존** |
| title | TEXT NOT NULL | `text not null` | |
| content | TEXT NOT NULL | `text not null` | Tiptap HTML |
| thumbnailImage | TEXT | `text` | **base64 문자열**. 1차 이전 시 유지, 추후 Storage URL 전환 |
| category | TEXT CHECK(공지/행사/뉴스) | `text check (category in ('공지','행사','뉴스'))` | enum 대신 check 유지 권장 |
| status | INTEGER(0/1) | `boolean not null default true` | 변환 시 `1→true` |
| viewCount | INTEGER | `integer not null default 0` | |
| publishedAt | TEXT(ISO) | `timestamptz` | |
| createdAt | TEXT(ISO) | `timestamptz default now()` | |
| updatedAt | TEXT(ISO) | `timestamptz default now()` | |

### 1.2 `attachments` (posts와 1:N)
| 컬럼 | SQLite | Postgres 목표 | 비고 |
|---|---|---|---|
| id | INTEGER PK AUTOINCREMENT | `bigint generated always as identity` | |
| postId | INTEGER FK | `bigint references posts(id) on delete cascade` | |
| name | TEXT | `text not null` | 원본 파일명 |
| path | TEXT | `text` | 현재 `/uploads/attachments/...` → **Supabase Storage URL로 교체 대상** |
| size | INTEGER | `integer not null default 0` | |
| isLegacy | INTEGER(0/1) | `boolean not null default false` | base64 첨부 여부 |
| legacyData | TEXT | `text` | base64 데이터. Storage로 옮기고 비우는 것을 권장 |

### 1.3 `featured_slots` (싱글톤, id=1 고정)
| 컬럼 | SQLite | Postgres 목표 |
|---|---|---|
| id | INTEGER CHECK(id=1) | `integer primary key check (id = 1)` |
| slot1Id/slot2Id/slot3Id | INTEGER FK(ON DELETE SET NULL) | `bigint references posts(id) on delete set null` |

> 컬럼명이 camelCase다. Postgres는 따옴표 없이는 소문자로 접힌다. **선택: (a) `"thumbnailImage"` 식 따옴표 유지(코드 변경 최소) / (b) snake_case로 정규화(권장, 단 매핑 코드 필요).** → 3단계 코드 교체에서 결정. 본 계획은 **(a) 따옴표 유지로 1차 이전 → 이후 정리**를 기본값으로 둔다.

---

## 2. 단계별 실행 계획

```
0단계 사전정리   토큰 폐기 · git data 충돌 해소 · lockfile 정리        [코드 외]
1단계 Supabase   ehwa 전용 계정/프로젝트 · 스키마 · Storage · RLS       [SQL]
2단계 데이터이관 SQLite export → Postgres import · 첨부파일 선별 업로드  [스크립트]
3단계 코드교체   lib/db.ts→Supabase · API 3종 · 인증 추가 · posts.ts 정리 [코드]
4단계 Vercel     프로젝트 연결 · 환경변수 · preview → production         [배포]
5단계 도메인     barrierfree.eumc.ac.kr DNS 변경 (Gabia/병원 전산팀)     [외부의존]
6단계 검증/정리  E2E 검증 · 기존 로컬서버 의존 제거                       [운영]
```

---

### 0단계 — 사전 정리 (이전 전 필수)

- [ ] **노출된 GitHub 토큰 폐기(revoke)** — GitHub Settings → Developer settings → PAT에서 `ghp_53Rn...` 폐기 후 신규 발급
- [ ] remote URL에서 토큰 제거: `git remote set-url origin https://github.com/newtechremo/ehwa-website.git`
- [ ] GitHub용 credential helper 설정 (현재 `aws codecommit`으로 잡혀 GitHub 미동작) 또는 `gh auth login`
- [ ] **git data 충돌 해소**: `data/posts.json(50.9MB)`, `data/featured.json`이 `DU`(우리가 삭제/원격이 수정) 상태. 의도(`data/` gitignore)대로 추적 해제:
  ```bash
  git rm --cached data/posts.json data/featured.json
  git commit -m "chore: data 런타임 파일 git 추적 해제 및 충돌 정리"
  ```
- [ ] **lockfile 정리**: `package-lock.json` + `pnpm-lock.yaml` + 상위 `~/package-lock.json`(91B) 혼재 → **하나로 통일**(npm 권장). 상위 폴더 lockfile이 Next workspace root 오인 경고 유발 → 제거 검토
- [ ] `.omc/`, `docs/superpowers/` 등 untracked 정리 또는 gitignore 반영
- [ ] 현재 `data/ehwa.db` + `public/uploads/attachments` **전체 백업** (이전 실패 대비 원본 보존)

**롤백:** 이 단계는 git 메타/자격증명만 변경. 문제 시 `git remote set-url`로 원복, 백업본으로 데이터 복구.

---

### 1단계 — Supabase 프로젝트 구성 (안 A)

- [ ] **ehwa 관리용 Google 계정 생성** (예: `ehwa.barrierfree@gmail.com`) — 2FA, 복구 이메일, 관리자 2인 이상 설정
- [ ] 해당 계정으로 Supabase Organization/Project 생성 (Region: `Northeast Asia (Seoul) ap-northeast-2`)
- [ ] CLI는 newtechremo 토큰과 **분리 운용**:
  ```bash
  SUPABASE_ACCESS_TOKEN=<EHWA_TOKEN> npx supabase projects list
  # 또는 npx supabase login --name ehwa --token <EHWA_TOKEN>
  ```
- [ ] **스키마 생성** (Supabase SQL Editor 또는 마이그레이션):

```sql
-- posts
create table if not exists posts (
  id            bigint primary key,
  "title"       text not null,
  "content"     text not null,
  "thumbnailImage" text,
  category      text not null check (category in ('공지','행사','뉴스')),
  status        boolean not null default true,
  "viewCount"   integer not null default 0,
  "publishedAt" timestamptz not null,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_category on posts(category);
create index if not exists idx_posts_published on posts("publishedAt");

-- attachments
create table if not exists attachments (
  id          bigint generated always as identity primary key,
  "postId"    bigint not null references posts(id) on delete cascade,
  name        text not null,
  path        text,
  size        integer not null default 0,
  "isLegacy"  boolean not null default false,
  "legacyData" text
);
create index if not exists idx_attachments_postid on attachments("postId");

-- featured_slots (싱글톤)
create table if not exists featured_slots (
  id       integer primary key check (id = 1),
  "slot1Id" bigint references posts(id) on delete set null,
  "slot2Id" bigint references posts(id) on delete set null,
  "slot3Id" bigint references posts(id) on delete set null
);
insert into featured_slots (id, "slot1Id", "slot2Id", "slot3Id")
values (1, null, null, null) on conflict (id) do nothing;
```

- [ ] **Storage 버킷 생성**: `ehwa-attachments` (Public read / 업로드는 service role 또는 인증 사용자만)
- [ ] **RLS 정책 설계**:
  - `posts`: 공개 SELECT는 `status = true`만 허용. INSERT/UPDATE/DELETE는 service role(서버 전용) 또는 인증된 관리자만
  - `attachments`, `featured_slots`: 공개 SELECT 허용, 쓰기는 서버 전용
  - 관리자 쓰기를 API Route에서 **service role 키로 서버에서만** 수행하면 RLS는 "공개 읽기 + 클라이언트 쓰기 차단"으로 단순화 가능

**롤백:** Supabase 프로젝트는 격리됨. 문제 시 테이블 drop 후 재생성, 또는 프로젝트 삭제. 기존 로컬 서비스에 영향 없음.

---

### 2단계 — 데이터 이관

- [ ] SQLite에서 export (스크립트 작성):
  - `posts` → JSON (status `1→true`, 날짜 ISO 유지, id 보존)
  - `attachments` → JSON (`isLegacy 1→true`)
  - `featured_slots` (id=1 행)
- [ ] **첨부파일 선별 업로드**: 업로드 폴더 47개 중 **DB가 참조하는 파일만**(현재 2개) `ehwa-attachments` 버킷으로 업로드. 나머지 45개는 이관 제외(잔여물)
- [ ] 업로드 후 `attachments.path`를 **Supabase Storage public URL**로 갱신
- [ ] `legacyData`(base64) 첨부: Storage로 업로드 후 `path` 설정 + `isLegacy=false`로 전환 (선택, 1차에서는 유지 가능)
- [ ] `thumbnailImage` base64: 1차 이전 시 **그대로 유지**(text). 추후 Storage URL 전환은 별도 작업
- [ ] import 검증: 게시글 7개 / 첨부 2개 / 슬롯값 일치 확인

> 참고: 기존 `/api/posts` POST는 **배열을 받으면 전체 import** 하는 마이그레이션 경로가 이미 있음(`route.ts:56`). 이관 시 재활용 가능.

**롤백:** Postgres 테이블 `truncate` 후 재import. 원본 SQLite/파일은 0단계 백업으로 보존.

---

### 3단계 — 코드 교체

- [ ] **실제 사용 경로 확정**: `app/page.tsx`, `app/blog/page.tsx`, `app/admin/*`가 `lib/posts.ts`(localStorage) vs `lib/api.ts`+`/api/*`(SQLite) 중 무엇을 호출하는지 추적 → localStorage 잔재 제거
- [ ] `better-sqlite3` 제거, `@supabase/supabase-js`(+ 필요 시 `@supabase/ssr`) 도입
- [ ] `lib/db.ts` → Supabase 클라이언트 기반으로 재작성 (동일 함수 시그니처 유지하면 API Route 변경 최소화)
  - 서버 전용 client: `SUPABASE_SERVICE_ROLE_KEY` 사용 (절대 클라이언트 노출 금지)
- [ ] `/api/posts` · `/api/featured` · `/api/upload`를 Supabase CRUD / Storage 업로드로 교체
  - `/api/upload`: `fs.writeFileSync` → Supabase Storage `upload()`
- [ ] **인증 추가** (현재 전무):
  - 관리자 로그인을 서버 검증으로 변경 (Supabase Auth 또는 서버 세션 + 서명 쿠키)
  - `admin/admin123` 하드코딩 제거, `localStorage.isAuthenticated` 제거
  - **쓰기 계열 API(`POST`/`DELETE`)에 서버 인증 가드 추가**
- [ ] `next.config.mjs`: CORS `*` 축소, `ignoreBuildErrors: true` 제거 또는 최소화
- [ ] 빌드 타입 오류 점검 (`ignoreBuildErrors` 해제 시 노출될 수 있음)

**롤백:** 브랜치 분리(`feat/supabase-migration`)에서 작업. 문제 시 main의 SQLite 버전으로 즉시 복귀. 로컬 서버는 이전 완료 전까지 계속 운영.

---

### 4단계 — Vercel 배포

- [ ] Vercel 프로젝트 생성 + GitHub repo(`newtechremo/ehwa-website`) 연결
- [ ] **환경변수 등록**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
  - `CRON_SECRET` (keepalive cron 보호용)
  - (관리자 인증 방식에 따라) 세션 시크릿 등
- [ ] **Preview 배포**로 전체 기능 검증 (DNS 변경 전, preview URL로 사전 확인)
- [ ] (선택) Free pause 대비 `vercel.json` cron으로 1일 1회 keepalive:
  ```json
  { "crons": [{ "path": "/api/cron/supabase-keepalive", "schedule": "0 0 * * *" }] }
  ```
- [ ] Production 배포

**롤백:** Vercel은 즉시 이전 배포로 롤백 가능. 도메인 전환 전이므로 사용자 영향 0.

---

### 5단계 — 도메인 전환

현재 `barrierfree.eumc.ac.kr`은 Gabia DNS에서 A레코드 `49.168.236.221`(현 서버) 직결.

- [ ] Vercel 프로젝트에 `barrierfree.eumc.ac.kr` custom domain 추가 → Vercel 안내 DNS 값 확인
- [ ] **병원 전산팀/Gabia 관리자에 DNS 변경 요청** (기존 A레코드 → Vercel 안내값)
- [ ] DNS 전파 후 Vercel SSL 자동 발급 확인
- [ ] `https://barrierfree.eumc.ac.kr/` 운영 검증

**롤백:** DNS를 기존 A레코드 `49.168.236.221`로 되돌리면 로컬 서버로 즉시 복귀(로컬 서버를 6단계 전까지 유지하는 이유).

---

### 6단계 — 검증 및 정리

검증 체크리스트:
- [ ] `/` 랜딩 페이지 렌더링
- [ ] `/blog` 게시글 목록
- [ ] 게시글 모달 / 첨부파일 다운로드 (Storage URL)
- [ ] `/admin/login` 로그인 (신규 인증)
- [ ] 게시글 생성/수정/삭제
- [ ] 주요 소식 슬롯 저장
- [ ] 파일 업로드 (Storage 반영)
- [ ] 인증 없는 API 쓰기 요청이 **차단**되는지 확인
- [ ] Vercel logs / Supabase logs / Cron 로그 확인
- [ ] 접근성 기능(고대비/수어/글자크기) 정상 동작

정리:
- [ ] 도메인/서비스 안정 확인 후 로컬 nginx/cloudflared/PM2 의존 제거 또는 백업 전환
- [ ] `CLAUDE.md` 및 구버전 문서의 "localStorage" 기술 → "Supabase"로 갱신
- [ ] 운영 확정 시 Supabase Pro 전환 검토(예산 반영)

---

## 3. 환경변수 요약

| 변수 | 위치 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | 공개 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | 공개 가능(RLS 전제) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **서버 전용 / 절대 비공개** |
| `CRON_SECRET` | Vercel | 비공개 |

---

## 4. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| Supabase Free pause | Cron keepalive, 운영 확정 후 Pro |
| API 무단 호출(현재 인증 없음) | 3단계에서 service role 서버 전용 + 쓰기 API 인증 가드 |
| 파일 이관 누락 | DB 참조 기준 선별(47개 중 2개) |
| DNS 전환 지연 | Vercel preview URL로 사전 검증, 로컬 서버 병행 유지 |
| camelCase 컬럼 | 1차는 따옴표 유지, 추후 snake_case 정규화 |
| `ignoreBuildErrors` 해제 시 타입오류 | 3단계에서 사전 점검 |
| localStorage 잔재(`lib/posts.ts`) | 3단계에서 사용 경로 확정 후 제거 |

---

## 5. 미결 결정 사항 (실행 중 확정)

1. **컬럼 네이밍**: camelCase 따옴표 유지(기본값) vs snake_case 정규화
2. **관리자 인증 방식**: Supabase Auth vs 서버 세션(서명 쿠키) — 사용자 수가 적어 후자도 충분
3. **thumbnailImage/base64 첨부**: 1차 유지 vs 즉시 Storage 전환
4. **keepalive cron** 도입 여부 (Free 운영 기간에만 필요)

---

**다음 액션:** 이 계획 검토 후 승인 시 → **0단계(사전 정리)** 부터 실제 작업 착수. 0단계는 코드 로직 변경이 없어 가장 안전한 시작점이다.
