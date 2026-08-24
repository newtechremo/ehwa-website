# 출시 실행 계획 검증 및 수정안 (2026-08-23)

- 대상: `docs/superpowers/plans/2026-08-23-channeltalk-replacement-release.md` (Codex 작성)
- 방법: 계획의 사실 주장을 코드·로컬 DB·Vercel 설정에서 직접 재현해 확인했다. 확인하지 못한 항목은 그렇게 적었다.
- 결론: **계획의 골격은 타당하고 채택한다.** 다만 (1) 운영 인증 배포가 빠져 있고, (2) 회귀 기준이 현재 수준보다 낮게 잡혀 있으며, (3) 공개 로그 API의 남용 경로가 빠져 있다. 아래 수정안을 반영해 진행한다.

## 1. 주장 검증 결과

| # | 계획의 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | `qa-run.mts`가 `source=faq`면 무조건 통과시킨다 | **사실** | `scripts/qa-run.mts:52` `else if (d.source === "faq") { pass = true; note = "FAQ 응답 — 내용 확인 필요" }` |
| 2 | "제가 늦으면 어떻게 되나요?" → 노쇼 FAQ 35 오분류 | **사실** | `routeFreeText` 재현: `faq_hit faq-35`, 답변 "갑자기 못 오시게 되면 꼭! 취소 연락을…". KB 33(지각)이 정답 |
| 3 | "진단서 발급받으려면 어디로 가요?" → 센터 위치 FAQ 오분류 | **사실** | 재현: `faq_hit faq-location`, 답변이 센터 주소. KB 54(진단서)가 정답. 정책 과잉차단을 풀었더니 수기 FAQ가 가로챘다 |
| 4 | `MANUAL_FAQS` 8건이 원본과 겹친다 | **대체로 사실** | 7/8 겹침. `faq-hours`만 원본 FAQ에 없으나 KB 13(운영시간)이 서버에서 답한다 |
| 5 | `consumeDailyBudget`가 읽기 후 upsert라 경쟁 조건이 있다 | **사실** | `lib/chatbot/ratelimit.ts:59-72` select → upsert 두 단계 |
| 6 | ESLint 의존성·Flat Config 부재 | **사실** | `node_modules/.bin/eslint` 없음, `eslint.config.*` 없음. `eslint-config-next@16.0.7` 존재 확인 |
| 7 | ChatWidget의 `/api/chatbot/ask` fetch에 타임아웃 없음 | **사실** | `signal` 미지정 |
| 8 | `.gitignore`에 export·영상 제외 규칙 없음 | **사실** | grep 결과 없음 |
| 9 | Vercel Preview에 Supabase·챗봇 변수 없음 | **사실** | `vercel env ls`: Supabase 3종은 Development/Production만, `CHATBOT_*`·`GOOGLE_*` 전무 |
| 10 | Production에 관리자 인증 변수 3종 존재 | **사실** | `ADMIN_USERNAME/PASSWORD_HASH/SESSION_SECRET` Production·Preview 모두 3일 전 등록 |
| 11 | `20260823000000` 마이그레이션이 로컬·운영 migration list에 없음 | **사실(추적 기준)** | 로컬은 psql 직접 적용이라 컬럼은 있으나 `schema_migrations` 최신이 `20260820300000`. 운영은 미적용 |
| 12 | 로컬 DB `kb_documents=0`, 재적재 필요 | **거짓** | 로컬 `kb_documents=59`. Codex가 로컬 DB에 접속하지 못한 것으로 보인다. 다만 Task 2의 `db reset` 뒤에는 재적재가 필요하므로 순서상 무해 |
| 13 | 운영 DB `kb_documents=59`, `chatbot_logs=0` | **미확인** | Management API 403, pooler 접속 실패. Codex 측 확인값으로 둔다 |
| 14 | 채널톡 동작 영상이 로컬에 없음 | **사실** | `find -iname "*.mp4"` 결과 없음. Slack 재수령 필요 |
| 15 | 결정적 회귀 35/35, 51/51, 147/147 | **사실** | 2026-08-23 재실행 동일 |

### 이전 보고의 정정

