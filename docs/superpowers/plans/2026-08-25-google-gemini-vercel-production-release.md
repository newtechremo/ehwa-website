# Google Gemini 직접 연결 기반 Vercel 배포 Implementation Plan

> **실행 상태 (2026-09-07 확인):** 이 문서의 체크박스는 실행 당시 갱신되지 않았다.
> 계획된 작업은 실제로 수행돼 `main`에 반영됐고 Production 이 운영 중이다.
> 체크박스를 진행 현황의 근거로 쓰지 말 것. 권위 있는 현황은 아래 문서를 본다.
> - 현황·검증 수치: `docs/자체챗봇_Production_배포_및_현재진행현황_20260825.md`
> - 운영 절차: `docs/chatbot-operations-runbook.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검증된 Google Gemini 직접 연결 구성으로 최신 자체 챗봇을 Vercel Preview에서 검수한 뒤, ChannelTalk을 유지하는 Production 배포를 거쳐 안전하게 자체 챗봇으로 전환한다.

**Architecture:** 기존 Next.js 서버 라우트가 Google Gemini Developer API를 서버에서 직접 호출하고 Supabase의 KB·사용량·로그 테이블을 재사용한다. Git 연동 Vercel Preview에서 동일 커밋을 검증한 후 `main`에 병합하되, Production 첫 배포는 `NEXT_PUBLIC_CHATBOT_ENABLED=false`로 유지한다. 최종 승인 후 플래그만 `true`로 바꿔 재배포하며, 장애 시 `false` 재배포로 ChannelTalk에 복귀한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel Git Deployments, Google Gemini Developer API, AI SDK 7, `@ai-sdk/google`, Supabase Postgres/pgvector

**Spec:** `docs/chatbot-operations-runbook.md`, `docs/채널톡_실대화_비교결과_20260824.md`, `tests/chatbot-browser-qa.md`

**Execution result (2026-08-25 19:27 KST):** PR #1을 `main`에 병합했고(`8fa3304`),
Production 다크 배포 `dpl_9vPyfXY4WsaXyaFij1p6ZcDt2omj`의 Google 직접 RAG를 검증한 뒤
`dpl_21mh5pzp8aREuwdK4K4RhCqs3ZBz`로 자체 챗봇을 활성화했다. 공개 URL은
https://barrierfree.eumc.ac.kr 이며 ChannelTalk SDK 0·자체 위젯 1이다.

## Global Constraints

- 실행 방식은 기존 사용자 지시에 따라 **Inline Execution**으로 한다. 실행 시 `superpowers:executing-plans`를 사용한다.
- 생성 모델은 `google/gemini-3.5-flash-lite`, 임베딩 모델은 `gemini-embedding-001`로 고정한다.
- 이번 릴리스에서는 Vercel AI Gateway로 전환하지 않는다. `GOOGLE_GENERATIVE_AI_API_KEY`가 있는 Google 직접 호출 경로를 사용한다.
- Google 키는 유료 프로젝트에 연결된 Authorization Key를 사용한다. 실제 키 값은 Git·문서·명령 출력에 남기지 않는다.
- Vercel Sensitive 변수는 생성 후 CLI로 다시 읽을 수 없다. secret의 원격 유효성은 `env run`이
  아니라 해당 secret이 주입된 새 deployment의 서버 경로로 검증한다.
- 새 런타임 의존성, 새 Vercel 프로젝트, 별도 staging 인프라를 추가하지 않는다.
- Preview는 `feat/chatbot`, Production은 `main` Git 배포만 사용한다. 로컬 파일을 `vercel deploy --prod`로 직접 업로드하지 않는다.
- Preview에서 전체 live QA를 재실행하지 않는다. 로컬 전체 검증 후 Preview에서는 health, critical 17건, 브라우저 검수만 수행한다.
- Production에서는 승인된 synthetic 질문 1건만 호출한다.
- Production 원문 대화 로그는 기본 비저장한다. 질문·답변 원문 저장이 필요해지면 병원 개인정보 승인 후 별도 릴리스로 다룬다.
- `NEXT_PUBLIC_CHATBOT_ENABLED=true`는 P0/P1 0건, 자동 QA, Preview Chrome 검증,
  Production 다크 배포 통과 후에만 적용한다. 기존 ChannelTalk 전화·URL·신청 문구는
  2026-08-25 사용자 확정 기준으로 그대로 유지한다.
- DB rollback으로 테이블이나 데이터를 삭제하지 않는다. 긴급 복구는 챗봇 플래그만 `false`로 되돌린다.

---

## File Map

| 파일 | 책임 |
|---|---|
| `components/chat/ChatWidget.tsx` | 최신 채팅 UI, 포커스·키보드·메시지 시간·하단 안내 |
| `components/chat/ChatRich.tsx` | 링크·링크 카드·안전한 텍스트 렌더링 |
| `lib/chatbot/content.ts` | 채팅 문구·답변 콘텐츠 |
| `public/chatbot-avatar.webp` | 채널톡과 맞춘 챗봇 아바타 |
| `scripts/chat-ui-test.tsx` | 최신 UI 회귀 검사 |
| `tests/chatbot-critical-answers.json` | Production 전 반드시 실행될 17개 critical case 정의 |
| `scripts/qa-critical.mts` | critical case 누락을 허용하지 않는 실행기 |
| `lib/chatbot/log.ts` | 원문 로그 저장 여부와 PII 마스킹 |
| `scripts/runtime-test.mts` | 환경별 런타임·원문 로그 정책 회귀 검사 |
| `.env.example` | 비밀값 없는 환경변수 계약 |
| `tests/chatbot-browser-qa.md` | Preview 브라우저·실기기·접근성·승인 증빙 |
| `docs/chatbot-operations-runbook.md` | 배포 URL·커밋·환경·rollback 운영 기록 |
| `docs/채널톡_실대화_비교결과_20260824.md` | 출시 게이트 최종 판정 |

---

### Task 1: 현재 UI 변경을 독립 커밋으로 고정

**Files:**
- Modify: `components/chat/ChatRich.tsx`
- Modify: `components/chat/ChatWidget.tsx`
- Modify: `lib/chatbot/content.ts`
- Modify: `package.json`
- Create: `public/chatbot-avatar.webp`
- Create: `scripts/chat-ui-test.tsx`
- Create: `docs/superpowers/plans/2026-08-25-google-gemini-vercel-production-release.md`

**Interfaces:**
- Consumes: 현재 작업 트리의 채널톡 유사 UI 변경
- Produces: 이후 QA와 배포가 가리킬 수 있는 단일 UI 기준 커밋

- [ ] **Step 1: 변경 범위를 확인한다**

Run:

```bash
git status --short
git diff --check
git diff -- components/chat/ChatRich.tsx components/chat/ChatWidget.tsx lib/chatbot/content.ts package.json
```

Expected: 위 파일 4개 수정, 아바타·UI 테스트·이 계획 문서 신규. whitespace 오류와 비밀값 없음.

- [ ] **Step 2: UI와 기존 챗봇 회귀 검사를 실행한다**

Run:

```bash
npm run test:chat-ui
npm run test:chatbot
npx tsc --noEmit
npm run lint
```

Expected: UI PASS, 라우팅 48/48, FAQ 43/43·126/126, TypeScript PASS, lint 0 errors. 기존 비챗봇 경고 24건은 이번 릴리스에서 확대하지 않는다.

- [ ] **Step 3: UI 기준선을 커밋한다**

Run:

```bash
git add components/chat/ChatRich.tsx components/chat/ChatWidget.tsx lib/chatbot/content.ts package.json public/chatbot-avatar.webp scripts/chat-ui-test.tsx docs/superpowers/plans/2026-08-25-google-gemini-vercel-production-release.md
git commit -m "feat: align chatbot UI for Vercel preview"
```

Expected: 실제 키나 `.env.local` 없이 UI와 계획만 한 커밋에 포함.

---

### Task 2: critical 위치 후속 4건 자동 실행 누락 제거

**Files:**
- Modify: `tests/chatbot-critical-answers.json:93-144`
- Modify: `scripts/qa-critical.mts:15-46`

**Interfaces:**
- Consumes: `CriticalCase.repeat: number`
- Produces: 모든 case에 양의 정수 `repeat`가 없으면 실행 전 실패하고, 정상 구성에서는 17건을 실행하는 `qa:critical`

- [ ] **Step 1: 현재 설정 누락 검사를 실행해 실패를 확인한다**

Run:

```bash
node -e 'const s=require("./tests/chatbot-critical-answers.json"); const bad=s.cases.filter(c=>!Number.isInteger(c.repeat)||c.repeat<1).map(c=>c.id); if(bad.length) throw new Error(`invalid repeat: ${bad.join(",")}`)'
```

Expected: `replay-emergency-location`, `replay-elevator-emergency`, `replay-annex-b8`, `replay-elevator-parking`을 포함한 오류로 종료.

- [ ] **Step 2: 네 case에 명시적인 반복 횟수를 추가한다**

각 case의 `allowedSources` 바로 다음에 다음 필드를 추가한다.

```json
"repeat": 1,
```

- [ ] **Step 3: 실행기가 다시 누락을 조용히 건너뛰지 못하게 한다**

suite 파싱 직후 다음 runtime 검증을 추가한다. TypeScript cast만 믿으면 JSON에서 빠진 필드를 발견하지 못하므로, 기존 `CriticalCase.repeat: number` 타입은 그대로 유지한다.

```ts
for (const testCase of suite.cases) {
  if (!Number.isInteger(testCase.repeat) || testCase.repeat < 1) {
    throw new Error(`critical case has invalid repeat: ${testCase.id}`)
  }
}
```

기존 `requiredOperations` 계산과 `for (let attempt = 1; attempt <= testCase.repeat; ...)` loop는 그대로 사용한다.

- [ ] **Step 4: 정적 누락 검사와 타입 검사를 실행한다**

Run:

```bash
node -e 'const s=require("./tests/chatbot-critical-answers.json"); const bad=s.cases.filter(c=>!Number.isInteger(c.repeat)||c.repeat<1); if(bad.length) process.exit(1); console.log(`critical config: ${s.cases.reduce((n,c)=>n+c.repeat,0)} operations`)'
npx tsc --noEmit
```

Expected: `critical config: 17 operations`, TypeScript PASS.

- [ ] **Step 5: 누락 방지 변경을 커밋한다**

Run:

```bash
git add tests/chatbot-critical-answers.json scripts/qa-critical.mts
git commit -m "test: execute every critical chatbot case"
```

---

### Task 3: Production 원문 대화 로그를 기본 비저장으로 전환

**Files:**
- Modify: `lib/chatbot/log.ts:22-89`
- Modify: `scripts/runtime-test.mts`
- Modify: `.env.example:33-38`
- Modify: `docs/chatbot-operations-runbook.md:120-126`

**Interfaces:**
- Consumes: `CHATBOT_LOG_CONTENT` 환경변수 문자열
- Produces: `shouldStoreChatContent(env?): boolean`; 값이 정확히 `true`일 때만 `user_input`과 `answer` 원문 저장

- [ ] **Step 1: 원문 저장 기본값에 대한 실패 검사를 추가한다**

`scripts/runtime-test.mts`에 import와 assertion을 추가한다.

```ts
import { shouldStoreChatContent } from "../lib/chatbot/log"

