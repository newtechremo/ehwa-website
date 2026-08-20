# ehwa_website 인프라 이전 및 Vercel/Supabase 운영 전략

**작성일:** 2026-05-14  
**대상 프로젝트:** `/home/finefit-temp/Desktop/project/ehwa_website`  
**서비스명:** 이대목동병원 장애인 이용편의 지원센터

---

## 1. 결론

현재 `ehwa_website`는 로컬 서버의 PM2/Next.js, nginx, Cloudflare Tunnel, 로컬 SQLite/파일시스템에 의존한다. 서버가 다른 지역으로 이동 예정이고 외부 SaaS 연동 및 도메인 이동이 예정되어 있다면, 운영 안정성 측면에서 Vercel 이전은 타당하다.

다만 현재 코드를 그대로 Vercel에 올리는 것은 권장하지 않는다. 이유는 다음 두 가지다.

1. `data/ehwa.db` SQLite 파일에 CMS 데이터가 저장된다.
2. 첨부파일 업로드가 `public/uploads/attachments` 로컬 디렉터리에 저장된다.

Vercel Functions는 영구 로컬 파일시스템을 운영 DB/파일 저장소로 쓰는 구조에 적합하지 않다. 따라서 Vercel 이전 시 DB와 파일 저장소를 관리형 서비스로 분리해야 한다.

**권장안:**  
`Vercel + ehwa 전용 Supabase 프로젝트 + Supabase Storage + Vercel Cron 보조 health check`

---

## 2. 현재 운영 구조

현재 실제 서비스 실행 구조는 다음과 같다.

```text
사용자
  -> barrierfree.eumc.ac.kr / remo-test.online
  -> nginx
  -> localhost:3112
  -> PM2 ehwa-website
  -> Next.js app
  -> data/ehwa.db + public/uploads/attachments
```

확인된 실행 정보:

| 항목 | 값 |
|---|---|
| PM2 앱명 | `ehwa-website` |
| 실행 경로 | `/home/finefit-temp/Desktop/project/ehwa_website` |
| 실행 명령 | `npm run start` |
| 실제 Next 명령 | `next start --port 3112 --hostname 0.0.0.0` |
| Next.js 버전 | `16.0.7` |
| Node.js 버전 | `24.13.0` |
| nginx proxy 대상 | `http://localhost:3112` |

관련 코드:

| 파일 | 역할 |
|---|---|
| `package.json` | `dev`, `build`, `start` 스크립트 |
| `app/page.tsx` | 공개 랜딩 페이지 |
| `app/blog/page.tsx` | 알림/소식 페이지 |
| `app/admin/*` | 관리자 CMS |
| `app/api/posts/route.ts` | 게시글 API |
| `app/api/featured/route.ts` | 주요 소식 슬롯 API |
| `app/api/upload/route.ts` | 첨부파일 업로드 API |
| `lib/db.ts` | SQLite 접근 계층 |

---

## 3. 기존 도메인 문서와 최신 확인 결과 차이

기존 문서에는 `barrierfree.eumc.ac.kr`이 CNAME 변경 대기 상태라고 기록되어 있다.

관련 문서:

- `docs/도메인_연결_현황_20260105.md`
- `docs/도메인_연결_가이드_barrierfree.eumc.ac.kr.md`
- `docs/프로젝트_현황_20260107.md`

그러나 2026-05-14 기준 최신 확인 결과는 다음과 다르다.

| 항목 | 최신 확인 결과 |
|---|---|
| `barrierfree.eumc.ac.kr` CNAME | 없음 |
| `barrierfree.eumc.ac.kr` A 레코드 | `49.168.236.221` |
| `eumc.ac.kr` 네임서버 | Gabia 계열 |
| `https://barrierfree.eumc.ac.kr/` | `200 OK`, nginx 응답 |
| `https://remo-test.online/` | Cloudflare `530` 응답 확인 |

즉, 현재 병원 도메인은 Cloudflare Tunnel CNAME 방식이 아니라, 서버 공인 IP `49.168.236.221`을 직접 바라보는 A 레코드 방식으로 동작 중이다.

Vercel로 이전하려면 병원 전산팀 또는 Gabia DNS 관리자에게 `barrierfree` 레코드 변경을 요청해야 한다.

---

## 4. 현재 SQLite에 들어 있는 데이터

현재 SQLite는 관리자 CMS 데이터 저장소로 사용된다.

DB 파일:

```text
data/ehwa.db
data/ehwa.db-wal
data/ehwa.db-shm
```

테이블:

| 테이블 | 내용 |
|---|---|
| `posts` | 알림/소식 게시글 |
| `attachments` | 게시글 첨부파일 메타데이터 |
| `featured_slots` | 주요 소식 3개 슬롯 |

현재 데이터 규모:

| 항목 | 값 |
|---|---:|
| 게시글 | 7개 |
| 활성 게시글 | 7개 |
| 첨부 메타데이터 | 2개 |
| 주요 소식 슬롯 | 1개 |
| `ehwa.db` | 1.3MB |
| `ehwa.db-wal` | 4.5MB |
| `public/uploads/attachments` | 79MB |
| DB에 연결된 첨부파일 합계 | 약 2.9MB |

주의할 점:

- 업로드 디렉터리에는 파일 47개가 있으나 DB가 참조하는 첨부파일은 2개다.
- 이전 전에는 실제 게시글에 연결된 파일과 불필요한 잔여 파일을 분리해야 한다.
- 게시글 대표 이미지는 DB의 `thumbnailImage` 필드에 base64 문자열로 저장되어 있다.

---

## 5. Vercel 이전 시 그대로 배포하기 어려운 이유

### 5.1 SQLite 파일 DB 문제

현재 `lib/db.ts`는 `better-sqlite3`로 `process.cwd()/data/ehwa.db`를 열고 쓴다.

```text
lib/db.ts
  -> data/ehwa.db
```

이 구조는 장기 실행 단일 서버에서는 가능하지만, Vercel 서버리스 배포에는 맞지 않는다. Vercel에서 함수 실행 환경은 요청마다 분리될 수 있고, 배포 파일시스템을 운영 DB로 지속 쓰기하는 구조가 아니다.

### 5.2 로컬 업로드 파일 문제

현재 `app/api/upload/route.ts`는 업로드 파일을 다음 경로에 저장한다.

```text
public/uploads/attachments
```

Vercel 배포 후에는 이 경로를 영구 업로드 저장소로 사용할 수 없다. 업로드 파일은 Supabase Storage, Vercel Blob, S3 같은 외부 파일 저장소로 보내야 한다.

### 5.3 관리자 인증 문제

현재 관리자 로그인은 클라이언트에서 하드코딩 계정으로 처리된다.

```text
admin / admin123
localStorage.isAuthenticated = "true"
```

또한 `/api/posts`, `/api/featured`, `/api/upload`는 서버 측 인증 검증이 없다. Vercel 이전 후 공개 인터넷에 직접 노출되면 API 보호가 필요하다.

---

## 6. 선택 가능한 이전 전략

### 안 A. Vercel + ehwa 전용 Supabase 프로젝트

```text
Vercel
  -> Next.js
  -> Supabase Database
  -> Supabase Storage
  -> Supabase Auth 또는 서버 인증
```

장점:

- 서비스 소유권과 데이터 경계가 명확하다.
- 병원/ehwa 전용 Google 계정으로 관리 가능하다.
- 추후 병원 측에 계정 이관이 쉽다.
- Supabase Free 프로젝트 한도를 별도 계정 기준으로 활용할 수 있다.

단점:

- Free 플랜은 비활성 pause 가능성이 있다.
- 운영 서비스라면 Pro 전환 가능성을 열어둬야 한다.

### 안 B. Vercel + 기존 Supabase Pro 프로젝트 내 ehwa schema 추가

```text
Vercel
  -> Next.js
  -> 기존 Supabase Pro 프로젝트
     -> ehwa_posts
     -> ehwa_attachments
     -> ehwa_featured_slots
     -> ehwa-attachments bucket
```

장점:

- Supabase 추가 프로젝트 비용을 줄일 수 있다.
- 현재 데이터 규모가 작아 기존 프로젝트에 부담이 작다.

단점:

- 다른 서비스와 DB/Storage를 공유한다.
- 권한, 백업, 장애 영향 범위가 섞인다.
- 병원 서비스 데이터 경계가 약해질 수 있다.

### 안 C. 정적 사이트 전환

```text
Vercel
  -> Next.js static pages
  -> 게시글 JSON/MD 파일
  -> 관리자 CMS 제거 또는 비활성화
```

장점:

- DB 비용이 없다.
- 운영 구조가 가장 단순하다.
- 서버 장애 지점이 거의 없다.

단점:

- 관리자 페이지에서 게시글을 직접 수정할 수 없다.
- 게시글 변경 시 개발자 수정 및 재배포가 필요하다.

---

## 7. 권장 의사결정

현재 조건:

- 로컬 서버가 다른 지역으로 이동 예정
- 외부 SaaS 연동 및 도메인 이동 예정
- 운영 안정성 확보 필요
- Supabase 계정에는 이미 Free 프로젝트 2개가 있어 추가 프로젝트 생성 시 비용 이슈 존재
- 별도 ehwa 관리용 Google 계정 생성 가능성 있음
- Supabase 결제는 다른 서버 추가 등록 때문에 진행될 가능성이 있음

이 조건에서는 다음 순서를 권장한다.

### 1순위: ehwa 관리용 Google 계정으로 Supabase 별도 생성

ehwa 전용 Google 계정으로 Supabase Organization/Project를 만들고, CLI는 프로필 또는 `SUPABASE_ACCESS_TOKEN` 방식으로 newtechremo 계정과 분리한다.

```bash
npx supabase login --name ehwa --token <EHWA_TOKEN>
npx supabase --profile ehwa link --project-ref <EHWA_PROJECT_REF>
```

또는 명령마다 토큰을 명시한다.

```bash
SUPABASE_ACCESS_TOKEN=<EHWA_TOKEN> npx supabase projects list
```

이렇게 하면 현재 서버의 newtechremo Supabase CLI 토큰을 덮어쓰지 않고 운영할 수 있다.

### 2순위: Free + Vercel Cron으로 초기 운영

Supabase Free는 비활성 시 pause 가능성이 있다. 초기 이전 단계에서는 Vercel Cron으로 하루 1회 health check를 호출해 운영 상태를 모니터링할 수 있다.

```json
{
  "crons": [
    {
      "path": "/api/cron/supabase-keepalive",
      "schedule": "0 0 * * *"
    }
  ]
}
```

단, 이는 운영 안정성을 보장하는 정식 대안이 아니라 초기 비용 절감 및 전환 안정화용 보조 장치로 봐야 한다.

### 3순위: 운영 확정 후 Pro 전환 검토

병원 서비스가 정식 운영 상태로 확정되고, 관리자 CMS와 첨부파일 기능이 계속 필요하면 Supabase Pro 전환을 검토한다.

---

## 8. 목표 아키텍처

권장 목표 구조:

```text
사용자
  -> barrierfree.eumc.ac.kr
  -> Vercel Edge
  -> Next.js
     -> 공개 페이지 /
     -> 알림/소식 /blog
     -> 관리자 /admin
     -> API Routes
        -> Supabase Database
        -> Supabase Storage
```

데이터 매핑:

| 현재 | 이전 후 |
|---|---|
| `data/ehwa.db.posts` | Supabase `posts` |
| `data/ehwa.db.attachments` | Supabase `attachments` |
| `data/ehwa.db.featured_slots` | Supabase `featured_slots` |
| `public/uploads/attachments/*` | Supabase Storage bucket |
| 대표 이미지 base64 | 유지 가능, 장기적으로 Storage URL 전환 권장 |
| `localStorage` 관리자 인증 | Supabase Auth 또는 서버 세션 인증 |

---

## 9. 도메인 이전 절차

현재 `barrierfree.eumc.ac.kr`은 Gabia DNS에서 A 레코드로 현재 서버 IP를 바라보는 상태다.

Vercel 이전 절차:

1. Vercel 프로젝트 생성 및 GitHub repo 연결
2. Vercel preview 배포
3. Vercel 프로젝트에 `barrierfree.eumc.ac.kr` custom domain 추가
4. Vercel이 안내하는 DNS 검증값 확인
5. 병원 전산팀 또는 Gabia DNS 관리자에게 DNS 변경 요청
6. DNS 전파 후 Vercel SSL 자동 발급 확인
7. `https://barrierfree.eumc.ac.kr/` 운영 검증
8. 기존 서버/nginx/cloudflared 의존 제거 또는 백업 전환

전산팀 요청 예시:

```text
안녕하세요.

barrierfree.eumc.ac.kr 서비스를 Vercel 관리형 배포 환경으로 이전하려고 합니다.

현재 barrierfree.eumc.ac.kr은 A 레코드로 49.168.236.221을 바라보고 있습니다.
Vercel 프로젝트에 도메인을 등록했으며, 아래 DNS 레코드 변경이 필요합니다.

Vercel에서 안내한 값:
- Type: CNAME 또는 TXT/A 중 Vercel 안내값
- Host: barrierfree
- Value: <Vercel Dashboard에서 제공된 값>

기존 A 레코드 49.168.236.221은 전환 시점에 제거 또는 변경 부탁드립니다.

감사합니다.
```