이전 보고에서 "FAQ가 응답한 11건은 내용 확인 완료"라고 했으나 **확인된 바 없었다.** 채점기는 해당 항목을 "내용 확인 필요"로 표시한 채 통과시키고 있었고, 그중 최소 2건(#2, #3)은 이용자에게 틀린 안내가 나간다. 따라서 76/77·99%는 승인 수치가 아니다.

## 2. 계획에서 빠졌거나 고쳐야 할 것

### G1. 운영 관리자 인증 배포가 계획에 없다 (P0)

계획은 "관리자 보안: 선행조건 완료"로 표시하지만, 인증 코드는 `feat/chatbot`에만 있고 **운영(main)은 지금도 무인증으로 게시글 생성·삭제가 가능하다.** 계획대로면 챗봇 출시(Task 6, 수 주 뒤)까지 열려 있다.

- `hotfix/admin-auth` 브랜치(main + 인증 커밋 1개, 챗봇 파일 0개)를 이미 만들어 로컬 검증했다: 무인증 쓰기 401, 위조 쿠키 401, 정상 로그인 200, 인증 후 쓰기 200, 공개 읽기 200.
- Production·Preview에 `ADMIN_*` 3종이 이미 있으므로 환경변수 작업 없이 배포 가능하다.
- **부작용:** hotfix를 main에 먼저 올리면 Task 6의 `git merge --ff-only feat/chatbot`이 실패한다. `feat/chatbot`을 main 위로 rebase해야 한다(동일 패치는 rebase가 자동 건너뜀).

### G2. `/api/chatbot/log`에 rate limit이 없다

무인증 공개 POST이며 호출마다 `chatbot_logs`에 1행을 쓴다. 스크립트로 무한 적재가 가능하다. `ask`와 같은 `checkRateLimit(clientKey)`를 적용하고, 클라이언트가 `ai_answer`를 보내면 거부한다(서버만 기록하는 종류).

### G3. 회귀 통과 기준이 현재 수준보다 낮다

Task 1 Step 5의 "FAQ Top-1 85% 이상"은 현재 100%(51/51, 147/147)보다 낮다. FAQ_NOISE 정규화는 과거 불용어 사고와 같은 유형의 위험이 있으므로 **현재 기준선에서 한 건도 떨어지지 않아야 통과**로 바꾼다. 떨어지는 건이 있으면 그 문항을 근거와 함께 기록하고 개별 승인한다.

### G4. "KB/FAQ 57/57" 게이트는 그대로 두면 노이즈를 쫓게 된다

최근 3회 실행에서 탈락 항목이 매번 달랐고(2~3건), 모두 "내용은 맞고 인용 문서만 다름"이었다. 계획은 "한 건이라도 다른 문서를 인용하면 회귀 케이스 추가"라고 하는데, 이 상태에서는 끝이 없다. 게이트를 두 층으로 나눈다.

- **내용 오류 0건**: 인용 문서의 원문과 답변을 대조해 사실이 다르면 실패. 이것이 출시 차단 기준이다.
- **인용 불일치**: `temperature: 0`으로 낮춰 결정성을 먼저 확보하고, 그래도 남는 불일치는 원문 대조로 "정당한 복수 정답"인지 판정해 `why`와 함께 라벨을 정정한다. 점수 목적의 라벨 확장은 금지.

### G5. keepalive도 `CRON_SECRET`이 선택적이다

Task 2 Step 4는 purge-logs만 고친다. keepalive는 읽기 전용 카운트라 피해는 없지만 같은 패턴이므로 함께 고친다(일관성). Preview에서 purge 수동 검증(Task 4 Step 5)을 하려면 Preview에도 `CRON_SECRET`을 넣어야 한다.

### G6. Preview가 운영 Supabase를 쓴다

Free 플랜 2프로젝트 한도 때문에 env 컬럼으로 분리하기로 한 기존 결정이다. 계획은 이를 전제하지만 명시하지 않는다. 다음을 조건으로 한다.

- Vercel Deployment Protection **ON 유지** + QA는 Bypass 토큰으로. Preview URL이 공개되면 누구나 운영 DB에 로그를 쓰고 AI 예산을 소모한다.
- `chatbot_usage`·`chatbot_logs`는 env로 분리됨을 재확인했다(`20260820300000_usage_pk.sql`, `log.ts`의 `env`).
- `posts` 등 CMS 테이블은 env 분리가 없다. Preview에서 게시글 쓰기 검증은 **하지 않는다**(이전에 운영 DB 오염 사고 있음).

### G7. 영상·이력은 외부 수령 의존

- 채널톡 동작 영상: 로컬에 없다. Slack MCP가 현재 끊겨 있어 사용자 수령 또는 재연결 필요.
- 채널톡 대화 이력: `docs/채널톡_대화이력_수령절차_20260823.md` 대로 사용자 수령 필요.
- 둘 다 Task 5의 입력이므로 Task 1~4와 병행해 준비한다.

### G8. Codex 문서 변경이 미커밋 상태

`CLAUDE.md`, `docs/chatbot-assets/README.md`, `챗봇_PhaseA_*.md`, `챗봇_자체구축_통합구현플랜_*.md` 수정과 새 계획 파일이 작업트리에만 있다. 내용은 검토 결과 정확하다(단, "로컬 kb_documents=0"은 틀림). Task 1 시작 전에 문서 커밋으로 분리한다.

## 3. 수정된 실행 순서

| 순서 | 작업 | 원 계획 | 변경 |
|---|---|---|---|
| **0** | **운영 관리자 인증 배포** (`hotfix/admin-auth` → Preview 스모크 → main) | 없음 | **신규, P0.** 사용자 승인 후 즉시 |
| 0' | `feat/chatbot`을 main 위로 rebase, Codex 문서 커밋 | 없음 | 신규 |
| 1 | FAQ 오분류 + 채점기 수정 | Task 1 | 통과 기준을 "현재 기준선 무손실"로. `temperature: 0` 실험. 게이트를 내용오류/인용불일치 2층으로 |
| 2 | 안전장치 (원자적 예산·15초 타임아웃·CRON_SECRET 필수·gitignore) | Task 2 | `/api/chatbot/log` rate limit 추가. keepalive도 SECRET 필수 |
| 3 | 기준선 (db reset → kb:ingest → kb:eval → ESLint 복구 → 4종 정적검사) | Task 3 | 로컬 KB는 현재 59건이나 reset 뒤 재적재 필요 — 순서 유지 |
| 4 | 운영 DB 마이그레이션 선적용 → Preview 환경변수 → push → Preview 검증 | Task 4 | Deployment Protection ON 확인. Preview에 `CRON_SECRET` 추가. CMS 쓰기 검증 제외 |
| 5 | 채널톡 이력 기반 비교 · 브라우저/기기 매트릭스 · 접근성 · 병원 승인 · 처리방침 | Task 5 | 영상·이력은 사용자 수령 (1~4와 병행) |
| 6 | Production 전환 → 관찰 → 채널톡 종료 | Task 6 | rebase 완료 후 ff 가능. 롤백은 flag off + redeploy |

### 각 단계의 완료 기준(요약)

- **0**: 운영에서 무인증 `POST /api/posts` 401, 관리자 로그인 후 쓰기 200, `GET /` 200. 사용자가 실제 비밀번호로 로그인 확인.
- **1**: `npm run test:chatbot` 35/35·51/51·147/147 유지 + 신규 음성 케이스 통과. `npm run qa`에서 **내용 오류 0건**, 인용 불일치는 전건 원문 대조 기록.
- **2**: `consume_chatbot_budget` 3연속 호출 `true,true,false`. 15초 초과·500·잘못된 JSON 모두 로컬 fallback. purge/keepalive 무SECRET 503, 무인증 401, `/api/chatbot/log` 9회 연속 → 429.
- **3**: `test:chatbot`·`lint`·`tsc --noEmit`·`build` 모두 exit 0. `kb:eval` Top-1 ≥ 85%.
- **4**: `supabase migration list --linked` 양쪽 `20260823000000`. Preview 로그 `env=preview`만 증가. 질문 1건 = 로그 1행.
- **5**: `tests/chatbot-browser-qa.md` 전 셀 판정·증빙, P0/P1 0건, 승인자·일시 기록, 처리방침 반영 확인.
- **6**: 운영 smoke 7항목 통과, 1~2주 일일 지표 확인 뒤 채널톡 해지.

## 4. 지금 바로 필요한 결정

1. **Task 0 승인** — `hotfix/admin-auth`를 main에 올릴지. 운영은 지금 무인증이다.
2. 채널톡 **대화 이력 수령** (데스크 다운로드 또는 API 키).
3. 채널톡 **동작 영상** 재수령 (Slack `#3-신기술개발팀` 2026-08-14 스레드).

## 5. 진행 현황 (2026-08-24 01:30 KST)

| 순서 | 상태 | 커밋 | 비고 |
|---|---|---|---|
| 0 운영 인증 배포 | **보류(사용자 결정)** | `hotfix/admin-auth` = `2939d13` (origin 푸시됨) | Preview `ehwa-website-l4hnu3lmg` 에서 무인증 쓰기 4종 401·위조쿠키 401·보호 302 확인. `GET /api/posts` 500 은 Preview 에 Supabase 변수가 없어서(Task 4 범위) |
| 0' 문서 커밋 | 완료 | `167c693` | 계획 문서의 "로컬 kb_documents=0" 정정 |
| 1 FAQ 오분류·채점기 | 완료 | `692b99d` | 매트릭스 39/39, 골든셋 43/43·126/126 유지. 엄격 채점 77/77(1회). 출처 누락 재시도 추가 |
| 2 안전장치 | 완료 | `9e208ae` | 계획안 SQL 버그(2행 반환) 수정. `/log` 30회/분, cron SECRET 필수, 15초 타임아웃 |
| 3 기준선·ESLint | 완료 | `33666d5` | lint 0 errors, tsc/build/test 모두 exit 0. kb:eval Top-1 97% |
| 4 Preview | **완료(AI 경로 제외)** | `4a43915` | 아래 6절 |

### 추가로 발견된 사실

- **Gemini 무료 키는 모델당 500회/일** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). 2026-08-23 QA 반복으로 소진됐고 KST 16:00 리셋. 앱의 일일 한도(500)와 같은 값이라 **운영 전환 전에 유료 키 또는 AI Gateway 가 필요**하다. QA 1회가 60~77회를 쓰므로 무료 키로는 하루 6회가 상한이다.
- `temperature: 0` 으로도 Gemini 는 결정적이지 않다(2회 실행 인용 조합 26/77 상이). 채점기는 "정답 문서 중 하나 인용"으로 흡수한다.
- 계획안 Task 2 의 `consume_chatbot_budget` SQL 은 `return query` 뒤 `return` 누락으로 한도 초과 시 2행을 반환했다. 수정 후 검증.
- Codex 의 "로컬 kb_documents=0" 오판 원인: `kb:eval` 이 `.env.local` 을 읽지 않았다. 로더 추가로 해결.