assert.equal(shouldStoreChatContent({}), false)
assert.equal(shouldStoreChatContent({ CHATBOT_LOG_CONTENT: "false" }), false)
assert.equal(shouldStoreChatContent({ CHATBOT_LOG_CONTENT: "true" }), true)
```

- [ ] **Step 2: 테스트를 실행해 export 부재 실패를 확인한다**

Run:

```bash
npm run test:runtime
```

Expected: `shouldStoreChatContent` export가 없어 FAIL.

- [ ] **Step 3: 최소 원문 저장 정책을 구현한다**

`lib/chatbot/log.ts`에 다음 함수를 추가한다.

```ts
export function shouldStoreChatContent(
  env: Pick<NodeJS.ProcessEnv, "CHATBOT_LOG_CONTENT"> = process.env,
): boolean {
  return env.CHATBOT_LOG_CONTENT === "true"
}
```

`logChat()`의 insert 직전에 저장 여부를 계산하고 두 필드를 변경한다.

```ts
const storeContent = shouldStoreChatContent()

user_input: storeContent && entry.userInput
  ? maskPII(entry.userInput.slice(0, MAX_INPUT))
  : null,
answer: storeContent && entry.answer
  ? maskPII(entry.answer.slice(0, MAX_ANSWER))
  : null,
