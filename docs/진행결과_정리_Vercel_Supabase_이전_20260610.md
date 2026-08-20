# 이대목동 베리어프리 — Vercel/Supabase 이전 진행결과 종합 정리

**작성일:** 2026-06-10
**대상:** `/home/finefit-temp/Desktop/project/ehwa_website`
**서비스:** 이대목동병원 장애인 이용편의 지원센터 (`https://barrierfree.eumc.ac.kr/`)
**관련 문서:** `docs/인프라이전_실행계획_Vercel_Supabase_20260608.md`(실행계획), `docs/인프라_이전_및_Vercel_Supabase_전략_20260514.md`(전략)

---

## 1. 목표
로컬 서버(PM2+nginx+SQLite+로컬파일) 기반 운영을 **Vercel + Supabase(서울)** 관리형 인프라로 이전.
서버리스 환경에 부적합한 SQLite/로컬 업로드를 Postgres/Storage로 전환.

## 2. 현재 아키텍처 (이전 결과)
```
[실서비스]  barrierfree.eumc.ac.kr (A→49.168.236.221)
            → nginx:3111 → Next.js(PM2 ehwa-website):3112
            → Supabase(서울) Postgres + Storage     ← SQLite에서 전환 완료

[검수용]    ehwa-website.vercel.app (remo-dev Pro, icn1 서울)
            → 동일 Supabase(서울) 공유

외부연동: 채널톡(챗봇)·Walla(설문)·카카오 = 클라이언트 스크립트/링크 (독립, 영향 없음)
```
- **로컬 서버와 Vercel 둘 다 같은 서울 Supabase를 바라봄.** 데이터 일원화.
- DNS는 아직 로컬 서버를 가리킴(전환 대기). Vercel은 검수 완료 상태.

---

## 3. 완료된 작업 (단계별)

### 3.1 계정 · 인증(토큰) 정리
| 서비스 | 계정/스코프 | 플랜 | 인증 |
|--------|-----------|------|------|
| Vercel | newtechremo → **`remo-dev` 팀** | Pro | 전역 로그인(`newtechremo-2759`), 프로젝트 link |
| Supabase | neuron1103 (`HyeonseokYou's Org`) | Free | `.env.tokens` PAT |
- 전역 로그인/토큰 충돌 없이 `--scope`/env 분리 운용
- 민감파일 gitignore 확인: `.env.tokens`, `.env.local`, `.vercel`, `supabase/.temp`

### 3.2 Supabase 백엔드 (서울)
- 프로젝트 `ehwa-website` / ref **`jfkevhtdiicrmytmwyes`** / 리전 **ap-northeast-2(Seoul)**
- 스키마: `posts`, `attachments`, `featured_slots` + 인덱스 + RLS(공개읽기 3정책)
- Storage 버킷 `ehwa-attachments`(public)
- 마이그레이션: `supabase/migrations/20260608000000_init.sql`

### 3.3 데이터 이관 (검증 완료)
- 게시글 **7** / 첨부 **2** / 주요소식 슬롯 → Supabase 이관
- 첨부 PDF 2개 → Storage 업로드, `path`를 Storage URL로 전환
- ⚠️ `size` 메타 불일치 → 실제 파일 기준 보정 / 미참조 잔여파일(`_xjuf8m_`) 제외

### 3.4 코드 교체 (커밋 `3294299`)
- `lib/db.ts`: better-sqlite3 제거 → `@supabase/supabase-js`(async), status/isLegacy 경계 변환으로 기존 시그니처 유지
- `app/api/{posts,featured,upload}`: `await` 추가, 업로드 → Supabase Storage
- `lib/posts.ts`의 localStorage 함수는 미사용(dead code) 확인 — UI는 `/api/*` 사용
- lockfile 정리: pnpm stub 삭제(npm 단일), `data/` 추적 해제

### 3.5 운영 전환 (데이터 보존 최우선)
- **3중 백업** → `/home/finefit-temp/ehwa_backup_20260608/` (원본3파일 + 일관성 스냅샷 + uploads tar 74MB)
- `pm2 restart ehwa-website` → 운영 사이트 Supabase 전환 완료
- ★ 원본 SQLite 보존 확인 (타임스탬프 4/27 유지, 새 코드는 SQLite 미접근)

### 3.6 Vercel 배포 + 서울 리전 (커밋 `151e312`)
- 환경변수 3종(URL/anon/service_role) Production·Development 등록
- `vercel --prod` → `https://ehwa-website.vercel.app` 배포
- ⚠️ 기본 함수 리전이 미국(iad1)이라 `/api/posts` 3.75s → **`vercel.json regions=icn1`**로 서울 고정 → **~0.3s**

### 3.7 도메인 전환 준비
- Vercel 프로젝트에 `barrierfree.eumc.ac.kr` 등록 (DNS만 대기)
- Vercel 요구 DNS: **`A barrierfree.eumc.ac.kr 76.76.21.21`** (현재 49.168.236.221)
- CAA 없음 + LE 발급 이력 → SSL 자동발급 차단 위험 없음 확인