### Task 4 착수 전 결정 사항

1. 운영 Supabase 에 `20260823000000` 마이그레이션 적용(`supabase db push --linked`) — 가산(컬럼·함수 추가)이지만 운영 DB 변경이다.
2. Vercel Preview 환경변수 등록 — Supabase 3종 복제 + `NEXT_PUBLIC_CHATBOT_ENABLED`·`CHATBOT_MODEL`·`CHATBOT_DAILY_AI_LIMIT`·`CHATBOT_LOG_RETAIN_DAYS`·`CRON_SECRET` + 임시 Gemini 키(또는 AI Gateway).
3. `feat/chatbot` 원격 push → Preview 생성.
4. 재시도 로직 반영 77문항 재검증 — KST 16:00 이후.

## 6. Task 4 수행 결과 (2026-08-24 09:55 KST, 사용자 승인 후)

- 운영 Supabase `20260823000000` 적용 — migration list 양쪽 일치. PostgREST 검증:
  kb_documents 59 · chatbot_logs answer 컬럼 · `consume_chatbot_budget` true→false 1행 ·
  `purge_chatbot_logs(3650)`=0 · anon RPC 거부(42501).
- Vercel Preview 환경변수 9종 등록(Supabase 3종 plain/sensitive, 챗봇 4종, Gemini 키·CRON_SECRET sensitive).
- Preview `4a43915` (`ehwa-website-pj30rh7lm`): 보호 302 유지, bypass 로 검수.
  채널톡 SDK 0회 로드 · 자체 위젯만 노출 · /admin 런처 미노출 · 웰컴+버튼 6종 렌더.
  FAQ(faq-19/faq-04) · 정책(policy-medical/billing) · 범위밖 fallback+연결카드 정상.
  purge-logs 무인증 401 / CRON_SECRET 200. production 로그 오염 0행.