```

`session_id`, `kind`, `fallback_reason`, `ref_id`, `source_doc_ids`, provider/model/token/latency 지표는 그대로 보존한다.

- [ ] **Step 4: 환경변수 계약과 운영 문서를 갱신한다**

`.env.example`의 로그 섹션에 다음을 추가한다.

```dotenv
# false이면 질문·답변 원문은 저장하지 않고 진단 메타데이터만 저장한다.
CHATBOT_LOG_CONTENT=false
CHATBOT_LOG_RETAIN_DAYS=90
```

Runbook에는 Preview와 Production 모두 이번 릴리스에서 `CHATBOT_LOG_CONTENT=false`라고 기록한다. 원문 이력 기능은 병원 개인정보 승인 전까지 비활성이라고 명시한다.

- [ ] **Step 5: 개인정보 정책 회귀 검사를 실행한다**

Run:

```bash
npm run test:runtime
npm run test:chatbot
npx tsc --noEmit
```

Expected: runtime PASS, 라우팅 48/48 및 FAQ 43/43·126/126, TypeScript PASS.

- [ ] **Step 6: 로그 정책 변경을 커밋한다**

Run:

```bash
git add lib/chatbot/log.ts scripts/runtime-test.mts .env.example docs/chatbot-operations-runbook.md
git commit -m "fix: disable chatbot transcript logging by default"
```

---

### Task 4: 로컬 Release Candidate 전체 검증

**Files:**
- Verify only: application, tests, migrations, build output

**Interfaces:**
- Consumes: Tasks 1~3의 커밋
- Produces: Vercel Preview에 push할 clean Git commit SHA

- [ ] **Step 1: 로컬 Supabase와 offline 전체 검증을 실행한다**

Run:

```bash
npm run db:start
npm run qa:offline
npm run test:chat-ui
```

Expected: budget SQL, answer contract, runtime, 라우팅, KB, retrieval, UI 모두 PASS.

- [ ] **Step 2: 3113 QA 서버에서 critical 17건을 실행한다**

Terminal A:

```bash
npm run dev:qa
```

Terminal B:

```bash
npm run qa:critical
```

Expected: `critical QA: 17/17 PASS`, 각 case의 `modelAttempts=0`, 자동 QA가 Google 호출 예산을 소비하지 않음.

검사가 끝나면 Terminal A에서 `Ctrl+C`로 3113 QA 서버를 종료한다. 3112 개발 서버가 별도 실행 중이면 해당 개발 터미널도 종료한 뒤 Production build를 시작한다.

- [ ] **Step 3: Production 빌드와 린트를 실행한다**

Run:

```bash
npm run build
npm run lint
```

Expected: build PASS, lint 0 errors. 기존 경고는 증가하지 않음.

- [ ] **Step 4: 비밀값과 Git 상태를 확인한다**

Run:

```bash
git diff --check
git grep -nE 'AIza[[:alnum:]_-]{20,}' -- ':!docs/superpowers/plans/2026-08-25-google-gemini-vercel-production-release.md' || true
git status --short
git rev-parse HEAD
```

Expected: Google 키 패턴 출력 없음, working tree clean, SHA 기록 가능.

---

### Task 5: Google 유료 Authorization Key와 Vercel 환경 구성

**Files:**
- External configuration only: Google AI Studio/Cloud, Vercel Project Settings

**Interfaces:**
- Consumes: Google 유료 Authorization Key, 기존 Supabase/CRON 설정
- Produces: Preview와 Production에서 동일 모델을 호출하되 namespace·기능 플래그·로그 정책이 분리된 환경

- [ ] **Step 1: Google 키의 운영 적합성을 확인한다**

Google AI Studio의 API Keys 화면에서 사용할 키가 다음 조건을 모두 만족하는지 확인한다.

```text
Plan: Paid
Key type: Authorization Key
허용 API: Gemini API
Billing alert: 설정됨
키 값: Git/문서/Slack에 복사하지 않음
```

기존 `.env.local` 키의 유형을 화면에서 확인할 수 없으면 새 Production 전용 Authorization Key를 생성한다. 기존 키 삭제는 새 키 Preview smoke 성공 후에만 수행한다.

- [ ] **Step 2: Preview `feat/chatbot` 환경을 다음 값으로 맞춘다**

Vercel Dashboard → `ehwa-website` → Settings → Environment Variables에서 설정한다.

```text
NEXT_PUBLIC_CHATBOT_ENABLED=true
CHATBOT_MODEL=google/gemini-3.5-flash-lite
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001
CHATBOT_DAILY_AI_LIMIT=396
CHATBOT_USAGE_NAMESPACE=preview
CHATBOT_LOG_CONTENT=false
CHATBOT_LOG_RETAIN_DAYS=90
```

`GOOGLE_GENERATIVE_AI_API_KEY`는 같은 Preview/`feat/chatbot` scope에 추가하고, Vercel의 secret 입력란에 Step 1에서 확인한 Authorization Key를 붙여넣는다. 문서에는 값을 쓰지 않는다.

Deployment Protection → Protection Bypass for Automation을 활성화한다. Vercel이 deployment에
`VERCEL_AUTOMATION_BYPASS_SECRET` system variable을 자동 주입하므로 같은 이름의 project env를
중복 생성하지 않는다. 로컬 자동 QA는 `vercel curl`로 임시 bypass cookie를 발급받는다.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`은 기존 Preview 값을 유지한다.

