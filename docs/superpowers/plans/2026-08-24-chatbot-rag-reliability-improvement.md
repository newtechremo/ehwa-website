# 자체 챗봇 RAG 신뢰성 개선 Implementation Plan

> **실행 상태 (2026-09-07 확인):** 이 문서의 체크박스는 실행 당시 갱신되지 않았다.
> 계획된 작업은 실제로 수행돼 `main`에 반영됐고 Production 이 운영 중이다.
> 체크박스를 진행 현황의 근거로 쓰지 말 것. 권위 있는 현황은 아래 문서를 본다.
> - 현황·검증 수치: `docs/자체챗봇_Production_배포_및_현재진행현황_20260825.md`
> - 운영 절차: `docs/chatbot-operations-runbook.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agent QA가 사용자 예산을 소진하지 않고, 핵심 병원 업무 질문은 필수 사실을 빠짐없이 답하며, 나머지 질문은 작은 근거 집합만 사용하는 하이브리드 RAG로 처리하고 실제 답변 전체를 기준으로 출시 여부를 판정한다.

**Architecture:** 정책 차단과 정확 FAQ는 그대로 앞단에 두고, 검증된 핵심 업무는 KB의 `short_answer`로 결정적으로 응답한다. 그 밖의 질문만 기존 문자 검색과 Google embedding을 RRF로 합친 Top-K 문맥을 한 번의 LLM 호출에 전달한다. 사용량은 환경별 namespace와 모델 시도별 감사 이벤트로 분리하고, 정적 테스트·소규모 live canary·전체 재생을 서로 다른 단계로 실행한다.

**Tech Stack:** Next.js 16 Route Handler, TypeScript, AI SDK 7, `@ai-sdk/google`, Supabase PostgreSQL/pgvector, Node.js `assert`·`crypto`, Vercel CLI

**Spec:** [`docs/자체챗봇_개선실행방안_및_AI한도_소진원인분석_20260824.md`](../../자체챗봇_개선실행방안_및_AI한도_소진원인분석_20260824.md)

## Global Constraints

- 현재 ChannelTalk을 유지하며 Task 9의 승인 게이트 전에는 Production 자체 챗봇을 켜지 않는다.
- 새 런타임 npm 패키지는 추가하지 않는다. AI SDK, Google provider, Supabase, Node 표준 라이브러리만 사용한다.
- `daily_limit`은 애플리케이션 내부 한도만 뜻한다. DB 오류와 제공자 오류는 각각 `budget_unavailable`, `model_error`로 분리한다.
- 일일 기준일은 `Asia/Seoul` 자정이며, QA·로컬 사람·Preview·Production은 서로 다른 namespace를 사용한다.
- 핵심답변의 전화번호·URL·지원 범위는 현재 ChannelTalk 실답변과 KB 원문을 기준으로 한다.
- 원본 ChannelTalk 대화는 `docs/chatbot-assets/channeltalk-export/`에만 저장하고 커밋하지 않는다. 파생 결과도 `maskPII()`를 통과해야 한다.
- LLM 프롬프트에 59개 문서 전문을 다시 넣지 않는다. 최대 문맥은 12,000자, 최대 8개 chunk다.
- 핵심답변은 3회 반복 모두 필수 사실 100%, 금지 사실 0건이어야 한다. “정답 문서 중 하나 인용”만으로 통과시키지 않는다.
- 모델 호출 실패를 자동으로 재시도해 합격으로 숨기지 않는다. 각 시도를 결과와 예산 감사 이벤트에 남긴다.
- `.claude/settings.local.json`에서 발견된 GitHub PAT 형태 자격증명은 구현 시작 전에 폐기한다. 파일은 현재 global ignore이며 Git 이력에는 없지만, 노출된 값 자체는 재사용하지 않는다.
- 각 Task는 독립 커밋으로 끝낸다. 서로 다른 Task의 변경을 한 커밋에 합치지 않는다.

---

## File Map

| 구분 | 파일 | 책임 |
|---|---|---|
| Create | `lib/chatbot/answer-contract.ts` | 답변 필수·금지 사실 평가 |
| Create | `tests/chatbot-critical-answers.json` | 사용자 지적 질문의 정답 계약 |
| Create | `scripts/answer-contract-test.mts` | 평가기 순수 단위검증 |
| Create | `scripts/qa-critical.mts` | 작은 live 반복 QA |
| Create | `lib/chatbot/runtime.ts` | KST 날짜와 usage namespace 단일 정의 |
| Create | `supabase/migrations/20260824170000_chatbot_budget_audit.sql` | 모델 시도 감사 이벤트와 v2 예산 RPC |
| Create | `supabase/tests/chatbot_budget.sql` | 예산 경계·감사·조정 SQL 회귀검증 |
| Create | `scripts/runtime-test.mts` | KST 날짜·namespace 회귀검증 |
| Create | `scripts/ct-export.mts` | `initial/opened/snoozed/closed` 전체 이력 수집 |
| Create | `scripts/ct-export-test.mts` | cursor pagination과 상태 누락 검증 |
| Create | `scripts/ct-volume.mts` | 실제 질문량 기반 운영 한도 계산 |
| Create | `supabase/migrations/20260824180000_kb_short_answer.sql` | 결정적 짧은 답변 컬럼 |
| Create | `supabase/migrations/20260824190000_kb_hybrid_retrieval.sql` | chunk, vector index, 검색 RPC |
| Create | `lib/chatbot/retrieval.ts` | lexical+semantic RRF와 문맥 상한 |
| Create | `tests/retrieval-set.json` | 실제 표현 기반 독립 검색 holdout |
| Create | `scripts/retrieval-test.mts` | RRF·문맥 상한 순수 단위검증 |
| Create | `scripts/retrieval-eval.mts` | 로컬 DB·embedding 통합 검색 평가 |
| Create | `app/api/chatbot/health/route.ts` | 인증된 QA preflight 상태 조회 |
| Create | `scripts/qa-result-check.mts` | set/result hash·개수·합격 상태 검증 |
| Create | `scripts/chatbot-report.mts` | 일일 예산·fallback·지연·토큰 보고 |
| Create | `docs/chatbot-operations-runbook.md` | 환경값·QA·장애·rollback 운영 절차 |
| Modify | `app/api/chatbot/ask/route.ts` | 결정적 답변, Top-K 생성, 오류 분리, 1회 모델 호출 |
| Modify | `components/chat/ChatWidget.tsx` | `kb` source와 KB 후속 맥락 보존 |
| Modify | `lib/chatbot/engine.ts` | 구체 질문을 일반 FAQ가 가로채지 않게 제한 |
| Modify | `lib/chatbot/kb.ts` | `short_answer`, 부분포함 수정, 검색 타입 |
| Modify | `lib/chatbot/log.ts` | namespace, request/retrieval/model-attempt 메타데이터 |
| Modify | `lib/chatbot/model.ts` | embedding 모델 해석 |
| Modify | `lib/chatbot/ratelimit.ts` | 판별 가능한 예산 결과와 v2 RPC |
| Modify | `lib/chatbot/types.ts` | `kb` message source 추가 |
| Modify | `scripts/ingest-kb.mts` | 짧은 답변·chunk·변경 embedding 적재 |
| Modify | `scripts/qa-run.mts` | 전체 답변 계약, 결과 메타데이터, 재시도 제거 |
| Modify | `scripts/ct-replay.mts` | export manifest 검증, QA namespace, `kb` 맥락 |
| Modify | `scripts/chatbot-matrix.mts` | 일반 FAQ 가로채기 회귀 사례 |
| Modify | `tests/qa-set.json` | ID와 답변 계약 연결 |
| Delete | `tests/qa-result.json` | stale 결과가 현재 승인자료처럼 보이는 경로 제거 |
| Modify | `.gitignore` | live QA 결과를 ignored artifact로 보관 |
| Modify | `package.json` | 작은 검증·수집·보고 명령 |
| Modify | `next.config.mjs` | TypeScript 오류 무시 제거 |
| Modify | `CLAUDE.md` | 환경별 namespace와 실행 명령 |
| Modify | `tests/chatbot-browser-qa.md` | 실제 Preview/commit/기기/승인 결과 |

---

## Execution Preflight

Task 1을 시작하기 전에 사용자가 GitHub 계정에서 `.claude/settings.local.json`에 있던 PAT를 revoke한다. 실행자는 아래 세 명령으로 파일이 추적되지 않고 token-shaped 문자열이 Git 이력과 현재 workspace에 없는지 확인한다. 하나라도 출력이 있으면 구현을 시작하지 않는다.

```bash
git ls-files .claude/settings.local.json
git log --all -G'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}' --oneline -- .
rg -l 'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}' --hidden --glob '!.git/**' --glob '!.env*' .
```

Expected: 세 명령 모두 출력 0건

---

### Task 1: 답변 전체를 검사하는 Critical Contract Gate

**Files:**

- Create: `lib/chatbot/answer-contract.ts`
- Create: `tests/chatbot-critical-answers.json`
- Create: `scripts/answer-contract-test.mts`
- Create: `scripts/qa-critical.mts`
- Modify: `package.json`

**Interfaces:**

- Produces: `evaluateAnswer(answer: string, contract: AnswerContract): AnswerEvaluation`
- Produces: `npm run test:answer-contract`, `npm run qa:critical`
- Consumes later: Task 4의 핵심답변과 Task 7의 전체 QA가 동일 평가기를 사용한다.

- [ ] **Step 1: 평가기 실패·성공 예제를 먼저 작성한다**

`scripts/answer-contract-test.mts`에 다음 순수 테스트를 작성한다.

```ts
import assert from "node:assert/strict"
import { evaluateAnswer } from "../lib/chatbot/answer-contract"