- **발견·수정한 P0**: `void logChat()` fire-and-forget 이 서버리스에서 유실됨
  (질문 5건 → 로그 4행 실측). Next `after()` 로 교체 후 질문 6건 → 로그 6행 확인. `4a43915`.
- **미완(차단)**: AI 경로 검증 · 77문항 재검증. Gemini 키가 아직 무료 등급
  (`…FreeTier` 한도 500회/일 소진, KST 16:00 리셋). 사용자가 유료 사용을 승인했으므로
  Google AI Studio 에서 해당 키 프로젝트에 결제 계정 연결(Tier 1 승격) 필요 —
  코드는 변경 불요, 같은 키로 한도만 올라간다. 승격 전까지는 16:00 리셋 후 재검증.

## 7. 채널톡 실대화 확보·재생 (2026-08-24 12:30 KST)

사용자가 Open API 키를 제공해 **채널톡 실제 이용 이력을 전량 확보**했다.

- 상담 15건 · 메시지 290건 · 자유질문 69건 · 버튼 클릭 33건 (2026-01-02 ~ 08-14)
- 원본: `docs/chatbot-assets/channeltalk-export/` (git 제외) — user-chats.json / messages.json / qa-pairs.json
- 재생 도구: `npm run ct:replay` — 같은 순서·같은 대화 맥락(직전 4턴)으로 자체 챗봇에 재생,
  채널톡 실답변과 나란히 기록 (`replay-result.json`). `--retry` 는 유효 결과를 보존하고 실패분만 재실행.