- [ ] **Step 3: Production 환경을 자체 챗봇 비활성 상태로 구성한다**

```text
NEXT_PUBLIC_CHATBOT_ENABLED=false
CHATBOT_MODEL=google/gemini-3.5-flash-lite
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001
CHATBOT_DAILY_AI_LIMIT=500
CHATBOT_USAGE_NAMESPACE=production
CHATBOT_LOG_CONTENT=false
CHATBOT_LOG_RETAIN_DAYS=90
```

`GOOGLE_GENERATIVE_AI_API_KEY`는 Production scope에 추가하고 Production 전용 Authorization Key를 Vercel secret 입력란에 저장한다. Preview automation bypass secret은 Production에 등록하지 않는다.

기존 Production Supabase 3종, 관리자 3종, `CRON_SECRET`은 수정하지 않는다. `AI_GATEWAY_API_KEY`는 이번 릴리스에 추가하지 않는다.

- [ ] **Step 4: 이름과 scope만 CLI로 검증한다**

Run:

```bash
npx vercel env ls preview feat/chatbot
npx vercel env ls production
```

Expected: 위 변수 이름이 올바른 환경에 표시되고 Sensitive 값은 `Encrypted`로만 출력. 조직의
Sensitive-by-default 정책에서는 비밀이 아닌 설정도 `Encrypted`일 수 있으므로 정확한 값은 새
deployment의 health/응답으로 검증한다. 실제 키 값은 출력하지 않는다.

- [ ] **Step 5: 로컬 Authorization Key로 Google 생성·임베딩을 각각 1회 확인한다**

Run:

```bash
node --env-file=.env.local --import tsx --input-type=module -e 'import { createGoogleGenerativeAI } from "@ai-sdk/google"; import { embed, generateText } from "ai"; const key=process.env.GOOGLE_GENERATIVE_AI_API_KEY; if(!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing"); const google=createGoogleGenerativeAI({apiKey:key}); const vector=await embed({model:google.embedding("gemini-embedding-001"),value:"이대목동병원 이동 보조",maxRetries:0,providerOptions:{google:{outputDimensionality:768,taskType:"RETRIEVAL_QUERY"}}}); if(vector.embedding.length!==768) throw new Error(`embedding dimensions=${vector.embedding.length}`); const answer=await generateText({model:google("gemini-3.5-flash-lite"),prompt:"반드시 OK 두 글자만 출력하세요.",maxOutputTokens:16,maxRetries:0}); if(!answer.text.includes("OK")) throw new Error("generation smoke failed"); console.log("google-direct local smoke: PASS")'
```

Expected: `google-direct local smoke: PASS`. secret 값과 모델 응답 전문은 출력하지 않는다. 이 검사는
키 자체와 Google 계정 quota만 확인하며, Vercel에 저장된 Sensitive 값은 Task 6의 서버 RAG smoke로
별도 확인한다. Google provider 호출 2회를 쓰지만 애플리케이션 일일 예산에는 포함되지 않는다.

---

### Task 6: Git Preview 배포와 서버 경로 검증

**Files:**
- Update after verification: `tests/chatbot-browser-qa.md`
- Update after verification: `docs/chatbot-operations-runbook.md`

**Interfaces:**
- Consumes: clean `feat/chatbot` Release Candidate, Preview 환경변수
- Produces: exact commit SHA에 대응하는 `READY` Preview URL과 health/canary 증빙

- [ ] **Step 1: 기능 브랜치를 원격에 push한다**

Run:

```bash
git push origin feat/chatbot
```

Expected: `origin/feat/chatbot`이 로컬 HEAD와 동일. Git 연동 Vercel Preview가 자동 생성됨.

- [ ] **Step 2: Preview가 같은 브랜치에서 `READY`인지 확인한다**

Run:

```bash
npx vercel ls --environment preview
npx vercel inspect https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app
```

Expected: target `Preview`, status `Ready`, branch alias `ehwa-website-git-feat-chatbot-remo-dev.vercel.app`.

- [ ] **Step 3: 보호된 Preview health를 확인한다**

Run:

```bash
read -rsp "Preview CRON_SECRET: " preview_cron_secret && echo
npx vercel curl /api/chatbot/health --deployment https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app -- --header "Authorization: Bearer ${preview_cron_secret}"
unset preview_cron_secret
```

Expected JSON:

```json
{
  "ok": true,
  "namespace": "preview",
  "modelConfigured": true,
  "embeddingConfigured": true,
  "kbCount": 59
}
```

`remaining`은 17건 critical 실행에 필요한 최소치 이상이어야 한다. KB 문서·청크가 예상보다 작으면 Production 진행을 멈추고 Runbook의 migration/ingest 절차만 수행한다.

- [ ] **Step 4: Preview에서 critical 17건을 실행한다**

Run:

```bash
cookie_dir=$(mktemp -d /tmp/ehwa-vercel-cookie-XXXXXX)
cookie_file="$cookie_dir/cookies.txt"
npx vercel curl / --deployment https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app -- --silent --location --header 'x-vercel-set-bypass-cookie: true' --cookie-jar "$cookie_file" --output /dev/null
protection_cookie=$(awk 'NF >= 7 && ($1 !~ /^#/ || $1 ~ /^#HttpOnly_/) { printf "%s=%s; ", $6, $7 }' "$cookie_file")
read -rsp "Preview CRON_SECRET: " preview_cron_secret && echo
QA_BASE=https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app \
  QA_EXPECT_NAMESPACE=preview \
  QA_PROTECTION_COOKIE="$protection_cookie" \
  CRON_SECRET="$preview_cron_secret" \
  npm run qa:critical
unset protection_cookie preview_cron_secret
case "$cookie_dir" in /tmp/ehwa-vercel-cookie-*) find "$cookie_dir" -depth -delete ;; esac
```

Expected: `critical QA: 17/17 PASS`, 모든 case가 허용 source와 답변 contract를 만족하고 model attempts 0.

- [ ] **Step 5: 대표 신청 질문을 Preview에 1회 보낸다**

Run:

```bash
npx vercel curl /api/chatbot/ask --deployment https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app -- --request POST --header 'Content-Type: application/json' --data '{"question":"검사실·진료실 이동 보조를 받으려면 어떻게 해야 하나요?","sessionId":"preview-release-smoke"}'
```

Expected: source `ai`, `retrievalMethod=hybrid`, embedding 1·generation 1·model 2. 답변에
`진료 3일 전`, `환자 정보`, `예약일`, `본관 1층`, Walla, 카카오, `02-2650-5586`가 포함된다.
이 요청이 Vercel에 저장된 Google Sensitive secret의 실제 서버 smoke다.

- [ ] **Step 6: Preview URL·commit·health 결과를 문서에 기록한다**

