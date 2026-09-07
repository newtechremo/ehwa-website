# ChannelTalk Replacement Release Implementation Plan

> **실행 상태 (2026-09-07 확인):** 이 문서의 체크박스는 실행 당시 갱신되지 않았다.
> 계획된 작업은 실제로 수행돼 `main`에 반영됐고 Production 이 운영 중이다.
> 체크박스를 진행 현황의 근거로 쓰지 말 것. 권위 있는 현황은 아래 문서를 본다.
> - 현황·검증 수치: `docs/자체챗봇_Production_배포_및_현재진행현황_20260825.md`
> - 운영 절차: `docs/chatbot-operations-runbook.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자체 챗봇의 오답·운영 안전성·배포 격차를 해소하고, 채널톡 대화 이력을 기준으로 검수한 뒤 `barrierfree.eumc.ac.kr`을 무중단 전환한다.

**Architecture:** 사이트 DOM 안의 단일 `ChatWidget`이 버튼 → 정책 → FAQ → KB 직답 → 근거 제한 LLM → 담당자 연결 순서로 응답한다. 콘텐츠는 당분간 Git/Markdown과 Supabase `kb_documents`로 관리하고, 대화 로그는 service-role 전용 DB와 90일 파기 cron으로 운영한다.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Vercel, Supabase Postgres, AI SDK 7, Google Gemini 또는 Vercel AI Gateway, ESLint 9 Flat Config, `tsx` 기반 회귀 스크립트

**Spec:** `docs/챗봇_자체구축_통합구현플랜_20260820.md`

**Review:** `docs/superpowers/plans/2026-08-23-release-plan-review.md` — 주장 검증 결과와 수정된 실행 순서(Task 0 운영 인증 배포 추가, 회귀 기준선 무손실, `/api/chatbot/log` rate limit 등). 충돌 시 Review 문서가 우선한다.

## Global Constraints

- 버튼·FAQ·KB·AI 답변은 하나의 대화 스트림 안에서 동작한다.
- 정책/검토대기 차단은 FAQ·KB·LLM보다 항상 먼저 실행한다.
- KB에 없는 내용은 생성하지 않고 전화·카카오 연결로 강등한다.
- `NEXT_PUBLIC_CHATBOT_ENABLED=true`일 때 자체 챗봇만, 그 외에는 채널톡만 노출한다.
- 전화번호·운영시간·주소·비용은 검수된 원문 값을 그대로 사용한다.
- 고대비·글자 150%·키보드·스크린리더·모바일 접근성을 축소하지 않는다.
- 대화 원문은 저장소에 커밋하지 않고, 로그는 마스킹 후 90일만 보관한다.
- 새 런타임 의존성은 추가하지 않는다.
- 브라우저 지원 하한은 Next.js 16 공식 범위인 Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+로 하고, 출시는 각 브라우저 최신 안정판과 실제 iOS/Android 기기에서 확인한다.
- 자동 브라우저 프레임워크는 지금 추가하지 않는다. 정확한 수동 매트릭스와 증빙으로 1차 출시를 승인하고, 같은 회귀를 반복해서 놓치거나 CI 자동화가 필요할 때 Playwright를 도입한다.

---

## 2026-08-23 기준선

### 개발 목적

채널톡 스니펫을 지우는 것이 목적이 아니다. 채널톡 콘솔에 있던 버튼 시나리오 10여 개, FAQ 44건,
KB 59건, 정책 차단, AI 자유질문, 전화·카카오·신청 연결을 자체 시스템으로 옮기면서 다음을 달성하는 것이 목적이다.

1. cross-origin iframe을 없애 사이트의 고대비·글자 확대·키보드·스크린리더 기능을 상담 창구까지 적용한다.
2. 채널톡 구독과 세션 장애에 종속되지 않고 병원이 콘텐츠·로그·모델 선택권을 갖는다.
3. AI 장애·예산 초과 시에도 버튼·FAQ·담당자 연결이 계속 동작하게 한다.
4. 근거 없는 의료·병원 안내를 차단하고 실제 사용자 질문으로 품질을 계속 개선한다.

현행 채널톡에도 상담원 실시간 채팅은 없고 전화·카카오 안내 카드만 있으므로, 라이브 상담 인박스는 대체 범위가 아니다.

### 진행 현황

| 영역 | 판정 | 근거 |
|---|---|---|
| Phase A 위젯 | 완료·Preview 검수 이력 있음 | 자체 DOM 위젯, 버튼/FAQ/정책/연결 카드, 고대비·확대·키보드·모바일 |
| 원본 자산 | 완료 | FAQ 44건, KB 59건, AI 지침, 런처·아바타 수령 및 Git 반영 |
| Phase B AI | 로컬 구현 완료, 최신 Preview 미반영 | KB 직답 + KB 전문 LLM + 근거 번호 검증 + 문맥 4턴 |
| 관리자 보안 | 선행조건 완료 | 서버 scrypt 인증, HMAC httpOnly 세션, 쓰기 API 인증 적용 |
| 로그·90일 파기 | 코드 완료, DB 미적용 | `f29f99c`와 `20260823000000_chatbot_logs_answer.sql`; 로컬·운영 migration list에는 아직 없음 |
| 운영 KB | 적재 완료 | 운영 DB `kb_documents=59` 확인 |
| 운영 대화 로그 | 아직 없음 | 운영 DB `chatbot_logs=0`; 운영은 채널톡 사용 중 |
| 결정적 회귀 | 통과 | 2026-08-23 재실행: 라우팅 35/35, FAQ 대표 51/51, 유사 147/147 |
| KB 로컬 평가 | 실행 가능 | 로컬 DB `kb_documents=59` (2026-08-23 재확인). Task 2의 `db reset` 뒤에는 재적재 필요 |
| 77문항 QA | 잠정 76/77, 출시 판정 불가 | FAQ 응답 11건을 내용 확인 없이 자동 통과시키는 채점 결함 존재 |
| 최신 UI 스모크 | 로컬 Chrome만 부분 통과 | 1280×800 런처/패널/버튼/닫기와 390×844 풀스크린/44px/가로 넘침을 확인했지만 최신 Preview·교차 브라우저·실기기 검수는 아님 |
| 브라우저·접근성 승인 | 미완료 | Firefox/Edge/Safari, iOS/Android, NVDA/VoiceOver, 오류·긴 답변·가상 키보드 검수와 병원 담당자 승인이 남음 |
| 정적 품질 게이트 | 부분 통과 | `npx tsc --noEmit`과 `next build`는 통과했지만 `npm run lint`는 ESLint 의존성·설정 부재로 실행 실패 |
| 최신 Git | 로컬만 존재 | 로컬 `f29f99c`, 원격/최신 Preview `de69d2d`; Preview보다 8커밋, main보다 29커밋 앞섬 |
| Production | 안전하게 미전환 | `main=72b8ef5`, 자체 챗봇 미포함, 채널톡 유지 |
| Vercel Preview 설정 | 재구성 필요 | 현재 프로젝트 환경변수 목록에 Preview용 Supabase·챗봇 변수가 없음 |
| Phase C 챗봇 관리자 | 미착수 | `/admin/chat` CRUD·로그 화면 없음 |
| Phase D 전환 | 미착수 | 채널톡 이력 export·처리방침 반영·운영 flag 전환 전 |

### 기존 QA에서 확인된 출시 차단 결함

- `scripts/qa-run.mts`는 `source="faq"`이면 기대 문서와 무관하게 통과시킨다.
- 그 결과 `제가 늦으면 어떻게 되나요?`가 노쇼 FAQ 35로, `진단서 발급받으려면 어디로 가요?`가 센터 위치 수기 FAQ로 잘못 연결돼도 통과했다.
- `어디까지 도와주시는 거예요?`는 기대 문서 6/20 대신 사업 목적 문서 2를 인용해 실제 1건 실패했다.
- `MANUAL_FAQS` 8건은 “원본과 겹치지 않는다”는 주석과 달리 원본 FAQ/KB와 겹치며, 넓은 키워드로 원본보다 먼저 오답을 만든다.

따라서 현재 단계는 **Phase B 기능 구현 후 출시 게이트 정비 중**이다. “76/77”은 참고 기록이지 승인 수치가 아니다.

---

### Task 1: FAQ 오답 경로와 QA 채점기 수정

**Files:**
- Modify: `scripts/chatbot-matrix.mts:3-101`
- Modify: `scripts/qa-run.mts:12-88`
- Modify: `lib/chatbot/engine.ts:1-151`
- Modify: `lib/chatbot/content.ts:238-361`
- Modify: `tests/qa-set.json`
- Regenerate: `tests/qa-result.json`

**Interfaces:**
- Consumes: `routeFreeText(input): EngineResult`, API 응답의 `source`, `refId`, `docIds`
- Produces: 원본 FAQ는 `faq-NN`, KB/AI는 문서 번호로 검증하는 거짓 양성 없는 QA 판정

- [ ] **Step 1: 현재 오답을 회귀 케이스로 고정한다**

`scripts/chatbot-matrix.mts`의 `Case`에 `expectRef`를 추가하고 아래 케이스를 넣는다.

```ts
type Case = { input: string; expect: string; expectRef?: string; note?: string }