const contract = {
  required: [
    { id: "internal-pharmacy", all: ["약국", "동행"], any: ["원내", "병원 안", "병원 내부"] },
    { id: "kakao", exact: ["https://pf.kakao.com/_LKhxkn/chat"] },
  ],
  forbidden: [{ id: "external-only", all: ["외부 약국만"] }],
}

assert.deepEqual(
  evaluateAnswer("외부 약국까지는 어렵습니다. 약국 문의는 전화해 주세요.", contract).missing,
  ["internal-pharmacy", "kakao"],
)
assert.equal(
  evaluateAnswer("병원 안 원내 약국까지 동행합니다. https://pf.kakao.com/_LKhxkn/chat", contract).pass,
  true,
)
console.log("answer-contract: PASS")
```

- [ ] **Step 2: 테스트를 실행해 평가기가 아직 없어 실패하는지 확인한다**

Run: `npx tsx scripts/answer-contract-test.mts`

Expected: `Cannot find module '../lib/chatbot/answer-contract'`

- [ ] **Step 3: 최소 평가기를 구현한다**

`lib/chatbot/answer-contract.ts`에 아래 타입과 동작을 구현한다.

```ts
export type FactRule = {
  id: string
  all?: string[]
  any?: string[]
  exact?: string[]
}

export type AnswerContract = {
  required: FactRule[]
  forbidden?: FactRule[]
}

export type AnswerEvaluation = {
  pass: boolean
  missing: string[]
  forbiddenHits: string[]
}

const key = (value: string) => value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "")

function matches(answer: string, rule: FactRule): boolean {
  const normalized = key(answer)
  const all = !rule.all?.length || rule.all.every((value) => normalized.includes(key(value)))
  const any = !rule.any?.length || rule.any.some((value) => normalized.includes(key(value)))
  const exact = !rule.exact?.length || rule.exact.some((value) => answer.includes(value))
  return all && any && exact
}

export function evaluateAnswer(answer: string, contract: AnswerContract): AnswerEvaluation {
  const missing = contract.required.filter((rule) => !matches(answer, rule)).map((rule) => rule.id)
  const forbiddenHits = (contract.forbidden ?? []).filter((rule) => matches(answer, rule)).map((rule) => rule.id)
  return { pass: missing.length === 0 && forbiddenHits.length === 0, missing, forbiddenHits }
}
```

- [ ] **Step 4: Critical 질문 계약을 작성한다**

`tests/chatbot-critical-answers.json`에는 다음 4개 ID와 규칙을 그대로 넣는다.

```json
{
  "cases": [
    {
      "id": "movement-services",
      "question": "지원되는 교통 서비스는 무엇이 있는가?",
      "allowedSources": ["kb", "ai"],
      "repeat": 3,
      "required": [
        { "id": "exam-clinic", "all": ["검사실", "진료실", "이동"] },
        { "id": "walking", "any": ["보행", "부축"] },
        { "id": "wheelchair-bed", "all": ["휠체어", "이동식 침대"] },
        { "id": "one-to-one-guide", "all": ["안내"], "any": ["1:1", "일대일"] },
        { "id": "internal-pharmacy", "all": ["약국", "동행"], "any": ["원내", "병원 안", "병원 내부"] },
        { "id": "internal-boundary", "any": ["병원 건물 내부", "병원 내부", "원내"] }
      ]
    },
    {
      "id": "movement-application",
      "question": "검사실·진료실 이동 보조를 받으려면 어떻게 해야하는가?",
      "allowedSources": ["kb", "faq"],
      "repeat": 3,
      "required": [
        { "id": "three-days", "all": ["3일", "권장"] },
        { "id": "visit", "all": ["본관", "1층", "접수창구"] },
        { "id": "walla", "exact": ["https://walla.my/a/barrierfree_v"] },
        { "id": "kakao", "exact": ["https://pf.kakao.com/_LKhxkn/chat"] },
        { "id": "phone", "exact": ["02-2650-5586"] },
        { "id": "patient", "all": ["환자 정보"] },
        { "id": "appointment", "all": ["진료 예약일"] },
        { "id": "manager-final", "all": ["담당 매니저", "상담", "결정"] }
      ]
    },
    {
      "id": "home-nursing-application",
      "question": "가정간호 서비스는 어떻게 신청하나요?",
      "allowedSources": ["kb"],
      "repeat": 2,
      "required": [
        { "id": "doctor-order", "all": ["주치의", "처방"] },
        { "id": "consult-time", "any": ["외래 진료", "퇴원 전"] },
        { "id": "office", "exact": ["02-2650-5087"] }
      ],
      "forbidden": [{ "id": "barrier-free-generic", "exact": ["https://walla.my/a/barrierfree_v"] }]
    },
    {
      "id": "home-nursing-paraphrase",
      "question": "가정간호 서비스 신청은 어떻게 하나요?",
      "allowedSources": ["kb"],
      "repeat": 2,
      "required": [
        { "id": "doctor-order", "all": ["주치의", "처방"] },
        { "id": "office", "exact": ["02-2650-5087"] }
      ]
    }
  ]
}
```

- [ ] **Step 5: 작은 live runner를 작성하되 아직 실행하지 않는다**

`scripts/qa-critical.mts`는 `QA_BASE` 기본값을 `http://localhost:3113`으로 사용하고, 각 case를 `repeat`만큼 호출한다. 응답 전체와 `source/reason/provider/usage`, 클라이언트 측 `latencyMs`, 평가 결과를 gitignored 경로 `docs/chatbot-assets/channeltalk-export/qa-critical-result.json`에 저장하며 하나라도 실패하면 exit 1로 끝낸다. 자동 재시도는 넣지 않는다.

- [ ] **Step 6: 순수 테스트를 통과시킨다**

Run: `npm run test:answer-contract`

Expected: `answer-contract: PASS`, exit 0

- [ ] **Step 7: 커밋한다**

```bash
git add lib/chatbot/answer-contract.ts tests/chatbot-critical-answers.json scripts/answer-contract-test.mts scripts/qa-critical.mts package.json
git commit -m "test(chatbot): 핵심 답변 필수 사실 계약 추가"
```

---

### Task 2: QA 예산 격리·KST 날짜·소비 감사·오류 분리

**Files:**

- Create: `lib/chatbot/runtime.ts`
- Create: `supabase/migrations/20260824170000_chatbot_budget_audit.sql`
- Create: `supabase/tests/chatbot_budget.sql`
- Create: `scripts/runtime-test.mts`
- Modify: `lib/chatbot/ratelimit.ts`
- Modify: `lib/chatbot/log.ts`
- Modify: `app/api/chatbot/ask/route.ts`
- Modify: `lib/chatbot/content.ts`
- Modify: `package.json`
- Modify: `CLAUDE.md`

**Interfaces:**