`tests/chatbot-browser-qa.md`와 Runbook의 이전 URL을 새 immutable deployment URL과 `git rev-parse HEAD` 결과로 바꾼다. stable branch alias만 기록하지 말고 deployment URL도 함께 기록한다.

- [ ] **Step 7: Preview 배포 기록을 커밋하고 다시 push한다**

Run:

```bash
git add tests/chatbot-browser-qa.md docs/chatbot-operations-runbook.md
git commit -m "docs: record chatbot Vercel preview candidate"
git push origin feat/chatbot
```

Expected: 문서 커밋으로 새 Preview가 생기므로, 최종 승인용 URL은 이 마지막 커밋의 배포를 사용한다.

---

### Task 7: 자동 브라우저 검증·기존 ChannelTalk 문구 기준 확정

**Files:**
- Modify: `tests/chatbot-browser-qa.md`
- Modify when copy changes are approved: `lib/chatbot/content.ts`
- Modify when UI defects are found: `components/chat/ChatWidget.tsx`, `components/chat/ChatRich.tsx`

**Interfaces:**
- Consumes: 마지막 `feat/chatbot` Preview URL
- Produces: P0/P1 0건, Preview Chrome 자동 검증, 기존 ChannelTalk 고정 정보 유지 기록

- [ ] **Step 1: Preview Chrome 자동 검증을 수행한다**

390×844 환경에서 런처, 열기, 메시지 시간, 링크 카드, 입력, 전송, 닫기, 재열기,
가로 넘침, 배경 inert·스크롤 잠금, ESC, 포커스 복귀, ChannelTalk SDK 미로드를 확인하고
`tests/chatbot-browser-qa.md`에 기록한다.

다음 전체 조합은 선택적 후속 검수이며 이번 Production 차단 조건으로 사용하지 않는다.

```text
Chrome, Edge, Firefox, Safari: 1280×800 / 768×1024 / 390×844
iOS Safari 실제 iPhone: 세로 / 가로 / 가상 키보드
Android Chrome 실제 기기: 세로 / 가로 / 가상 키보드
```

- [ ] **Step 2: 키보드·스크린리더 후속 검수 범위를 기록한다**

```text
키보드: Tab/Shift+Tab 포커스 순환, Enter 전송, ESC 닫기, 런처 포커스 복귀
NVDA + Chrome 또는 Edge
VoiceOver + Safari
TalkBack + Android Chrome
```

Expected: 자동 검증 범위와 미실행 수동 범위가 구분되고, 수동 미실행이 이번 릴리스를 차단하지 않음.

- [ ] **Step 3: 기존 ChannelTalk 고정 사실 유지 결정을 기록한다**

2026-08-25 사용자가 다음 기존 ChannelTalk 항목을 그대로 유지하도록 확정한 사실을
`tests/chatbot-browser-qa.md`에 기록한다.

```text
진료 3일 전 신청 권장
환자 정보와 진료 예약일 전달
본관 1층 접수창구
Walla 신청 URL
카카오 상담 URL
02-2650-5586
지원 범위와 담당 매니저 상담 후 확정 문구
AI 한정 데이터 안내 및 담당자 연결 문구
이번 릴리스에서 질문·답변 원문 이력을 저장하지 않고 진단 메타데이터만 보존한다는 운영 정책
첨부파일 상담 기능은 이번 릴리스에 포함하지 않는다는 범위
```

고정 사실을 변경할 때만 별도 내용 확인을 수행한다. 질문·답변 원문 저장과 첨부파일 상담은
이번 릴리스 범위에 포함하지 않으며, 실제 필요가 생기면 별도 기능 계획으로 분리한다.

- [ ] **Step 4: 발견한 P0/P1은 한 건씩 수정·재검수한다**

P0는 개인정보 노출·잘못된 공식 안내·사용 불가, P1은 주요 흐름·접근성·지원 브라우저 오류로 분류한다. 결함마다 재현 절차를 먼저 기록하고, 가장 작은 회귀 테스트를 추가한 뒤 해당 환경에서 재검수한다. 서로 독립적인 결함을 한 커밋에 묶지 않는다. 각 결함 커밋은 `feat/chatbot`에 push하고 새 Preview가 `READY`가 된 뒤 같은 환경에서 재검수한다.

- [ ] **Step 5: 최종 release gate를 검증한다**

Run:

```bash
npm run qa:offline
npm run test:chat-ui
npx tsc --noEmit
npm run build
npm run lint
```

Expected: 자동 검사 모두 PASS, lint 0 errors, 문서상 P0=0/P1=0, 기존 ChannelTalk 고정 정보 유지 결정 존재.

- [ ] **Step 6: 승인 기록을 커밋하고 push한다**

Run:

```bash
git add tests/chatbot-browser-qa.md docs/chatbot-operations-runbook.md docs/채널톡_실대화_비교결과_20260824.md
git commit -m "docs: approve chatbot production release"
git push origin feat/chatbot
```

Expected: 실제 변경된 파일만 stage한다. 명령 실행 전 `git status --short`로 존재하지 않는 변경은 제외한다.