### 재생에서 발견·수정한 오답 3건 (`9c7e022`)

| 실질문 | 이전 응답 | 원인 | 수정 |
|---|---|---|---|
| "무료인가요" | 주차 FAQ 36 | 입력⊂변형 부분포함 0.9 | 부분포함을 변형이 4자 이내로 길 때만 인정 |
| "어떻게 이용할 수 있어요?" | 당일이용 FAQ 04 | "이용할 수 있어" 겹침 0.50 | FAQ_NOISE 에 할수있* 추가 |
| "병원에 도착해서 뭘 해야해?" | KB직답 19 외부이동 원문 | 표면 유사 0.627 ≥ 0.62 | 임계 0.66 (0.62~0.66 골든 0건 확인) |

유효 재생 15건 중 나머지 12건은 채널톡과 내용 동등 이상. 특히 "장애인 화장실이 어디있어?"는
채널톡이 1회 "문서에 정리 안 됨"으로 실패했으나 자체는 faq-43 으로 매회 답했다.
실질문 3건을 qa-set(KB 60문항)·매트릭스(43케이스)에 회귀 고정.

### 잔여 (자동 실행 대기)

- LLM 필요 재생 ~54건 + 77+3문항 QA: Gemini 무료 한도(500/일) 소진으로 16:03 KST 에
  분리 프로세스가 자동 실행(`scratchpad/quota-job.sh`, 포트 3113). Monitor 가 완료를 감지한다.
- Gemini 키는 여전히 FreeTier — 유료 사용 승인은 받았으나 **키 프로젝트의 결제 연결(Google
  AI Studio)은 사용자 작업**으로 남아 있다. 연결 전까지 하루 QA 약 6회 상한.

## 8. 최종 QA 결과 (2026-08-24 오후, 유료 키 전환 후)

- **QA 80문항: 80/80 (100%) — 2회 연속.** 정책 10/10, 범위 밖 10/10, 내용 오류 0.
- **채널톡 실대화 69문항 재생: 미응답 8/69(12%) vs 채널톡 실기록 15/69(22%).**
  내용 오류: 자체 0건, 채널톡 1건 이상("햄버거" 에코). 상세: `docs/채널톡_실대화_비교결과_20260824.md`
- Gemini 키 유료 전환 실확인(연속 대용량 5/5). 직답 게이트를 qScore 로 재설계해
  일반어 질의는 LLM 전체 대조가 결정한다 — 정확성 우선, 비용은 유료 키로 흡수.
- 정적 게이트: lint 0 errors / tsc 0 / 매트릭스 46/46 / FAQ 골든셋 100% / kb:eval Top-1 289/297.

**"채널톡보다 성능이 떨어지면 안 된다" 게이트: 실측 통과.**
남은 출시 차단 항목은 Task 5 의 사람 검수(교차 브라우저·실기기·스크린리더·병원 승인·처리방침)와
Task 0(운영 인증 배포 — 보류 중), Task 6(전환)이다.