- Produces: `usageNamespace(): string`, `dayInSeoul(date?: Date): string`
- Produces: `consumeDailyBudget(sessionId: string, operation: "embedding" | "generation"): Promise<BudgetResult>`
- `BudgetResult`: `allowed | exhausted | unavailable` 판별 union
- Database: `consume_chatbot_budget_v2(...) -> (used, allowed)`와 `chatbot_usage_events`

- [ ] **Step 1: KST와 namespace 실패 테스트를 작성한다**

`scripts/runtime-test.mts`:

```ts
import assert from "node:assert/strict"
import { dayInSeoul, usageNamespace } from "../lib/chatbot/runtime"

assert.equal(dayInSeoul(new Date("2026-08-24T14:59:59Z")), "2026-08-24")
assert.equal(dayInSeoul(new Date("2026-08-24T15:00:00Z")), "2026-08-25")

delete process.env.CHATBOT_USAGE_NAMESPACE
delete process.env.VERCEL_ENV
assert.equal(usageNamespace(), "development")
process.env.VERCEL_ENV = "preview"
assert.equal(usageNamespace(), "preview")
process.env.CHATBOT_USAGE_NAMESPACE = "qa-local"
assert.equal(usageNamespace(), "qa-local")
process.env.CHATBOT_USAGE_NAMESPACE = "qa local"
assert.throws(() => usageNamespace(), /invalid CHATBOT_USAGE_NAMESPACE/)
console.log("chatbot-runtime: PASS")
```

- [ ] **Step 2: 테스트를 실행해 새 모듈이 없어 실패하는지 확인한다**

Run: `npx tsx scripts/runtime-test.mts`

Expected: `Cannot find module '../lib/chatbot/runtime'`

- [ ] **Step 3: 공통 runtime 값을 구현한다**

```ts
const NAME = /^[a-z0-9][a-z0-9:_-]{0,63}$/i

export function usageNamespace(): string {
  const value = process.env.CHATBOT_USAGE_NAMESPACE?.trim() || process.env.VERCEL_ENV || "development"
  if (!NAME.test(value)) throw new Error(`invalid CHATBOT_USAGE_NAMESPACE: ${value}`)
  return value
}

export function dayInSeoul(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
```

- [ ] **Step 4: 예산 감사 마이그레이션과 SQL 회귀검증을 먼저 작성한다**

마이그레이션은 다음 스키마를 사용한다.

```sql
create table chatbot_usage_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  day date not null,
  env text not null,
  session_hash text not null,
  operation text not null check (operation in ('embedding','generation','adjustment')),
  outcome text not null check (outcome in ('allowed','exhausted','adjusted')),
  delta integer not null,
  used_after integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index chatbot_usage_events_env_day_idx
  on chatbot_usage_events(env, day, created_at);
alter table chatbot_usage_events enable row level security;
revoke all on table chatbot_usage_events from public, anon, authenticated;
grant select on table chatbot_usage_events to service_role;
```

`consume_chatbot_budget_v2(p_day, p_env, p_limit, p_event_id, p_session_hash, p_operation)`는 `p_limit > 0`, namespace 정규식, operation의 `embedding|generation`을 먼저 검사하고 기존 원자적 upsert를 재사용한다. 같은 트랜잭션에서 `allowed` 또는 `exhausted` 이벤트 한 행을 기록한다. `adjust_chatbot_budget(p_day, p_env, p_new_value, p_reason)`만 수동 변경 경로로 허용하고 `p_new_value >= 0`, 비어 있지 않은 reason을 검사한 뒤 operation `adjustment`, outcome `adjusted` 이벤트를 남긴다. 두 함수 모두 public/anon/authenticated 권한을 revoke하고 service_role만 execute할 수 있게 한다.

`supabase/tests/chatbot_budget.sql`은 transaction 안에서 operation을 `embedding,generation,generation`으로 한도 2를 세 번 호출해 `true,true,false`, 이벤트 `allowed,allowed,exhausted`, 사용량 2를 assert한다. 이어 `adjust_chatbot_budget(..., 1, 'test adjustment')` 후 사용량 1과 operation `adjustment`의 `adjusted` 이벤트를 assert하고 rollback한다.

- [ ] **Step 5: 로컬 DB에 마이그레이션을 적용하고 SQL 테스트를 통과시킨다**

Run:

```bash
supabase migration up --local
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/chatbot_budget.sql
```

Expected: 모든 assertion 통과, rollback 후 `chatbot_usage_events`의 시험 namespace 0행

- [ ] **Step 6: 판별 가능한 BudgetResult를 구현한다**

```ts
export type BudgetResult =
  | { status: "allowed"; used: number; limit: number; namespace: string; day: string }
  | { status: "exhausted"; used: number; limit: number; namespace: string; day: string }
  | { status: "unavailable"; used: 0; limit: number; namespace: string; day: string }
```

`consumeDailyBudget(sessionId, operation)`은 `crypto.randomUUID()`를 event ID로, SHA-256의 앞 16자를 session hash로 전달한다. DB 설정 누락 또는 RPC 오류는 `unavailable`, `allowed=false`는 `exhausted`로 반환한다. generation뿐 아니라 Task 5의 query embedding도 실제 provider 호출 직전에 한 번씩 소비한다.

- [ ] **Step 7: route의 fallback 사유를 분리한다**

현재 generation 경로는 `consumeDailyBudget(sessionId, "generation")`의 `allowed`만 진행하고 `exhausted`는 `daily_limit`, `unavailable`은 `budget_unavailable`으로 응답·로그한다. 두 사유는 모두 일시 장애 문구를 사용하되 로그 사유는 합치지 않는다. Task 5에서 embedding operation을 같은 방식으로 추가한다.

- [ ] **Step 8: 로그와 예산이 같은 namespace를 사용하게 한다**

`lib/chatbot/log.ts`의 `env` 값을 `usageNamespace()`로 바꾼다. 로컬 사람 서버는 `development-human`, QA 서버는 `qa-local`, Preview는 `preview`, Production은 `production`을 사용한다.

`package.json`:

```json
{
  "scripts": {
    "dev:qa": "CHATBOT_USAGE_NAMESPACE=qa-local CHATBOT_DAILY_AI_LIMIT=1000 next dev --port 3113 --hostname 0.0.0.0",
    "test:runtime": "tsx scripts/runtime-test.mts",
    "test:budget": "psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/chatbot_budget.sql"
  }
}
```

- [ ] **Step 9: 검증한다**

Run:

```bash
npm run test:runtime
npm run test:budget
npm run test:chatbot
npx tsc --noEmit
```

Expected: runtime PASS, SQL assertion PASS, 라우팅 46/46 이상, TypeScript exit 0

- [ ] **Step 10: 커밋한다**

```bash
git add lib/chatbot/runtime.ts lib/chatbot/ratelimit.ts lib/chatbot/log.ts lib/chatbot/content.ts app/api/chatbot/ask/route.ts supabase/migrations/20260824170000_chatbot_budget_audit.sql supabase/tests/chatbot_budget.sql scripts/runtime-test.mts package.json CLAUDE.md
git commit -m "fix(chatbot): QA 예산 격리와 사용량 감사를 추가"
```

---

### Task 3: ChannelTalk 전체 상태·전체 페이지 재현 가능한 수집

**Files:**

- Create: `scripts/ct-export.mts`
- Create: `scripts/ct-export-test.mts`
- Create: `scripts/ct-volume.mts`
- Modify: `scripts/ct-replay.mts`
- Modify: `package.json`
- Modify: `docs/채널톡_대화이력_수령절차_20260823.md`

**Interfaces:**