---

### Task 8: `main` Production 비활성 배포

**Files:**
- Git integration only; no direct file upload

**Interfaces:**
- Consumes: 승인된 `feat/chatbot`, `NEXT_PUBLIC_CHATBOT_ENABLED=false` Production 환경
- Produces: 자체 챗봇 API는 배포됐지만 사용자 화면에는 기존 ChannelTalk만 노출되는 Production

- [ ] **Step 1: `main` 대비 전체 릴리스 diff를 검수한다**

Run:

```bash
git fetch origin
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: working tree clean. 챗봇 전체 릴리스와 이미 검토한 인프라 변경만 포함되고 secret 없음.

- [ ] **Step 2: Pull Request를 생성한다**

Run:

```bash
gh pr create --base main --head feat/chatbot --title "feat: deploy in-house chatbot behind production flag" --body "Deploys the verified chatbot and Google Gemini direct integration. Production remains on ChannelTalk because NEXT_PUBLIC_CHATBOT_ENABLED=false until the final release gate."
```

Expected: base `main`, head `feat/chatbot`, Preview checks PASS.

- [ ] **Step 3: Production 변경 승인을 받은 뒤 PR을 병합한다**

병합 직전 Vercel Production의 `NEXT_PUBLIC_CHATBOT_ENABLED=false`와 `CHATBOT_LOG_CONTENT=false`를 Dashboard에서 다시 확인한다. 그 다음 GitHub PR의 squash가 아닌 일반 merge로 검증 커밋 이력을 유지한다.

Expected: `main` push가 Vercel Production 배포를 자동 생성.

- [ ] **Step 4: 비활성 Production 배포를 확인한다**

Run:

```bash
npx vercel ls --environment production
npx vercel inspect https://barrierfree.eumc.ac.kr
curl -sS https://barrierfree.eumc.ac.kr | rg -c 'ch-plugin-web.js'
```

Expected: Production `READY`, public domain alias 유지, ChannelTalk SDK count 1. 자체 챗봇 런처는 보이지 않음.

- [ ] **Step 5: Production health만 확인한다**

Run:

```bash
read -rsp "Production CRON_SECRET: " production_cron_secret && echo
npx vercel curl /api/chatbot/health --deployment https://barrierfree.eumc.ac.kr -- --header "Authorization: Bearer ${production_cron_secret}"
unset production_cron_secret
```

Expected: namespace `production`, model/embedding configured, KB 59, remaining 500에 근접. 이 단계에서는 질문 API를 호출하지 않는다.

- [ ] **Step 6: 비활성 Production 서버에서 Google RAG 경로를 1회 확인한다**

Run:

```bash
npx vercel curl /api/chatbot/ask --deployment https://barrierfree.eumc.ac.kr -- --request POST --header 'Content-Type: application/json' --data '{"question":"검사실·진료실 이동 보조를 받으려면 어떻게 해야 하나요?","sessionId":"production-dark-provider-smoke"}'
read -rsp "Production CRON_SECRET: " production_cron_secret && echo
npx vercel curl /api/chatbot/health --deployment https://barrierfree.eumc.ac.kr -- --header "Authorization: Bearer ${production_cron_secret}"
unset production_cron_secret
```

Expected: source `ai`, provider `google-direct`, 승인된 사실 전부 포함, health의 used가 직전보다
2 증가한다. 자체 위젯은 여전히 OFF이고 ChannelTalk은 ON이다. 실패하면 자체 챗봇
플래그를 켜지 않는다.

---

### Task 9: 자체 챗봇 Production 활성화와 canary

**Files:**
- External Vercel configuration
- Modify after activation: `docs/chatbot-operations-runbook.md`
- Modify after activation: `docs/채널톡_실대화_비교결과_20260824.md`

**Interfaces:**
- Consumes: P0/P1 0, 자동 QA·Preview Chrome 검증, 기존 ChannelTalk 고정 정보 유지 결정,
  비활성 Production health PASS
- Produces: `NEXT_PUBLIC_CHATBOT_ENABLED=true` Production과 검증된 rollback 경로

- [ ] **Step 1: 최종 활성화 체크포인트를 확인한다**

```text
Production 비활성 배포 READY
namespace=production
modelConfigured=true
embeddingConfigured=true
KB 문서 59
critical 17/17
Preview Chrome 390×844 자동 검증 PASS
P0/P1 0
기존 ChannelTalk 전화·URL·신청 문구 유지 기록 완료
CHATBOT_LOG_CONTENT=false
```

하나라도 충족하지 않으면 플래그를 변경하지 않는다.

- [ ] **Step 2: Production 기능 플래그를 변경하고 재배포한다**

Vercel Dashboard에서 Production `NEXT_PUBLIC_CHATBOT_ENABLED`를 `true`로 변경한다. Deployments에서 직전 `main` Production deployment를 선택해 Redeploy하고 환경변수 변경을 포함한 새 빌드를 만든다.

Expected: 새 Production deployment가 `READY`, `barrierfree.eumc.ac.kr` alias가 새 배포로 이동.

- [ ] **Step 3: 위젯 단일 노출을 확인한다**

Run:

```bash
curl -sS https://barrierfree.eumc.ac.kr | rg -c 'ch-plugin-web.js' || true
```

Expected: ChannelTalk SDK count 0. 브라우저에서 자체 챗봇 런처 1개만 표시.

- [ ] **Step 4: 승인된 Production synthetic 질문을 1회 실행한다**

Run:

```bash
npx vercel curl /api/chatbot/ask --deployment https://barrierfree.eumc.ac.kr -- --request POST --header 'Content-Type: application/json' --data '{"question":"검사실·진료실 이동 보조를 받으려면 어떻게 해야 하나요?","sessionId":"production-release-canary"}'
```

Expected: source `kb`, model attempts 0, 승인된 신청 방법·전화·링크가 모두 포함. 추가 질문으로 예산을 소비하지 않는다.

- [ ] **Step 5: Production 사용량과 오류 상태를 확인한다**

Run:

```bash
npx vercel env run -e production -- npm run chatbot:report -- --day "$(TZ=Asia/Seoul date +%F)" --namespace production --limit 500
```

Expected: `audit.difference=0`, synthetic 질문은 KB 직답이므로 model attempt 증가 0, `daily_limit`, `budget_unavailable`, `model_error` 급증 없음.

- [ ] **Step 6: 장애 시 플래그 rollback을 실행한다**

다음 중 하나라도 발생하면 Vercel Production의 `NEXT_PUBLIC_CHATBOT_ENABLED=false`로 되돌리고 직전 `main` deployment를 재배포한다.

```text
Production health 실패
잘못된 공식 정보 또는 링크
반복적인 model_error/budget_unavailable
입력·로그의 개인정보 노출
키보드·스크린리더로 닫을 수 없음
ChannelTalk과 자체 런처 동시 노출
```

Expected: `barrierfree.eumc.ac.kr`에서 ChannelTalk SDK 1, 자체 챗봇 0. DB migration이나 테이블은 삭제하지 않는다.

---

### Task 10: 배포 결과 문서화와 최종 커밋

**Files:**
- Modify: `docs/chatbot-operations-runbook.md`
- Modify: `docs/채널톡_실대화_비교결과_20260824.md`
- Modify: `tests/chatbot-browser-qa.md`

**Interfaces:**
- Consumes: Production deployment ID/URL/commit, health/canary/report 결과
- Produces: 재현 가능한 운영 상태와 rollback 기준

- [ ] **Step 1: 최종 운영 상태를 기록한다**

세 문서에 다음 실제 값을 기록한다.

```text
main commit SHA
Vercel Production deployment ID와 immutable URL
public alias barrierfree.eumc.ac.kr
활성화 KST 일시
model/provider=google-direct
model=gemini-3.5-flash-lite
embedding=gemini-embedding-001
namespace=production
daily limit=500
CHATBOT_LOG_CONTENT=false
health 결과
synthetic 1건 결과
승인자와 rollback 담당자
```

- [ ] **Step 2: 문서와 Git 상태를 검증한다**

Run:

```bash
git diff --check
git status --short
rg -n 'Production|google-direct|gemini-3.5-flash-lite|CHATBOT_LOG_CONTENT|rollback' docs/chatbot-operations-runbook.md docs/채널톡_실대화_비교결과_20260824.md tests/chatbot-browser-qa.md
```

Expected: 세 문서의 URL·commit·모델·플래그 상태가 일치하고 비밀값 없음.

- [ ] **Step 3: 최종 운영 문서를 커밋하고 push한다**

Run:

```bash
git add docs/chatbot-operations-runbook.md docs/채널톡_실대화_비교결과_20260824.md tests/chatbot-browser-qa.md
git commit -m "docs: record chatbot production deployment"
git push origin main
```

Expected: Production 문서 커밋으로 재배포가 발생하더라도 동일 환경과 코드로 `READY`. 문서 커밋 후 public alias와 위젯 단일 노출을 한 번 더 확인한다.

---

## Release Decision

| 단계 | 허용 상태 | 중단 조건 |
|---|---|---|
| Local RC | 모든 자동 검사 PASS | test/build/lint error 또는 secret 발견 |
| Preview | 자체 챗봇 ON | health drift, critical 17/17 미달, 브라우저 P0/P1 |
| Production dark deploy | ChannelTalk ON, 자체 챗봇 OFF | Production health 실패 |
| Production activation | 자체 챗봇 ON, ChannelTalk OFF | 승인 누락 또는 canary 실패 |
| Rollback | ChannelTalk ON | 플래그 `false` 재배포 완료 전까지 종료하지 않음 |

## Expected Commit Sequence

```text
feat: align chatbot UI for Vercel preview
test: execute every critical chatbot case
fix: disable chatbot transcript logging by default
docs: record chatbot Vercel preview candidate
docs: approve chatbot production release
Merge feat/chatbot into main
docs: record chatbot production deployment
```