{ input: "제가 늦으면 어떻게 되나요?", expect: "fallback", note: "노쇼 FAQ 오분류 금지" },
{ input: "진단서 발급받으려면 어디로 가요?", expect: "fallback", note: "센터 위치 FAQ 오분류 금지" },
{ input: "보험사에 낼 서류 떼는 것도 도와주세요", expect: "fallback", note: "일반 행정 FAQ 오분류 금지" },
```

판정도 종류와 참조 ID를 함께 보게 한다.

```ts
const ok = r.logKind === c.expect && (!c.expectRef || r.refId === c.expectRef)
```

- [ ] **Step 2: 회귀 테스트가 현재 코드에서 실패하는지 확인한다**

Run: `npm run test:chatbot`

Expected: 위 3건이 현재 `faq_hit`로 분류되어 FAIL.

- [ ] **Step 3: 중복 수기 FAQ를 삭제하고 질문형 잡음 정규화를 추가한다**

`lib/chatbot/content.ts`의 `MANUAL_FAQS`를 삭제하고 원본 44건만 사용한다. 더 이상 쓰지 않는
`ChatFaq` 타입 import도 함께 제거한다.

```ts
export const FAQS = GENERATED_FAQS
```

`lib/chatbot/engine.ts`는 질문형 공통 표현이 점수를 부풀리지 않도록 FAQ 비교용 문자열에서만
의문사·종결 표현을 뺀다. 클라이언트 엔진이 서버용 `kb.ts`를 import하지 않도록 한 줄짜리 로컬 정규화를 쓴다.

```ts
const FAQ_NOISE =
  /(어떻게|어디서|어디|무엇|뭐|알려주세요|알려줘|도와주세요|도와줘|되나요|되나|하나요|하나|할까요|인가요|가요|나요|까요)/g