---

## 4. 검증 결과 (라이브 + Vercel 양쪽 통과)
| 항목 | 라이브(barrierfree) | Vercel |
|------|------|------|
| 페이지(/, /blog, /admin*) | 200 | 200 |
| 게시글 7개 표시 | ✅ | ✅ |
| 글 생성/수정/삭제(CRUD) | ✅ 실측 | ✅ 실측 |
| 파일 첨부 업로드 end-to-end | ✅ | ✅ |
| 챗봇(채널톡) | ✅ | ✅ |
| 설문(Walla)·카카오 | ✅ | ✅ |
| 데이터 무결성(7개 유지) | ✅ | ✅ |
- 쓰기 검증은 status=false(공개 비노출) 테스트 후 즉시 삭제로 진행 → 공개 화면 무영향

---

## 5. 주요 자산 / 식별자 / 위치
| 항목 | 값 |
|------|-----|
| Supabase ref / 리전 | `jfkevhtdiicrmytmwyes` / Seoul(ap-northeast-2) |
| Supabase org | `ocamroqehgsepapbpcha` (HyeonseokYou's Org / neuron1103) |
| Vercel 프로젝트 | `remo-dev/ehwa-website` (`prj_7ep8cW3DuXnq7T6FGYEtoZx5xw4G`) |
| Vercel URL | `https://ehwa-website.vercel.app` |
| 브랜치 | `feat/supabase-migration` |
| 커밋 | `3294299`(이관), `151e312`(서울리전) |
| 백업 | `/home/finefit-temp/ehwa_backup_20260608/` |
| 시크릿(로컬, gitignore) | `.env.local`(앱키), `.env.tokens`(PAT·DB비번·ref) |
| 게시글 ID(슬롯) | 1768440007323 / 1777265870584 / 1768441208029 |
| DNS 현재→목표 | A 49.168.236.221 → A 76.76.21.21 (Gabia NS) |

---

## 6. 남은 작업 (우선순위)

### 6.1 진행 예정 — GA4 방문통계 연결 (사용자 확정)
📄 원본 플랜: `docs/superpowers/plans/2026-05-26-ga4-walla-tracking.md` (Phase 1만 적용, Walla 추적 제외)
- ✅ 적용: GA4 글로벌 태그(`G-FMFRLWXG12`) → 방문자·페이지뷰·유입 수집 (`app/layout.tsx`)
- ⚪ 선택: CTA 클릭 이벤트(`click_service_apply`/`click_kakao_consult`) — `lib/analytics.ts` + Hero/Contact
- ❌ 제외(Walla 추적): `/apply/complete` 페이지, `complete_service_apply`, Walla 엔딩필드 설정
- 진행 전 확인: ① `G-FMFRLWXG12` 본인/병원 소유 GA4 속성 여부 ② 개인정보처리방침에 GA 사용 명시
- 배포: 로컬 서버 `pm2 restart` + Vercel 재배포 (양쪽)

### 6.2 최종 — DNS 전환
- 병원 전산팀에 요청: `A barrierfree.eumc.ac.kr` IP `49.168.236.221 → 76.76.21.21`
- 전환 중 로컬 서버 유지 → 전파 후 SSL 자동발급 → 검수 → 로컬 종료
- 롤백: A값 원복 한 줄

### 6.3 보안/하드닝 (미완)
- 관리자 인증 서버화(`admin/admin123` 제거) + **API 쓰기 인증 가드** ← 사용자 요청대로 보류
- `next.config.mjs` CORS `*` 축소 / `ignoreBuildErrors` 제거
- **GitHub 토큰 폐기/회전** (git URL 노출 이력)
- Supabase 계정 2FA 등

### 6.4 성능 (미완)
- **base64 썸네일 → Storage URL 전환** ← `/api/posts` ~1MB(썸네일 815KB)로 "게시글 늦게 뜸" 원인. 양쪽 공통.

### 6.5 운영/위생 (미완)
- cron keepalive + `CRON_SECRET` (Supabase Free pause 백스톱)
- 상위 폴더 `package-lock.json` 경고 해결
- **Next.js 16.0.7 보안 취약점** 패치 업그레이드 (빌드 경고)
- `CLAUDE.md`/구버전 문서 localStorage→Supabase 갱신

---

## 7. 보안 리마인더
이전 작업 대화 중 실 자격증명(GitHub PAT, Supabase PAT/service_role/DB비밀번호, Vercel 토큰)이 노출됨. transcript 외부 공유 가능성이 있으면 **회전(재발급) 권장**.

---

## 8. 롤백 안전장치
- SQLite 원본 + 3중 백업 보존(`~/ehwa_backup_20260608/`)
- 코드 롤백: `git checkout main && npm install && npm run build && pm2 restart ehwa-website`
- DNS 롤백: A값을 `49.168.236.221`로 원복
- 데이터는 Supabase(서울)와 SQLite 백업 양쪽에 존재