---

## 10. 구현 작업 목록

### 10.1 사전 정리

- Git remote URL에서 GitHub 토큰 제거 및 토큰 회전
- `package-lock.json`과 `pnpm-lock.yaml` 중 하나로 정리
- `/home/finefit-temp/package-lock.json` 때문에 Next.js가 workspace root를 잘못 추정하는 경고 해결
- `data/posts.json`, `data/featured.json`의 git unmerged/deleted 상태 정리
- `.omc/` untracked 파일 처리

### 10.2 Supabase 준비

- ehwa 관리용 Google 계정 생성
- Supabase 프로젝트 생성
- 2FA, 복구 이메일, 관리자 2인 이상 설정
- DB schema 생성
- Storage bucket 생성
- RLS 및 관리자 API 권한 설계

### 10.3 데이터 이관

- SQLite `posts` export
- SQLite `attachments` export
- `featured_slots` export
- DB가 참조하는 첨부파일만 선별 업로드
- Supabase Storage URL로 `attachments.path` 갱신
- 게시글 대표 이미지는 우선 base64 유지 가능, 이후 Storage URL로 개선

### 10.4 코드 수정

- `better-sqlite3` 제거
- `lib/db.ts`를 Supabase client 기반으로 교체
- `/api/posts`를 Supabase CRUD로 교체
- `/api/featured`를 Supabase CRUD로 교체
- `/api/upload`를 Supabase Storage 업로드로 교체
- 관리자 인증을 서버 검증 방식으로 변경
- API Route 인증 체크 추가
- `next.config.mjs`의 CORS `*` 축소
- `ignoreBuildErrors: true` 제거 또는 최소화

### 10.5 Vercel 배포

- Vercel 프로젝트 연결
- 환경변수 등록
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
- Preview 배포 검증
- Production 배포
- Custom domain 연결

### 10.6 운영 검증

- `/` 랜딩 페이지 확인
- `/blog` 게시글 목록 확인
- 게시글 모달/첨부파일 다운로드 확인
- `/admin/login` 로그인 확인
- 게시글 생성/수정/삭제 확인
- 주요 소식 슬롯 저장 확인
- 파일 업로드 확인
- Vercel logs 확인
- Supabase logs 확인
- Cron 실행 로그 확인

---

## 11. 주요 리스크와 대응

| 리스크 | 설명 | 대응 |
|---|---|---|
| Supabase Free pause | 비활성 시 프로젝트가 pause될 수 있음 | Cron health check, 운영 확정 후 Pro 전환 |
| API 무단 호출 | 현재 API에 서버 인증이 없음 | `CRON_SECRET`, 관리자 세션, service role 서버 전용 사용 |
| 파일 이관 누락 | 업로드 폴더 47개 중 DB 연결 파일은 2개 | DB 참조 기준으로 이관 목록 생성 |
| DNS 전환 지연 | Gabia DNS 변경은 병원 전산팀 의존 | Vercel preview URL로 사전 검증 |
| lockfile 혼재 | npm/pnpm lockfile 혼재 | npm 기준 정리 권장 |
| 빌드 오류 은폐 | `ignoreBuildErrors: true` | 이전 전 타입 오류 점검 |
| 개인정보 확장 | 향후 신청/상담 데이터를 저장할 경우 민감도 상승 | 저장 범위 제한, 별도 보안 검토 |

---

## 12. 참고 링크

- Vercel Custom Domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Storage: https://vercel.com/docs/storage
- Vercel SQLite 지원 관련 가이드: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- Supabase Pricing: https://supabase.com/pricing
- Supabase CLI login: https://supabase.com/docs/reference/cli/supabase-login

---

## 13. 최종 권장안

현 시점 최적안은 다음과 같다.

```text
1. ehwa 관리용 Google 계정 생성
2. 해당 계정으로 Supabase 프로젝트 생성
3. Supabase CLI는 --profile ehwa 또는 SUPABASE_ACCESS_TOKEN으로 분리 운용
4. SQLite/업로드 파일을 Supabase DB/Storage로 이관
5. Next.js API Route를 Supabase 기반으로 수정
6. Vercel preview 배포
7. 병원 전산팀에 barrierfree.eumc.ac.kr DNS 변경 요청
8. production 전환 후 기존 서버 의존 제거
```

Free 플랜으로 초기 이전은 가능하지만, 병원 공식 운영 서비스로 장기 운영하려면 Supabase Pro 전환 가능성을 예산에 포함해야 한다.