// ponytail: 44개 한국어 FAQ용 휴리스틱이다. 실제 질문 QA가 한계를 보이면 형태소 분석을 검토한다.
const faqKey = (input: string) => normalize(input).replace(FAQ_NOISE, "")

const key = faqKey(raw)
// ...
score = Math.max(score, similarity(key, faqKey(q)))
```

정확 부분 일치와 정책 우선순위는 그대로 둔다. 수기 별칭은 다시 만들지 않는다. FAQ가 확실하지 않으면 KB/LLM으로 넘기는 편이 안전하다.

- [ ] **Step 4: QA가 FAQ의 실제 참조 ID를 검증하게 한다**

`scripts/qa-run.mts` 결과에 `refId`를 추가하고, `faq-NN`의 번호가 기대 문서 목록에 있을 때만 통과시킨다.

```ts
type Res = {
  q: string
  expect: unknown
  source: string
  refId: string
  docs: number[]
  reason: string
  answer: string
  pass: boolean
}

const faqSeq = (refId: unknown) =>
  Number(String(refId ?? "").match(/^faq-(\d+)$/)?.[1] ?? -1)

const cited = docs.some((n: number) => it.expect.includes(n))
const matchedFaq = d.source === "faq" && it.expect.includes(faqSeq(d.refId))
pass = cited || matchedFaq
```

`results.push(...)`에는 `refId: String(d.refId ?? "")`를 함께 저장한다.

`source="faq"`를 무조건 통과시키는 분기와 `FAQ 응답 — 내용 확인 필요` 예외를 삭제한다.

- [ ] **Step 5: 결정적 테스트를 다시 실행한다**

Run: `npm run test:chatbot`

Expected: 라우팅 전 케이스 통과, FAQ 대표/유사질문 Top-1 85% 이상.

- [ ] **Step 6: 77문항 QA를 다시 실행한다**

Run in terminal 1: `npm run dev`

Run in terminal 2: `npm run qa`

Expected: 정책 10/10, 범위 밖 10/10, KB/FAQ 57/57. 한 건이라도 다른 문서를 인용하면 다음 단계로 진행하지 않고 해당 질문을 회귀 케이스로 먼저 추가한다.

- [ ] **Step 7: 커밋한다**

```bash
git add lib/chatbot/content.ts lib/chatbot/engine.ts scripts/chatbot-matrix.mts scripts/qa-run.mts tests/qa-set.json tests/qa-result.json
git commit -m "fix(chatbot): FAQ 오분류와 QA 거짓 양성 제거"
```

---

### Task 2: 공개 AI 엔드포인트·클라이언트 실패·로그 파기 안전장치 마감

**Files:**
- Modify: `supabase/migrations/20260823000000_chatbot_logs_answer.sql:28-45`
- Modify: `lib/chatbot/ratelimit.ts:17-75`
- Modify: `components/chat/ChatWidget.tsx:152-200`
- Modify: `app/api/cron/purge-logs/route.ts:20-28`
- Modify: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `chatbot_usage(day, env, ai_calls)` 기본키 `(day, env)`
- Produces: `consume_chatbot_budget(p_day, p_env, p_limit) -> (used, allowed)`, 15초 내 로컬 fallback으로 복구하는 클라이언트, 인증 없이는 실행되지 않는 파기 cron

- [ ] **Step 1: 일일 한도 경쟁 조건을 재현할 DB 검증문을 준비한다**

마이그레이션 적용 후 아래 세 호출에서 `allowed`가 `true, true, false`가 되어야 한다.

```sql
delete from chatbot_usage where day = current_date and env = 'budget-test';
select * from consume_chatbot_budget(current_date, 'budget-test', 2);
select * from consume_chatbot_budget(current_date, 'budget-test', 2);
select * from consume_chatbot_budget(current_date, 'budget-test', 2);
```

- [ ] **Step 2: 원자적 일일 예산 함수를 같은 미적용 마이그레이션에 추가한다**

```sql
create or replace function consume_chatbot_budget(
  p_day date,
  p_env text,
  p_limit integer
)
returns table(used integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  current_used integer;
begin
  insert into chatbot_usage(day, env, ai_calls)
  values (p_day, p_env, 1)
  on conflict(day, env) do update
    set ai_calls = chatbot_usage.ai_calls + 1
    where chatbot_usage.ai_calls < p_limit
  returning ai_calls into current_used;

  if current_used is null then
    select ai_calls into current_used
      from chatbot_usage where day = p_day and env = p_env;
    return query select coalesce(current_used, p_limit), false;
  end if;

  return query select current_used, true;
end;
$fn$;

revoke all on function consume_chatbot_budget(date, text, integer)
  from public, anon, authenticated;
grant execute on function consume_chatbot_budget(date, text, integer)
  to service_role;
```

- [ ] **Step 3: 애플리케이션의 읽기 후 upsert를 RPC 한 번으로 바꾼다**

```ts
const { data, error } = await client.rpc("consume_chatbot_budget", {
  p_day: day,
  p_env: env,
  p_limit: limit,
}).single()

if (error || !data) return { ok: false, used: 0, limit }
return { ok: data.allowed, used: data.used, limit }
```

인메모리 IP·세션 제한에는 실제 한계를 코드에 남긴다.

```ts
// ponytail: Vercel 인스턴스별 제한이다. 전역 IP 차단이 필요해지면 Vercel WAF로 올린다.
```

- [ ] **Step 4: `CRON_SECRET`이 없으면 파기 API가 실패하도록 바꾼다**

```ts
const secret = process.env.CRON_SECRET
if (!secret) {
  return NextResponse.json({ error: "CRON_SECRET 미설정" }, { status: 503 })
}
if (request.headers.get("authorization") !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

- [ ] **Step 5: 운영 설정과 원본 export 보호 규칙을 명시한다**

`.env.example`에 다음을 추가한다.

```dotenv
# Vercel Cron과 수동 실행 인증
# CRON_SECRET=
CHATBOT_LOG_RETAIN_DAYS=90
```

`.gitignore`에 다음을 추가한다.

```gitignore
# 채널톡 원본 대화 이력 — 개인정보 포함
docs/chatbot-assets/channeltalk-export/

# 채널톡 비교용 대용량 원본 영상 — Slack 원본만 보존
docs/chatbot-assets/reference-video/
```

- [ ] **Step 6: 자유질문의 무한 대기와 비정상 응답을 로컬 fallback으로 종료한다**

`ChatWidget.tsx`의 `/api/chatbot/ask` 요청에 새 의존성 없이 플랫폼 `AbortSignal.timeout()`을 사용한다.

```ts
const CHAT_REQUEST_TIMEOUT_MS = 15_000

const res = await fetch("/api/chatbot/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: text, sessionId: getSessionId(), history }),
  signal: AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS),
})
const data = await res.json()
if (typeof data?.answer !== "string" || !data.answer.trim()) {
  throw new Error(`invalid chatbot response: ${res.status}`)
}
```

429는 현재 유효한 `answer`를 주므로 그대로 안내하고, 400/500의 오류 JSON·잘못된 JSON·15초 초과·네트워크 단절은 기존 `catch`의 `routeFreeText()`로 강등한다. `finally`에서 `pending=false`와 입력 포커스 복귀가 항상 실행되는 구조를 유지한다.

- [ ] **Step 7: 로컬 DB와 정적 회귀를 검증한다**

Run: `npx supabase db reset`

Run: 위 Step 1 SQL을 로컬 Studio SQL Editor에서 실행.

Run: `npm run test:chatbot`

Run: `npx tsc --noEmit`

Expected: 두 번 허용 후 세 번째 거절, `chatbot_usage.ai_calls=2`, 라우팅/FAQ 회귀와 TypeScript 검사 exit 0.

- [ ] **Step 8: 커밋한다**

```bash
git add .env.example .gitignore app/api/cron/purge-logs/route.ts components/chat/ChatWidget.tsx lib/chatbot/ratelimit.ts supabase/migrations/20260823000000_chatbot_logs_answer.sql
git commit -m "fix(chatbot): AI 실패와 로그 파기 보호 강화"
```

---

### Task 3: 로컬 재현 가능한 기준선 확립

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `eslint.config.mjs`
- Verify: `supabase/migrations/*.sql`
- Verify: `docs/chatbot-assets/kb_md/01~59_*.md`
- Regenerate: `lib/chatbot/faqs.generated.ts`

**Interfaces:**
- Consumes: 로컬 Supabase와 원본 FAQ/KB 자산
- Produces: 빈 DB에서 그대로 재현되는 59개 KB와 44개 FAQ

- [ ] **Step 1: 원본 FAQ에서 생성 파일을 다시 만든다**

Run: `npm run build:faq`

Expected: `FAQ 44건`이며 `git diff --exit-code lib/chatbot/faqs.generated.ts` 통과.

- [ ] **Step 2: 빈 로컬 DB에 전체 마이그레이션을 적용한다**

Run: `npx supabase db reset`

Expected: `20260823000000`까지 오류 없이 적용.

- [ ] **Step 3: 로컬 KB를 적재한다**

Run: `npm run kb:ingest`

Expected: `kb_documents 59건`.

- [ ] **Step 4: KB 검색 기준을 검증한다**

Run: `npm run kb:eval`

Expected: `KB 문서: 59`, Top-1 목표 85% 달성.

- [ ] **Step 5: Next.js 16용 ESLint CLI 게이트를 복구한다**

Next.js 16은 `next build`에서 lint를 실행하지 않으므로 ESLint CLI와 Flat Config를 명시적으로 설치한다.

Reference: `https://nextjs.org/docs/app/api-reference/config/eslint`

Run: `npm install --save-dev eslint@^9 eslint-config-next@16.0.7`

Create: `eslint.config.mjs`

```javascript
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
```

Expected: `node_modules/.bin/eslint`가 존재하고 `npm run lint`가 실제로 실행된다. 기존 위반은 규칙을 끄지 말고 수정하되, 챗봇과 무관한 대량 위반이 확인되면 별도 기준선 작업으로 분리하고 해당 결과를 출시 차단사항에 기록한다.

- [ ] **Step 6: 전체 정적 검증을 실행한다**

Run: `npm run test:chatbot`

Run: `npm run lint`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: 네 명령 모두 exit 0. `next.config.mjs`의 `ignoreBuildErrors: true` 때문에 타입 검사는 빌드와 별개로 반드시 실행한다.

- [ ] **Step 7: 재현 가능한 기준선을 커밋한다**

```bash
git add package.json package-lock.json eslint.config.mjs lib/chatbot/faqs.generated.ts
git commit -m "chore: restore chatbot release quality gates"
```

---

### Task 4: 운영 DB 선적용 후 최신 Preview 배포

**Files:**
- Deploy: `supabase/migrations/20260823000000_chatbot_logs_answer.sql`
- Configure: Vercel project `remo-dev/ehwa-website`
- Push: branch `feat/chatbot`

**Interfaces:**
- Consumes: Task 1~3의 통과 커밋과 운영 Supabase
- Produces: 로컬 HEAD와 같은 커밋의 Git 기반 Preview

- [ ] **Step 1: Preview 환경변수를 Vercel에 영구 등록한다**

Vercel dashboard에서 기존 Production의 Supabase 변수 3개를 Preview 대상으로도 복제한다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Preview에 다음 공개 설정값도 등록한다.

```text
NEXT_PUBLIC_CHATBOT_ENABLED=true
CHATBOT_MODEL=google/gemini-3.5-flash-lite
CHATBOT_DAILY_AI_LIMIT=500
CHATBOT_LOG_RETAIN_DAYS=90
```

인증은 `GOOGLE_GENERATIVE_AI_API_KEY`를 Preview에 등록해 직접 호출하거나, 해당 키 없이 Vercel AI Gateway OIDC를 사용한다. 둘을 동시에 별도 경로로 운영하지 않는다.

- [ ] **Step 2: 운영 DB에 가산 마이그레이션을 먼저 적용한다**

```bash
set -a
source .env.tokens
set +a
npx supabase db push --linked
npx supabase migration list --linked
```

Expected: local/remote 모두 `20260823000000` 표시.

- [ ] **Step 3: 기능 브랜치를 원격에 push한다**

Run: `git push origin feat/chatbot`

Expected: `origin/feat/chatbot`과 로컬 HEAD가 같고 Vercel Git Preview가 자동 생성됨.

- [ ] **Step 4: 최신 Preview 메타데이터를 확인한다**

Run: `vercel ls --yes`

Run: `vercel inspect https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app`

Expected: status `Ready`, target `Preview`, 별칭 `ehwa-website-git-feat-chatbot-remo-dev.vercel.app`.

- [ ] **Step 5: Preview에서 답변·로그·파기를 검증한다**

검수 항목:

```text
버튼 6개 → 하위 흐름 → 처음으로/질문하기
FAQ 원본 응답
KB 직답과 LLM 답변의 source_doc_ids
범위 밖 질문의 fallback + 전화/카카오 카드
chatbot_logs의 질문 1건당 1행, answer/latency/provider/model 저장
purge-logs 무인증 401, 인증 호출 200
NEXT_PUBLIC_CHATBOT_ENABLED=true에서 채널톡 SDK 미로드·자체 챗봇만 노출
NEXT_PUBLIC_CHATBOT_ENABLED=false에서 자체 챗봇 미노출·채널톡만 노출
/admin 경로에서 자체 챗봇·채널톡 런처 모두 미노출
```

Expected: Preview 로그만 `env=preview`로 적재되고 Production 사용자는 영향 없음.

---

### Task 5: 채널톡 이력·브라우저 UI/UX·접근성 승인

**Files:**
- Read: `docs/채널톡_대화이력_수령절차_20260823.md`
- Read: `docs/chatbot-assets/README.md`
- Store locally only: `docs/chatbot-assets/channeltalk-export/`
- Retrieve locally only: `docs/chatbot-assets/reference-video/실제 이대목동 챗봇 동작.mp4`
- Update after masking: `tests/qa-set.json`
- Regenerate: `tests/qa-result.json`
- Create: `tests/chatbot-browser-qa.md`

**Interfaces:**
- Consumes: 채널톡 `Message data` 포함 Excel과 최신 Preview
- Produces: 실제 사용자 질문 분포·오답·fallback 목록, 브라우저별 QA 증빙, P0/P1 0건 판정과 병원 담당자 승인

- [ ] **Step 1: 메시지를 포함한 채널톡 Excel을 받는다**

채널톡 데스크의 수신함에서 “메시지를 포함한 파일”로 내려받는다. Pro export가 불가능하면 Open API 키로 대화 전량을 받는다. 키와 원본은 커밋하지 않는다.

- [ ] **Step 2: 원본이 ignore되는지 먼저 확인한다**

Run: `git check-ignore -v docs/chatbot-assets/channeltalk-export/sample-export.xlsx`

Expected: `.gitignore`의 `channeltalk-export/` 규칙 출력. 출력이 없으면 파일을 복사하거나 가공하지 않는다.

- [ ] **Step 3: 실제 파일의 열 이름을 확인한 뒤 데이터별 후속 계획을 작성한다**

export 스키마는 수령 전 확정할 수 없으므로 파서를 미리 만들지 않는다. `Message data`의 실제 발화/화자/시각 열을 확인한 뒤 `maskPII()`를 재사용하는 별도 파싱 계획을 작성한다.

- [ ] **Step 4: 마스킹된 실제 질문을 QA 세트에 추가한다**

합성 77문항과 분리해 실제 질문의 빈도 상위, 채널톡 성공, 채널톡 실패를 각각 표본화한다. 이름·전화·이메일·주민번호·환자 식별값이 남은 행은 테스트 파일에 넣지 않는다.

- [ ] **Step 5: 반복 가능한 브라우저 QA 기록을 만든다**

Create: `tests/chatbot-browser-qa.md`

```markdown
# Chatbot Browser QA

- Preview URL:
- Git commit:
- 수행일/KST:
- 수행자:
- 채널톡 비교 영상 버전: `실제 이대목동 챗봇 동작.mp4`

| 환경 | 화면/기기 | 기본 흐름 | 오류/긴 콘텐츠 | 접근성 | 증빙 링크 | 판정 |
|---|---|---|---|---|---|---|
| Chrome 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Edge 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Firefox 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Safari 16.4+ | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| iOS Safari 최신 | 실제 iPhone, 세로/가로 | 미실행 | 미실행 | VoiceOver 미실행 | 미등록 | 차단 |
| Android Chrome 최신 | 실제 Android, 세로/가로 | 미실행 | 미실행 | TalkBack 미실행 | 미등록 | 차단 |

## 결함

| ID | 심각도 | 환경 | 재현 절차 | 기대/실제 | 담당 | 상태 | 재검수 증빙 |
|---|---|---|---|---|---|---|---|

## 최종 승인

- P0 미해결: 미집계
- P1 미해결: 미집계
- 개발 승인자/일시:
- 병원 승인자/일시:
```

Preview URL과 Git commit이 비어 있거나 서로 다른 배포를 가리키면 검수를 시작하지 않는다. 캡처·영상은 개인정보가 없는 화면만 Vercel 배포 코멘트 또는 승인된 업무 저장소에 올리고, 이 문서에는 링크만 기록한다.

- [ ] **Step 6: 브라우저·화면 크기 매트릭스를 실행한다**

각 브라우저는 새 프로필 또는 시크릿 창에서 테스트하고, 데스크톱 1280×800·태블릿 768×1024·모바일 390×844를 확인한다. iOS Safari와 Android Chrome은 에뮬레이션이 아니라 실제 기기에서 세로·가로 회전을 모두 확인한다.

```text
런처 노출 → 클릭 → dialog 열림 → 닫기 → 런처 포커스 복귀
웰컴 메시지와 빠른 선택 6개 → 모든 하위 분기 → 이전 단계/처음으로/질문하기
자유질문 FAQ → KB 직답 → AI 답변 → 범위 밖 fallback
전화 tel:, 카카오, Walla, 이메일 링크의 실제 대상값
닫기/재열기 시 현재 대화 유지, 새로고침 시 화면 대화는 초기화되지만 같은 탭의 익명 session ID는 유지, 탭 종료 후 새 session ID 발급
채팅창·헤더·입력·버튼이 화면 밖으로 잘리지 않고 페이지 가로 스크롤 없음
자체 챗봇 활성 시 ChannelTalk 스크립트/런처가 없고 관리자 화면에는 어떤 런처도 없음
```

Expected: 모든 셀에 판정과 증빙 링크가 있고 P0/P1 결함이 0건이다.

- [ ] **Step 7: UI 상태와 실패 경로를 검수한다**

```text
답변 대기 중 “답변을 준비하고 있어요…” 표시, 입력·전송 중복 방지, 완료 후 입력 포커스 복귀
DevTools Offline 또는 로컬 서버 중지: 정책/FAQ 로컬 fallback 또는 담당자 연결, 무한 로딩 없음
API 429/500 및 잘못된 JSON: 사용자에게 빈 말풍선·원문 오류·무한 pending을 노출하지 않음
15초 이상 응답 지연: 복구 가능한 안내와 다시 질문할 수 있는 상태
500자 입력, 긴 한국어 단어, 긴 URL, 긴 답변, 액션 카드 다수: 말풍선 넘침 없이 대화 영역만 스크롤
빠른 연속 클릭·Enter 연타: 같은 질문/로그가 중복 생성되지 않음
모바일 가상 키보드 열기·닫기와 화면 회전: 입력창·보내기·닫기 버튼 유지
모달 열린 상태: 배경 페이지가 스크롤되거나 키보드/스크린리더 탐색 대상으로 들어오지 않음
```

실패가 나오면 결함 표에 재현 절차와 심각도를 먼저 기록한다. P0(사용 불가·개인정보·잘못된 의료/공식정보)과 P1(주요 흐름·접근성·지원 브라우저 결함)은 수정 및 같은 환경 재검수 전까지 Task 6으로 진행하지 않는다.

- [ ] **Step 8: 발견한 P0/P1을 한 건씩 수정하고 같은 환경에서 재검수한다**

각 결함은 재현 절차를 먼저 확정하고, 가능한 경우 `scripts/chatbot-matrix.mts` 또는 `tests/qa-set.json`에 가장 작은 회귀 케이스 하나를 추가한다. UI 전용 결함은 수정 전·후에 같은 브라우저·기기·화면 크기에서 같은 절차를 실행해 증빙 링크를 남긴다. 서로 무관한 결함을 한 커밋에 묶지 않는다.

Expected: `tests/chatbot-browser-qa.md`의 P0/P1 상태가 모두 “재검수 통과”이고 미해결 수가 각각 0이다.

- [ ] **Step 9: Slack 원본 채널톡 동작 영상을 받아 대조한다**

`docs/chatbot-assets/README.md`에 적힌 Slack `#3-신기술개발팀`의 2026-08-14 스레드에서 `자체 구축 챗봇 자료모음.zip`을 받아 `실제 이대목동 챗봇 동작.mp4`만 로컬 `docs/chatbot-assets/reference-video/`에 둔다. 283MB 영상은 커밋하지 않는다.

Run: `git check-ignore -v 'docs/chatbot-assets/reference-video/실제 이대목동 챗봇 동작.mp4'`

Expected: `.gitignore`의 `reference-video/` 규칙 출력. 원본 영상을 받지 못했거나 ignore되지 않으면 기억이나 문서 설명만으로 대조하지 않고 이 단계를 차단한다.

```text
우하단 런처 위치와 명칭
아이콘 → 서브 채팅창 진입 방식
첫 안내 문구와 빠른 선택 버튼 순서
지원 범위/대상/신청/비용/운영시간·위치/질문하기 흐름
전화·카카오·Walla 연결 문구와 대상 URL
자체 챗봇에서 의도적으로 달라진 접근성 개선점
```

차이는 `tests/chatbot-browser-qa.md`에 “동일/의도적 개선/수정 필요”로 기록하고, 문구·연결 대상 차이는 병원 담당자가 승인하기 전까지 출시하지 않는다.

- [ ] **Step 10: 수동 접근성을 승인받는다**

```text
NVDA+Chrome 또는 Edge, VoiceOver+Safari, TalkBack+Android Chrome: 런처 → 대화 → 입력 → 닫기
키보드만 사용: 포커스 트랩, ESC, 런처 복귀
A11yBar 150% + 브라우저 200%: 잘림/겹침/가로 스크롤 없음
390px 모바일: 44px 터치 영역, 닫기 버튼 가림 없음
고대비: 패널·말풍선·버튼·링크 식별 가능
읽기 순서·화자·새 답변 알림이 중복되거나 건너뛰지 않음
```

- [ ] **Step 11: 병원 담당자 UI/문구 승인을 기록한다**

병원 담당자는 실제 Preview에서 버튼 순서, 안내 문구, 공식 전화번호 `02-2650-5586`, 카카오, Walla URL, 검토대기 4건의 거절 문구를 확인한다. 승인자와 KST 일시를 `tests/chatbot-browser-qa.md`에 기록하고 구두 승인만으로 진행하지 않는다.

- [ ] **Step 12: 병원 개인정보처리방침 반영을 확인한다**

처리 항목(질문·답변·익명 세션·근거·사용량), 목적(품질·분쟁 확인), 보관기간(90일), 접근 권한(service-role/승인 관리자), 파기 방식을 공식 처리방침에 반영한다. 반영 전 Production 전환 금지.

---

### Task 6: Production 전환, 관찰, 채널톡 종료

**Files:**
- Configure: Vercel Production environment
- Merge: `feat/chatbot` → `main`
- Keep temporarily: `app/layout.tsx`의 채널톡 fallback 스니펫

**Interfaces:**
- Consumes: Task 1~5의 승인 결과
- Produces: 자체 챗봇 Production과 즉시 복구 가능한 채널톡 fallback

- [ ] **Step 1: Production 전환 조건을 모두 확인한다**

```text
QA: 정책 10/10, 범위 밖 10/10, KB/FAQ 57/57, 잘못된 근거 0건
운영 migration: 20260823000000 적용
Preview 환경·로그·파기 검수 통과
실제 채널톡 질문 비교 완료
브라우저/기기 QA 기록 완료, 미해결 P0/P1 0건
오류·긴 콘텐츠·가상 키보드 UI 검수 통과
채널톡 동작 영상 대조와 병원 UI/문구 승인 완료
NVDA/VoiceOver/TalkBack 수동 접근성 통과
개인정보처리방침 반영
채널톡 대화 이력 원본 보관 확인
```

- [ ] **Step 2: Production 챗봇 환경변수를 등록한다**

```text
NEXT_PUBLIC_CHATBOT_ENABLED=true
CHATBOT_MODEL=google/gemini-3.5-flash-lite
CHATBOT_DAILY_AI_LIMIT=500
CHATBOT_LOG_RETAIN_DAYS=90
```

Production에는 이미 Supabase 3종과 `CRON_SECRET`, 관리자 인증 3종이 있다. 값 변경 후에는 기존 배포가 아니라 새 빌드가 필요하다.

- [ ] **Step 3: main을 fast-forward하고 push한다**

```bash
git switch main
git merge --ff-only feat/chatbot
git push origin main
```

Expected: Vercel Git Production 배포 `Ready`; 자체 챗봇만 노출되고 채널톡 SDK는 로드되지 않음.

- [ ] **Step 4: 운영 smoke test를 수행한다**

```text
GET / 200
GET /api/posts 200
관리자 로그인·게시글 쓰기 정상
자체 챗봇 버튼/FAQ/KB/AI/fallback 정상
대화 1건당 chatbot_logs 1행
로그 answer의 전화·이메일 마스킹
cron 두 경로 인증/실행 정상
```

- [ ] **Step 5: 1~2주 동안 매일 운영 지표를 확인한다**

```sql
select kind, count(*)
from chatbot_logs
where env = 'production' and created_at >= now() - interval '1 day'
group by kind order by kind;

select fallback_reason, count(*)
from chatbot_logs
where env = 'production' and created_at >= now() - interval '1 day'
  and kind = 'fallback'
group by fallback_reason order by count(*) desc;
```

fallback 급증, `model_error`, 잘못된 공식정보가 확인되면 신규 AI 기능을 확장하지 않고 원인 질문을 회귀 세트에 먼저 추가한다.

- [ ] **Step 6: 필요 시 즉시 롤백한다**

Production의 `NEXT_PUBLIC_CHATBOT_ENABLED=false`로 바꾸고 같은 main을 재배포한다. 환경변수 변경만으로 기존 빌드는 바뀌지 않으므로 반드시 redeploy한다. 그러면 기존 조건부 채널톡 스니펫이 다시 로드된다.

- [ ] **Step 7: 안정화 뒤 채널톡을 종료한다**

1~2주 관찰 통과와 대화 이력 보관을 확인한 뒤 채널톡 구독을 해지한다. 그때 `app/layout.tsx`의 fallback 스니펫과 `app/admin/layout.tsx`의 `ChannelIO` 숨김 코드를 삭제한다.

---

## 의도적으로 미룬 범위

- `/admin/chat` CRUD·통계 화면: v1은 Git 원본 + Supabase Table Editor + 스크립트로 운영한다. 병원 비개발 운영자가 직접 수정해야 한다는 요구가 확정될 때 추가한다.
- pgvector/별도 검색 인프라: 59개 KB 전문이 현재 모델 컨텍스트에 들어가므로 실제 QA가 한계를 보일 때만 도입한다.
- Redis rate limit: 일일 전역 예산은 DB로 보장하고, IP 전역 차단은 실제 남용이 관측되면 Vercel WAF로 올린다.
- 채널톡 원본 파서: 실제 export 열 구조를 받기 전에는 만들지 않는다.