- Produces: `paginate<T>(url: URL, field: string, fetcher: typeof fetch): Promise<T[]>`
- Produces ignored artifacts: `user-chats.json`, `messages.json`, `manifest.json`, `qa-pairs.json`
- `manifest.json`: `states`, 상태별 chat 수, 총 chat/message 수, cursor page 수, 최초·최종 시각
- API 기준: [List of UserChats](https://developers.channel.io/en/articles/List-of-UserChats-a7e8e5d1), [Get a UserChat's messages](https://developers.channel.io/en/articles/738ccde7)

- [ ] **Step 1: 가짜 2페이지 응답으로 pagination 실패 테스트를 작성한다**

`scripts/ct-export-test.mts`는 첫 응답 `{next:"p2", userChats:[{id:"1"}]}`, 두 번째 응답 `{next:null, userChats:[{id:"2"}]}`을 반환하는 fake fetch를 사용해 결과 ID가 `1,2`인지 assert한다. cursor가 반복되면 예외가 발생하는 경우도 assert한다.

- [ ] **Step 2: 테스트를 실행해 exporter가 없어 실패하는지 확인한다**

Run: `npx tsx scripts/ct-export-test.mts`

Expected: `Cannot find module './ct-export'`

- [ ] **Step 3: 전 상태 수집기를 구현한다**

`scripts/ct-export.mts`의 상태는 실제 계정에서 HTTP 200을 확인한 아래 네 값을 고정한다.

```ts
export const STATES = ["initial", "opened", "snoozed", "closed"] as const
const LIMIT = 500
```

`process.loadEnvFile(".env.tokens")`로 `CHANNELTALK_ACCESS_KEY/SECRET`을 읽고 둘 중 하나라도 비어 있으면 네트워크 요청 전에 종료한다. 상태별 `/open/v5/user-chats?sortOrder=asc&limit=500&state=...`를 `next → since`로 끝까지 순회한다. 중복 chat ID나 반복 cursor가 나오면 exit 1로 중단한다. 각 chat의 messages도 `sortOrder=asc&limit=500`으로 전 페이지를 수집한다.

```ts
const headers = {
  "x-access-key": process.env.CHANNELTALK_ACCESS_KEY ?? "",
  "x-access-secret": process.env.CHANNELTALK_ACCESS_SECRET ?? "",
}

export async function paginate<T>(url: URL, field: string, fetcher = fetch): Promise<T[]> {
  const rows: T[] = []
  const cursors = new Set<string>()
  for (;;) {
    const response = await fetcher(url, { headers })
    if (!response.ok) throw new Error(`${response.status} ${url.pathname}`)
    const body = await response.json() as Record<string, unknown>
    const page = body[field]
    if (!Array.isArray(page)) throw new Error(`missing array: ${field}`)
    rows.push(...page as T[])
    const next = typeof body.next === "string" && body.next ? body.next : null
    if (!next) return rows
    if (cursors.has(next)) throw new Error(`repeated cursor: ${next}`)
    cursors.add(next)
    url.searchParams.set("since", next)
  }
}
```

- [ ] **Step 4: 원본·manifest·마스킹 파생본을 분리한다**

- 원본 `user-chats.json`, `messages.json`은 현재 gitignore 경로에만 저장한다.
- `qa-pairs.json`을 만들 때 질문과 답변 모두 `maskPII()`를 적용한다.
- `manifest.json`에 네 상태를 모두 기록하고 하나라도 빠지면 exit 1이다.
- 기존 `ct-replay.mts`는 실행 전 manifest의 `states`가 정확히 네 값인지 확인한다.

- [ ] **Step 5: 실제 질문량 기반 한도를 계산한다**

`scripts/ct-volume.mts`는 마스킹된 이용자 자유질문을 KST 날짜별로 집계하고 다음 JSON을 출력한다.

```ts
type Volume = {
  days: number
  totalQuestions: number
  p95Daily: number
  p99Daily: number
  recommendedLimit: number
}
```

한 AI 질문의 최대 operation을 embedding 1 + generation 1 = 2로 보고, 2배 headroom을 적용해 `recommendedLimit = Math.max(100, Math.ceil(p99Daily * 4))`로 계산한다. FAQ/KB 직답은 실제로 0을 쓰므로 이 값은 보수적 상한이다. 운영 한도는 이 출력과 결제 예산 중 더 작은 값을 사용한다.

- [ ] **Step 6: 단위검증과 실제 read-only export를 실행한다**

Run:

```bash
npm run test:ct-export
npm run ct:export
npm run ct:volume -- --json
```

Expected: 네 상태가 manifest에 존재, cursor 반복 0, chat/message 합계가 파일 행 수와 일치

- [ ] **Step 7: 커밋한다**

```bash
git add scripts/ct-export.mts scripts/ct-export-test.mts scripts/ct-volume.mts scripts/ct-replay.mts package.json docs/채널톡_대화이력_수령절차_20260823.md
git commit -m "feat(chatbot): 채널톡 전체 이력 수집을 재현 가능하게 만든다"
```

---

### Task 4: 핵심 업무 결정적 답변과 일반 FAQ 가로채기 수정

**Files:**

- Create: `supabase/migrations/20260824180000_kb_short_answer.sql`
- Modify: `docs/chatbot-assets/kb_md/03_편의지원사업_어디서, 어떻게 신청하는지 절차 문의.md`
- Modify: `docs/chatbot-assets/kb_md/06_편의지원사업_지원 범위 (일반).md`
- Modify: `docs/chatbot-assets/kb_md/55_병원 일반_가정간호 서비스.md`
- Modify: `scripts/ingest-kb.mts`
- Modify: `lib/chatbot/kb.ts`
- Modify: `lib/chatbot/engine.ts`
- Modify: `scripts/chatbot-matrix.mts`
- Modify: `app/api/chatbot/ask/route.ts`

**Interfaces:**

- Database: `kb_documents.short_answer text null`
- `KbDoc.short_answer: string | null`
- Direct response: `best.doc.short_answer ?? best.doc.answer`

- [ ] **Step 1: 현재 결함을 회귀 테스트로 고정한다**

`scripts/chatbot-matrix.mts`에 다음 두 case를 추가한다.

```ts
{ input: "가정간호 서비스는 어떻게 신청하나요?", expect: "fallback", note: "일반 편의지원 FAQ 03 가로채기 금지" },
{ input: "가정간호 서비스 신청은 어떻게 하나요?", expect: "fallback", note: "표현 순서가 달라도 FAQ 03 가로채기 금지" },
```

Run: `npm run test:chatbot`

Expected: 최소 한 건이 실제 `faq_hit/faq-03`으로 FAIL

- [ ] **Step 2: FAQ와 KB의 위험한 부분포함 규칙을 한 곳씩 축소한다**

`lib/chatbot/engine.ts`와 `lib/chatbot/kb.ts` 모두 “예상질문이 사용자 입력에 포함되면 무조건 0.9/0.88” 규칙을 제거하고, 양쪽 문자열 길이 차이가 4자 이하일 때만 강한 부분일치로 인정한다.

```ts
const nearSame = Math.abs(norm.length - nq.length) <= 4
if (norm.length >= 4 && nearSame && (norm.includes(nq) || nq.includes(norm))) {
  score = Math.max(score, 0.9)
}
```

Run: `npm run test:chatbot && npm run kb:eval`

Expected: 새 가정간호 case는 fallback, 기존 매트릭스 전부 통과, KB Top-1은 현재 289/297보다 낮아지지 않음

- [ ] **Step 3: 짧은 답변 컬럼과 loader/ingest를 추가한다**

Migration:

```sql
alter table kb_documents add column if not exists short_answer text;
```

Markdown의 `## 짧은 답변` 섹션을 `scripts/ingest-kb.mts`에서 별도로 파싱해 upsert하고, `loadKb()` select와 `KbDoc` 타입에 포함한다.

- [ ] **Step 4: ChannelTalk 기준 핵심 문구를 KB 원본에 반영한다**

문서 03에는 해당 이동보조 질문 변형과 다음 정보를 모두 포함한 짧은 답변을 넣는다.

```md
## 짧은 답변

검사실·진료실 이동 보조는 가급적 진료 3일 전까지 신청해 주세요. 신청 시 환자 정보와 진료 예약일을 알려주셔야 합니다.

- 병원 방문: 이대목동병원 본관 1층 접수창구
- 온라인 신청서: https://walla.my/a/barrierfree_v
- 카카오톡 상담: https://pf.kakao.com/_LKhxkn/chat
- 전화: 02-2650-5586

최종 지원 내용은 담당 매니저와 상담 후 결정됩니다.
```

문서 03 예상 질문에는 critical 질문과 같은 `검사실·진료실 이동 보조를 받으려면 어떻게 해야하는가?`를 추가한다.

문서 06 예상 질문에는 `지원되는 교통 서비스는 무엇이 있는가?`를 추가하고 아래 짧은 답변을 넣는다.

```md
## 짧은 답변

편의지원 매니저가 병원 건물 내부에서 다음 이동·동행을 도와드려요.

- 검사실·진료실 이동과 보행 부축
- 휠체어·이동식 침대 이동 보조
- 길 찾기가 어려운 분을 위한 1:1 길 안내
- 진료 후 원내 약국까지 동행

집, 지하철역, 외부 약국 등 병원 밖 이동은 지원하지 않습니다.
```

문서 55 예상 질문에는 `가정간호 서비스는 어떻게 신청하나요?`, `가정간호 서비스 신청은 어떻게 하나요?`를 추가하고 아래 짧은 답변을 넣는다.

```md
## 짧은 답변

가정간호 서비스는 반드시 주치의의 처방이 있어야 신청할 수 있습니다. 외래 진료 시 또는 퇴원 전에 담당 의사와 먼저 상담해 주세요. 의사가 의뢰서를 작성하고 환자 또는 보호자가 동의서를 작성하면 가정간호 사업실 접수와 전문 간호사 상담을 거쳐 방문을 시작합니다.

문의: 가정간호 사업실 02-2650-5087
```

- [ ] **Step 5: 로컬 DB를 갱신하고 direct response를 짧은 답변으로 바꾼다**

Run:

```bash
supabase migration up --local
npm run kb:ingest
```

`app/api/chatbot/ask/route.ts`의 KB 직답 본문과 로그 본문을 모두 `best.doc.short_answer ?? best.doc.answer`로 통일한다.

- [ ] **Step 6: 격리 QA 서버에서 핵심답변을 검증한다**

Terminal A: `npm run dev:qa`

Terminal B: `npm run qa:critical`

Expected: 10/10 반복 응답 통과, `movement-application`과 두 가정간호 질문은 매회 `source=kb`, 누락 사실 0, 금지 사실 0

- [ ] **Step 7: 전체 정적 회귀를 실행한다**

Run:

```bash
npm run test:chatbot
npm run kb:eval
npx tsc --noEmit
```

Expected: 라우팅 전부 통과, FAQ 대표·유사질문 100%, KB Top-1 ≥ 289/297, Top-3 297/297

- [ ] **Step 8: 커밋한다**

```bash
git add supabase/migrations/20260824180000_kb_short_answer.sql docs/chatbot-assets/kb_md/03_* docs/chatbot-assets/kb_md/06_* docs/chatbot-assets/kb_md/55_* scripts/ingest-kb.mts lib/chatbot/kb.ts lib/chatbot/engine.ts scripts/chatbot-matrix.mts app/api/chatbot/ask/route.ts
git commit -m "fix(chatbot): 핵심 이동·가정간호 답변을 결정적으로 제공"
```

---

### Task 5: 변경분만 적재하는 최소 하이브리드 Top-K 검색

**Files:**

- Create: `supabase/migrations/20260824190000_kb_hybrid_retrieval.sql`
- Create: `lib/chatbot/retrieval.ts`
- Create: `tests/retrieval-set.json`
- Create: `scripts/retrieval-test.mts`
- Create: `scripts/retrieval-eval.mts`
- Modify: `lib/chatbot/model.ts`
- Modify: `scripts/ingest-kb.mts`
- Modify: `app/api/chatbot/ask/route.ts`
- Modify: `package.json`
- Modify: `CLAUDE.md`

**Interfaces:**

- Produces: `resolveEmbeddingModel(): EmbeddingModel | null`
- Produces: `providerErrorCode(error: unknown): string`
- Produces: `retrieveContext(question: string, sessionId: string, docs: KbDoc[]): Promise<RetrievedContext>`
- `RetrievedContext`: `{ status: "ok" | "budget_exhausted" | "budget_unavailable"; method: "hybrid" | "lexical"; chunks: RetrievedChunk[]; docIds: string[]; context: string; embeddingAttempts: number; embeddingErrorCode?: string }`
- Environment: `CHATBOT_EMBEDDING_MODEL=gemini-embedding-001`

- [ ] **Step 1: 현재 문자 검색 실패를 holdout으로 고정한다**

`tests/retrieval-set.json`에 최소 다음 질문과 기대 문서를 넣는다.

```json
[
  { "id": "transport-synonym", "q": "지원되는 교통 서비스는 무엇이 있는가?", "expectAny": [2, 6, 19, 23, 24, 25] },
  { "id": "home-nursing", "q": "집에서 간호사가 와주는 서비스 신청하고 싶어요", "expectAny": [55] },
  { "id": "walking", "q": "걷기가 힘든데 팔을 잡아줄 수 있나요?", "expectAny": [24] },
  { "id": "wayfinding", "q": "병원 길을 못 찾겠는데 계속 같이 다녀주나요?", "expectAny": [25] },
  { "id": "internal-pharmacy", "q": "진료 끝나고 병원 약국까지 같이 가주시나요?", "expectAny": [19, 32] },
  { "id": "communication", "q": "말로 설명을 이해하기 어려운데 그림으로 도와주나요?", "expectAny": [28] },
  { "id": "documents", "q": "보험사에 제출할 서류 작성을 도와주세요", "expectAny": [29, 31] },
  { "id": "wheelchair", "q": "주차장에서 휠체어로 진료실까지 데려다주세요", "expectAny": [23, 24] },
  { "id": "late", "q": "예약 시간보다 늦을 것 같아요", "expectAny": [33] },
  { "id": "toilet", "q": "장애인 화장실 위치가 어디예요?", "expectAny": [43] }
]
```

현재 `rankKb()`만으로 `transport-synonym`의 Top-3가 55/10/16으로 빗나가는지 기록한다.

- [ ] **Step 2: RRF와 문맥 상한 순수 실패 테스트를 작성한다**

`scripts/retrieval-test.mts`는 lexical 순위 `[55,19,6]`, semantic 순위 `[6,24,25]`를 입력해 RRF 결과 첫 문서가 6인지, 동일 문서 chunk가 중복 doc count를 부풀리지 않는지, 생성 context가 12,000자를 넘지 않는지 assert한다.

- [ ] **Step 3: pgvector 스키마를 추가한다**

```sql
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
```

`match_kb_chunks(p_embedding extensions.vector(768), p_limit integer default 12)`는 published 문서만 join하고 `1 - (embedding <=> p_embedding)` 내림차순으로 chunk ID, doc ID/key/seq, content, similarity를 반환한다. 함수는 service_role만 execute할 수 있게 한다.

- [ ] **Step 4: 기존 Google provider로 embedding 모델을 해석한다**

`lib/chatbot/model.ts`에 `GOOGLE_GENERATIVE_AI_API_KEY`와 `CHATBOT_EMBEDDING_MODEL`이 모두 있을 때 `google.embedding(modelId)`를 반환하는 `resolveEmbeddingModel()`을 추가한다. provider 예외의 `statusCode → code → Error.name`만 최대 64자로 반환하는 `providerErrorCode()`도 같은 파일에 두어 embedding과 generation이 재사용한다. 새 provider나 새 npm 패키지는 도입하지 않는다.

- [ ] **Step 5: KB를 section 단위로 chunk하고 변경분만 embed한다**

`scripts/ingest-kb.mts`에서 각 `answer`를 `##` heading 경계로 나누고 1,800자를 넘는 section만 문단 경계로 추가 분할한다. 입력은 `topic + questions + section`으로 만들고 SHA-256 `content_hash`가 DB와 다른 chunk만 `embedMany()` 한다.

```ts
const { embeddings } = await embedMany({
  model,
  values: changed.map((chunk) => chunk.embeddingInput),
  providerOptions: { google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" } },
})
```

embedding 생성과 changed chunk upsert가 모두 성공한 뒤에만 삭제된 chunk index의 DB 행을 제거한다. 중간 실패 시 기존 chunk를 보존한다. 변경이 없을 때 embedding 호출 수가 0인지 출력한다.

현재 `--prod`가 출력 문구만 바꾸고 실제 URL은 `.env.local`을 그대로 쓰는 문제도 함께 막는다. `--prod`인데 Supabase hostname이 `127.0.0.1/localhost`면 즉시 실패하고, 로컬 실행인데 원격 hostname이면 즉시 실패하도록 target guard를 추가한다.

- [ ] **Step 6: lexical+semantic RRF를 구현한다**

런타임 질문 embedding 직전에 `consumeDailyBudget(sessionId, "embedding")`을 호출한다. `exhausted/unavailable`이면 provider를 호출하지 않고 같은 상태를 route에 반환한다. 허용되면 `taskType: "RETRIEVAL_QUERY"`, 768차원으로 한 번만 만든다. provider의 embedding 자체가 실패하면 그 시도는 감사 이벤트에 남긴 채 lexical 결과로 계속한다. lexical 후보 content도 `short_answer ?? answer.slice(0, 1800)`으로 제한한다. RRF 상수는 60, 최종 최대 8 chunk, context 최대 12,000자로 고정한다. reranker는 추가하지 않는다.

```ts
type Candidate = { docId: number; docKey: string; seq: number; content: string }

export function rrf(lists: Candidate[][], limit = 8): Candidate[] {
  const merged = new Map<number, { score: number; item: Candidate }>()
  for (const list of lists) {
    const seen = new Set<number>()
    list.forEach((item, index) => {
      if (seen.has(item.docId)) return
      seen.add(item.docId)
      const previous = merged.get(item.docId)
      merged.set(item.docId, {
        item: previous?.item ?? item,
        score: (previous?.score ?? 0) + 1 / (60 + index + 1),
      })
    })
  }
  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item)
}

export function buildContext(items: Candidate[], maxChars = 12_000): string {
  let context = ""
  for (const item of items) {
    const next = `<문서 ${item.seq}>\n${item.content}\n\n`
    if (context.length + next.length > maxChars) break
    context += next
  }
  return context.trim()
}
```

- [ ] **Step 7: route의 전체 KB context를 Top-K context로 교체한다**

`docs.map(...).join(...)`을 제거하고 `retrieveContext(question, sessionId, docs).context`만 system prompt에 넣는다. retrieval status가 `budget_exhausted/budget_unavailable`이면 각각 `daily_limit/budget_unavailable`로 종료한다. 검색 결과가 0이면 LLM을 호출하지 않고 `fallback("unanswerable")`을 반환한다.

- [ ] **Step 8: 로컬 적재와 검색 평가를 실행한다**

Run:

```bash
supabase migration up --local
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run kb:ingest
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run retrieval:eval
npm run retrieval:test
npm run kb:eval
```

Expected: retrieval holdout 10/10 Top-3, `transport-synonym` 기대 문서 포함, context ≤ 12,000자, 기존 KB Top-1 ≥ 289/297, 두 번째 ingest embedding 호출 0

- [ ] **Step 9: 커밋한다**

```bash
git add supabase/migrations/20260824190000_kb_hybrid_retrieval.sql lib/chatbot/retrieval.ts lib/chatbot/model.ts scripts/ingest-kb.mts scripts/retrieval-test.mts scripts/retrieval-eval.mts tests/retrieval-set.json app/api/chatbot/ask/route.ts package.json CLAUDE.md
git commit -m "feat(chatbot): 하이브리드 Top-K RAG 검색을 도입"
```

---

### Task 6: generation 1회 호출·서버 근거·KB 후속 맥락

**Files:**

- Create: `supabase/migrations/20260824200000_chatbot_generation_metrics.sql`
- Modify: `app/api/chatbot/ask/route.ts`
- Modify: `lib/chatbot/log.ts`
- Modify: `lib/chatbot/types.ts`
- Modify: `components/chat/ChatWidget.tsx`
- Modify: `scripts/ct-replay.mts`
- Modify: `tests/chatbot-critical-answers.json`

**Interfaces:**

- Log additions: `request_id`, `retrieval_method`, `embedding_attempts`, `generation_attempts`, `model_attempts`, `embedding_error_code`, `provider_error_code`
- `MessageSource` adds `"kb"`
- API `usage`: `{used, limit, day, namespace}` in non-production
- API `diagnostics`: `{requestId, retrievalMethod, embeddingAttempts, generationAttempts, modelAttempts}` in non-production

- [ ] **Step 1: 한 질문이 embedding 1회·generation 1회만 쓰는 실패 검증을 추가한다**

`qa-critical` 결과에 세 attempt 값을 저장한다. AI 응답은 `embeddingAttempts=1`, `generationAttempts=1`, `modelAttempts=2`, KB/FAQ 응답은 모두 0인지 검사한다. 현재 route에는 이 진단값이 없어 이 검사가 실패해야 한다.

- [ ] **Step 2: 생성 로그 메타데이터 마이그레이션을 적용한다**

```sql
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
```

- [ ] **Step 3: 모델에게 출처 표기를 맡기는 재시도를 제거한다**

system prompt의 `[출처: 번호]` 의무, `extractSeqs`, no-citation retry, citation 정규식 제거를 삭제한다. 서버가 전달한 Top-K `docIds`를 근거로 응답·로그에 기록한다. 모델은 답변 본문만 한 번 생성한다.

로컬과 Preview 응답에는 `diagnostics`를 포함하고 Production에서는 `requestId`만 반환한다. `modelAttempts = embeddingAttempts + generationAttempts`로 계산하며 `qa-critical`은 이 등식을 함께 검증한다.

텍스트 생성 직전에 Task 2의 `consumeDailyBudget(sessionId, "generation")`을 실행한다. generation 소비 지점은 여기 하나뿐이며, embedding 소비는 Task 5 retrieval 내부 한 곳뿐이다. 정상 AI 질문은 감사 이벤트 `embedding,generation` 두 행과 `model_attempts=2`가 대응한다.

- [ ] **Step 4: 거절·오류·빈 답변을 명시적으로 유지한다**

- `UNANSWERABLE` 또는 거절 문장: `unanswerable` 또는 `model_refused`
- provider 예외: `model_error`
- 예산 소진: `daily_limit`
- DB/RPC 오류: `budget_unavailable`
- 검색 결과 없음: 모델 미호출 `unanswerable`

각 경로는 `request_id`, `retrieval_method`, 세 attempt count를 로그에 남긴다. embedding provider 실패 후 lexical로 복구한 경우 `embedding_error_code`, generation provider 실패는 `provider_error_code`에 기록한다.

provider 예외는 원문 message 전체를 DB에 저장하지 않고 Task 5의 `providerErrorCode()`를 재사용해 `statusCode`, `code`, 마지막으로 `Error.name` 순서의 최대 64자만 남긴다. 이렇게 해야 실제 `quota/rate-limit/auth`와 일반 생성 오류를 구분하면서 응답 본문이나 키가 로그로 새지 않는다.

```ts
function providerErrorCode(error: unknown): string {
  const value = error as { statusCode?: unknown; code?: unknown; name?: unknown }
  return String(value?.statusCode ?? value?.code ?? value?.name ?? "unknown").slice(0, 64)
}
```

- [ ] **Step 5: KB 답변도 대화 맥락에 포함한다**

`MessageSource`에 `kb`를 추가하고 ChatWidget의 API source mapping을 `kb → kb`로 바꾼다. history filter는 `ai|faq|kb`를 포함한다. `ct-replay.mts`도 같은 조건으로 맞춘다.

- [ ] **Step 6: 검증한다**

Run:

```bash
npm run test:chatbot
npm run qa:critical
npm run ct:replay
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select request_id from chatbot_logs where request_id is not null and (generation_attempts > 1 or embedding_attempts > 1 or model_attempts <> embedding_attempts + generation_attempts);"
```

Expected: critical 전부 통과, replay의 `model_refused/model_error`가 이전 기준보다 증가하지 않음, SQL 0행, 정상 AI 질문당 allowed usage event 2행(`embedding`,`generation`)

- [ ] **Step 7: 커밋한다**

```bash
git add supabase/migrations/20260824200000_chatbot_generation_metrics.sql app/api/chatbot/ask/route.ts lib/chatbot/log.ts lib/chatbot/types.ts components/chat/ChatWidget.tsx scripts/ct-replay.mts tests/chatbot-critical-answers.json
git commit -m "fix(chatbot): 한 요청을 한 모델 호출과 추적 가능한 근거로 제한"
```

---

### Task 7: Offline·Canary·Full QA를 분리하고 stale 결과를 차단

**Files:**

- Create: `app/api/chatbot/health/route.ts`
- Create: `scripts/qa-result-check.mts`
- Modify: `scripts/qa-run.mts`
- Modify: `scripts/qa-critical.mts`
- Modify: `tests/qa-set.json`
- Delete: `tests/qa-result.json`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**

- Protected health response: `{ok, namespace, day, used, limit, remaining, kbCount, modelConfigured, embeddingConfigured}`
- QA result root: `{meta, results}`; `meta` includes `commit`, `setSha256`, `namespace`, `questionCount`, `resultCount`, `startedAt`, `finishedAt`

- [ ] **Step 1: stale 결과 검증 실패 테스트를 작성한다**

`scripts/qa-result-check.mts`는 현재 `tests/qa-set.json` SHA-256, 전체 문항 수, result meta의 hash/count, 실제 results 길이, 실패 건수를 비교한다. 첫 실행만 기존 `tests/qa-result.json`을 읽게 해 현재 82문항 set과 80행 result 불일치가 exit 1인지 확인한다.

Run: `npx tsx scripts/qa-result-check.mts`

Expected: `questionCount/resultCount mismatch`, exit 1

- [ ] **Step 2: 인증된 preflight endpoint를 추가한다**

`app/api/chatbot/health/route.ts`는 기존 cron route와 동일하게 `Authorization: Bearer ${CRON_SECRET}`를 요구한다. 무설정 503, 불일치 401이다. 성공 시 current namespace/day usage, 한도, 남은 수, published KB count, model/embedding 설정 여부만 반환하고 secret 값은 반환하지 않는다.

- [ ] **Step 3: full QA가 실행 전에 예산·namespace를 검증하게 한다**

`scripts/qa-run.mts`는 `QA_EXPECT_NAMESPACE` 기본 `qa-local`, `QA_BASE` 기본 `http://localhost:3113`을 사용한다. health 응답 namespace가 다르거나 최악의 embedding+generation을 고려해 `remaining < questionCount * 2`이면 질문을 하나도 호출하지 않고 exit 1로 종료한다.

`VERCEL_AUTOMATION_BYPASS_SECRET`이 있으면 health와 ask 요청 모두에 `x-vercel-protection-bypass` 헤더를 추가한다. 값은 결과나 console에 출력하지 않는다.

`qa-critical`도 동일 preflight를 사용하고 `remaining < sum(repeat) * 2`면 실행하지 않는다.

- [ ] **Step 4: 문서 인용과 답변 계약을 함께 채점한다**

`tests/qa-set.json`의 각 문항에 안정 ID를 넣고, Task 1 계약이 있는 ID는 `evaluateAnswer()`까지 통과해야 합격이다. 일반 문항은 기대 문서/FAQ 검증을 유지한다. 결과 answer는 100자로 자르지 않고 서버 응답 전체를 저장한다.

자동 `model_error` 재시도를 제거하고 각 실패를 그대로 결과에 남긴다. 재실행은 새 result run으로만 허용한다.

- [ ] **Step 5: 결과 메타데이터와 현재성 검증을 구현한다**

```ts
type QaMeta = {
  commit: string
  setSha256: string
  namespace: string
  questionCount: number
  resultCount: number
  startedAt: string
  finishedAt: string
}
```

새 결과는 gitignored 경로 `docs/chatbot-assets/channeltalk-export/qa-result.json`에 저장한다. `qa-result-check`는 이 파일의 `meta.commit === git rev-parse HEAD`, set hash 일치, count 일치, 실패 0을 모두 요구한다. 기존 tracked `tests/qa-result.json`은 삭제해 오래된 실행이 현재 승인자료처럼 보이지 않게 한다.

- [ ] **Step 6: QA 명령을 비용 단계별로 분리한다**

```json
{
  "scripts": {
    "qa:offline": "npm run test:answer-contract && npm run test:runtime && npm run test:budget && npm run test:chatbot && npm run kb:eval && npm run retrieval:test",
    "qa:critical": "tsx scripts/qa-critical.mts",
    "qa:full": "tsx scripts/qa-run.mts",
    "qa:result": "tsx scripts/qa-result-check.mts"
  }
}
```

- [ ] **Step 7: 격리 서버에서 순서대로 실행한다**

Run:

```bash
npm run qa:offline
npm run qa:critical
npm run qa:full
npm run qa:result
```

Expected: offline 전부 exit 0, critical 필수 사실 100%, full 82/82 이상 현재 set 전부 통과, result hash/count/commit 일치

- [ ] **Step 8: 커밋한다**

```bash
git add app/api/chatbot/health/route.ts scripts/qa-run.mts scripts/qa-critical.mts scripts/qa-result-check.mts tests/qa-set.json .gitignore package.json
git rm tests/qa-result.json
git commit -m "test(chatbot): 실제 답변과 현재성을 출시 게이트로 검증"
```

---

### Task 8: 관측 보고·빌드 게이트·운영 절차

**Files:**

- Create: `scripts/chatbot-report.mts`
- Create: `docs/chatbot-operations-runbook.md`
- Modify: `next.config.mjs`
- Modify: `package.json`
- Modify: `CLAUDE.md`

**Interfaces:**

- Produces: `npm run chatbot:report -- --day YYYY-MM-DD --namespace qa-local`
- Runbook defines environment matrix, incident diagnosis, adjustment, QA, deployment, rollback commands.

- [ ] **Step 1: 일일 진단 보고 스크립트를 작성한다**

보고 항목은 아래 값으로 고정한다.

- usage: used/limit/remaining
- source·fallback_reason별 건수
- `daily_limit`, `budget_unavailable`, `model_error`, `model_refused` 각각의 최초·최종 시각
- `model_error`의 `provider_error_code`별 건수
- AI latency 평균/P95/max
- tokens_in/out/cached 합계와 cache 비율
- retrieval_method별 건수
- model_attempts 합계와 usage event allowed 합계의 차이
- session prefix별 소비량 상위 10개

둘의 차이가 0이 아니면 보고 명령은 exit 1로 끝난다.

P95는 null latency를 제외하고 오름차순 정렬한 뒤 아래 식으로 계산한다.

```ts
const p95 = sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null
```

- [ ] **Step 2: 운영 runbook을 작성한다**

환경 표는 다음 namespace를 사용한다.

| 환경 | namespace | full live QA |
|---|---|---|
| 사람 로컬 3112 | `development-human` | 금지 |
| QA 로컬 3113 | `qa-local` | 허용 |
| Vercel Preview | `preview` | critical canary만 |
| Production | `production` | synthetic 1건만 |

Runbook에는 `daily_limit` 확인, `budget_unavailable` DB 점검, `model_error` provider 점검, `adjust_chatbot_budget` 사용법, 직접 `update chatbot_usage` 금지, Vercel env 변경 후 redeploy, feature flag rollback을 정확한 명령으로 기록한다.

- [ ] **Step 3: TypeScript 오류 무시를 제거한다**

`next.config.mjs`에서 아래 블록을 삭제한다.

```js
typescript: {
  ignoreBuildErrors: true,
},
```

- [ ] **Step 4: 전체 빌드 게이트를 실행한다**

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run qa:offline
npm run chatbot:report -- --day 2026-08-24 --namespace qa-local
```

Expected: 모든 명령 exit 0, TypeScript 오류 0, model attempt/event 차이 0

- [ ] **Step 5: Preflight에서 폐기한 PAT가 다시 저장되지 않았는지 검사한다**

다음 명령이 모두 출력 0건인지 확인한다.

```bash
git ls-files .claude/settings.local.json
git log --all -G'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}' --oneline -- .
rg -l 'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}' --hidden --glob '!.git/**' --glob '!.env*' .
```

- [ ] **Step 6: 커밋한다**

```bash
git add scripts/chatbot-report.mts docs/chatbot-operations-runbook.md next.config.mjs package.json CLAUDE.md
git commit -m "chore(chatbot): 운영 진단과 빌드 게이트를 고정"
```

---

### Task 9: Preview 검증·승인·단계적 전환

**Files:**

- Modify: `tests/chatbot-browser-qa.md`
- Modify: `docs/채널톡_실대화_비교결과_20260824.md`
- Modify: `docs/chatbot-operations-runbook.md`

**Interfaces:**

- Consumes: Tasks 1~8의 모든 검증 명령과 결과
- Produces: 정확한 Preview URL/commit, 브라우저·접근성 결과, 병원 문구 승인, P0/P1 0건, rollback 기록

- [ ] **Step 1: hosted Supabase에 마이그레이션과 KB를 적용한다**

Run:

```bash
supabase db push --linked
vercel env run -e preview --git-branch feat/chatbot -- npm run kb:ingest -- --prod
supabase migration list --linked
```

Expected: local/remote migration 버전 일치, published KB 문서 수 59, `short_answer` 핵심 3건 존재, chunk 수와 embedding null 0건

- [ ] **Step 2: Preview 환경변수와 보호 설정을 갱신한다**

Task 3의 계산값을 검증한 뒤 branch-specific Preview 변수로 등록한다.

```bash
recommended_limit="$(npm run -s ct:volume -- --json | jq -er '.recommendedLimit | select(type == "number" and . >= 100)')"
vercel env add CHATBOT_USAGE_NAMESPACE preview feat/chatbot --force --no-sensitive --value preview --yes
vercel env add CHATBOT_EMBEDDING_MODEL preview feat/chatbot --force --no-sensitive --value gemini-embedding-001 --yes
vercel env add CHATBOT_DAILY_AI_LIMIT preview feat/chatbot --force --no-sensitive --value "$recommended_limit" --yes
vercel env add NEXT_PUBLIC_CHATBOT_ENABLED preview feat/chatbot --force --no-sensitive --value true --yes
vercel deploy --yes
```

배포 후 `vercel inspect https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app`에서 새 commit과 Deployment Protection을 확인한다. 한도는 수기로 500 또는 2,000을 입력하지 않는다.

- [ ] **Step 3: Preview preflight와 critical canary만 실행한다**

Run:

```bash
QA_BASE=https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app QA_EXPECT_NAMESPACE=preview npm run qa:critical
```

Expected: 응답 `usage.limit`이 Vercel 설정값과 일치, 최근 2회처럼 `model_refused`가 섞이지 않고 모든 반복 통과, Preview 예산 증분이 실제 모델 시도 수와 일치

- [ ] **Step 4: ChannelTalk 전체 재생을 QA 로컬 namespace에서 실행한다**

Run:

```bash
npm run ct:export
QA_BASE=http://localhost:3113 npm run ct:replay
```

비교 기준:

- 전체 상태 chat 수와 manifest 일치
- 자체 fallback이면서 ChannelTalk이 핵심 사실을 답한 사례 0건
- 자체 답변의 전화번호·URL·지원 범위 오류 0건
- content contract 누락 0건
- 한 질문 15초 초과 0건

- [ ] **Step 5: 브라우저·기기·접근성 검수를 기록한다**

`tests/chatbot-browser-qa.md`에 새 Preview URL과 정확한 commit을 기록하고 Chrome/Edge/Firefox/Safari, iOS/Android, 키보드, NVDA/VoiceOver/TalkBack에서 다음을 확인한다.

- 이동보조 신청 답변의 링크 2개와 전화 동작
- 가정간호 질문이 편의지원 일반 신청으로 가지 않음
- timeout, `daily_limit`, `budget_unavailable`, `model_error` 문구 구분
- 스크린리더 focus 이동과 버튼 label
- 자체 챗봇과 ChannelTalk 동시 노출 0회

- [ ] **Step 6: 병원 승인과 출시 판정을 기록한다**

병원 담당자가 이동지원 범위, 신청 수단, “최종 지원 내용은 담당 매니저와 상담 후 결정” 문구, 가정간호 안내를 승인한 이름·시각을 기록한다. P0/P1이 하나라도 있거나 승인자가 비어 있으면 Production 전환을 중단한다.

- [ ] **Step 7: Production 한도와 namespace를 설정하되 feature flag는 아직 끈다**

```bash
recommended_limit="$(npm run -s ct:volume -- --json | jq -er '.recommendedLimit | select(type == "number" and . >= 100)')"
vercel env add CHATBOT_USAGE_NAMESPACE production --force --no-sensitive --value production --yes
vercel env add CHATBOT_EMBEDDING_MODEL production --force --no-sensitive --value gemini-embedding-001 --yes
vercel env add CHATBOT_DAILY_AI_LIMIT production --force --no-sensitive --value "$recommended_limit" --yes
vercel env add NEXT_PUBLIC_CHATBOT_ENABLED production --force --no-sensitive --value false --yes
vercel deploy --prod --yes
```

새 Production 배포에서 `/api/chatbot/health` 인증 확인과 synthetic 질문 1건만 실행한다. 정상이어도 ChannelTalk은 유지한다.

- [ ] **Step 8: 최종 승인 후 자체 챗봇을 켜고 24시간 관찰한다**

```bash
vercel env add NEXT_PUBLIC_CHATBOT_ENABLED production --force --no-sensitive --value true --yes
vercel deploy --prod --yes
```

기존 layout 조건에 의해 ChannelTalk script는 로드되지 않고 자체 위젯만 표시된다. 최초 24시간 동안 1시간 간격으로 `chatbot:report`를 확인한다.

Rollback 조건은 하나라도 충족하면 즉시 `NEXT_PUBLIC_CHATBOT_ENABLED=false`로 재배포한다.

```bash
vercel env add NEXT_PUBLIC_CHATBOT_ENABLED production --force --no-sensitive --value false --yes
vercel deploy --prod --yes
```

- 핵심답변 contract 실패 1건
- `budget_unavailable` 1건
- `daily_limit` 잔여 20% 이전 발생
- P95 latency 5초 초과
- 잘못된 전화번호·URL·지원범위 1건

- [ ] **Step 9: 최종 증빙 문서를 커밋하고 푸시한다**

```bash
git add tests/chatbot-browser-qa.md docs/채널톡_실대화_비교결과_20260824.md docs/chatbot-operations-runbook.md
git commit -m "docs(chatbot): Preview 승인과 전환 증빙 기록"
git push origin feat/chatbot
```

---

## Final Definition of Done

- [ ] `qa-*`, `ct_replay_*`, 사람 브라우저가 같은 usage namespace를 공유하지 않는다.
- [ ] KST 00:00에 날짜가 바뀌고 09:00에 바뀌지 않는다.
- [ ] 예산 허용·거절·수동 조정이 모두 감사 이벤트로 남고 모델 시도 합계와 일치한다.
- [ ] `daily_limit`, `budget_unavailable`, `model_error`, `model_refused`, `unanswerable`을 로그에서 구분할 수 있다.
- [ ] provider quota/auth/rate-limit 오류는 `provider_error_code`로 구분되고 원문 오류·키는 DB에 저장되지 않는다.
- [ ] 이동 서비스와 이동보조 신청 질문 반복 3회가 모두 필수 사실 100%다.
- [ ] 가정간호 두 표현이 모두 주치의 처방과 전용 문의처를 답하고 편의지원 Walla 링크를 내보내지 않는다.
- [ ] 전체 KB 프롬프트가 제거되고 Top-K context가 12,000자 이하이다.
- [ ] 검색 holdout Top-3 10/10, 기존 KB Top-1 ≥ 289/297, Top-3 297/297이다.
- [ ] AI 요청당 embedding 최대 1회·generation 정확히 1회이고 KB/FAQ 요청은 둘 다 0회다.
- [ ] QA result의 commit/hash/questionCount/resultCount가 현재 set과 일치한다.
- [ ] ChannelTalk 네 상태와 모든 cursor page가 manifest에 포함된다.
- [ ] lint, TypeScript, build, offline QA, critical QA, full QA가 모두 exit 0이다.
- [ ] Preview 실제 브라우저·기기·접근성·오류 상태 검수와 병원 문구 승인이 기록된다.
- [ ] Production 전환 전 rollback 절차가 검증되고 ChannelTalk 복귀가 feature flag 한 번으로 가능하다.

## Deliberately Skipped

- 별도 reranker: 10개 holdout과 전체 재생에서 Top-K 실패가 확인될 때만 추가한다.
- 관리자용 분석 대시보드: 우선 `chatbot-report`와 보호된 health endpoint로 운영하며 반복 수동 조회가 병목일 때 만든다.
- 새 벡터 DB나 검색 SaaS: 59문서 규모에서는 Supabase pgvector면 충분하다.
- 모델 자동 failover: 먼저 오류를 정확히 분류·관측하고 실제 provider 장애 빈도가 운영 기준을 넘을 때 추가한다.
