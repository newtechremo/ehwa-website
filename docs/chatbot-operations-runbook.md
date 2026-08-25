# 자체 챗봇 운영 Runbook

## 현재 전환 상태

- Production은 2026-08-25 19:25 KST부터 자체 챗봇을 사용한다. ChannelTalk SDK는 비활성화됐다.
- 개선 브랜치 `feat/chatbot-rag-reliability`를 `feat/chatbot`에 통합한 뒤 PR #1로 `main`에
  병합했다. Production 기준 merge commit은 `8fa33046a5f290fd17a52add97b63a78ef2af81f`다.
- 최신 검증은 offline 전체 PASS, critical 17/17, ChannelTalk 실대화 158건, UI·TypeScript·
  Production build PASS, lint 0 errors/24 기존 warnings다. critical 17건은 모델 호출 0이었다.
- 최신 기준 브랜치 Preview는 `ehwa-website-lhtbp3too-remo-dev.vercel.app`
  (`dpl_2DWxHu3b3FzPcrK4ZcPJAcFSzuUP`), `Ready`, 보호 적용, `namespace=preview`, 한도 396,
  KB 59문서, model/embedding configured 상태다.
- 이동 보조 신청 smoke는 Preview 서버에서 hybrid RAG로 embedding 1회·generation 1회를 사용했고,
  신청 시점·환자정보·예약일·방문/온라인/카카오/전화·담당자 확정 문구를 모두 반환했다.
- Chrome 390×844 자동검사에서 모달 배경 inert·스크롤 잠금, ESC 닫기, 런처 포커스와 기존
  스크롤 위치 복원, 메시지 시간·하단 AI 안내·가로 넘침 없음이 통과했다. 실제 iPhone/Android와
  NVDA·VoiceOver·TalkBack 수동 검수는 아직 남아 있다.
- 최초 기준 브랜치 배포는 전역 Preview 기본값(`limit=500`, embedding 미설정)을 상속했다. 이후
  `feat/chatbot` 전용 Preview 환경을 개선 브랜치와 동일하게 설정하고 재배포해 드리프트를 해소했다.
- 실대화 158건 중 fallback 11건은 타 병원·내부 로직·근거 없는 지도/택시 위치·무의미 입력으로
  모두 보수적 거절이 적절했다. 답변 가능한 질문의 fallback은 0건이다.
- Git Markdown 재적재 기준 예상질문은 268개이며 Top-1·Top-3 268/268이다.
- 2026-08-25 사용자 결정에 따라 현재 ChannelTalk에서 운영 중인 전화·카카오·Walla URL과
  신청 문구를 자체 챗봇의 확정 기준으로 그대로 유지한다. 같은 내용을 다시 승인받는 절차와
  전체 실기기·스크린리더 매트릭스는 Production 차단 조건으로 사용하지 않는다.

## Production 배포 기록 (2026-08-25)

| 단계 | 배포·결과 |
|---|---|
| Git 통합 | PR #1, merge commit `8fa3304` |
| 다크 배포 | `dpl_9vPyfXY4WsaXyaFij1p6ZcDt2omj`, 플래그 OFF, READY |
| 다크 RAG | 이동 보조 신청 질문 HTTP 200, `ai/google-direct`, 고정 사실 8/8 |
| 활성 배포 | `dpl_21mh5pzp8aREuwdK4K4RhCqs3ZBz`, 플래그 ON, READY |
| 공개 URL | https://barrierfree.eumc.ac.kr |
| 단일 위젯 | ChannelTalk SDK 0, 자체 `chat-widget-root` 1 |
| Chrome 390×844 | 패널·제목·하단 AI 안내·배경 스크롤 잠금·가로 넘침 없음 PASS |
| 활성 canary | 전화번호 질문 HTTP 200, `ai/google-direct`, `02-2650-5586` 포함 |
| 로그 정책 | `CHATBOT_LOG_CONTENT=false`, 원문 비저장 |

Production의 기존 `CRON_SECRET`은 로컬 Preview 값과 달라 로컬 키로 health를 조회하면 401이
정상 반환된다. 기존 Production secret은 덮어쓰지 않았고, 무인증 health의 401 인증 차단과 실제
RAG의 Google 직접 호출 성공으로 런타임을 검증했다.

## 환경과 사용량 namespace

| 환경 | 포트/대상 | namespace | full live QA |
|---|---|---|---|
| 사람 로컬 | 3112 | `development-human` | 금지 |
| QA 로컬 | 3113 | `qa-local` | 허용 |
| Vercel Preview | Preview URL | `preview` | 금지, critical canary만 |
| Production | 운영 URL | `production` | 금지, synthetic 1건만 |

필수 환경변수는 `CHATBOT_USAGE_NAMESPACE`, `CHATBOT_DAILY_AI_LIMIT`, `CHATBOT_MODEL`,
`CHATBOT_EMBEDDING_MODEL=gemini-embedding-001`, `GOOGLE_GENERATIVE_AI_API_KEY`,
Supabase URL/service-role key, `CRON_SECRET`이다. 값은 Git에 저장하지 않는다.

Vercel 환경변수 변경은 기존 배포에 자동 반영되지 않는다. Preview/Production 값을 바꾼 뒤 해당 환경을 다시 배포한다.
Vercel Sensitive 변수는 생성 후 CLI로 값을 다시 내려받을 수 없다. `vercel env run`으로 Google·
CRON secret을 검증하지 말고, 변수 이름/scope 확인 후 새 배포의 보호된 health와 실제 서버 RAG
smoke로 검증한다. `vercel curl`은 Deployment Protection 우회 토큰을 자동 처리한다.

## 로컬 준비와 KB 적재

```bash
npm run db:start
npx supabase migration up --local
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run kb:ingest
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run kb:ingest
```

첫 실행은 변경 chunk만 embedding한다. 두 번째 실행의 `embedding 호출 대상`은 0이어야 한다.
`--prod`는 로컬 hostname을 거부하고, 로컬 실행은 원격 hostname을 거부한다.

## QA 실행 순서

```bash
npm run qa:offline
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run dev:qa
# 별도 터미널
npm run qa:critical
npm run qa:full
npm run qa:result
npm run chatbot:report -- --day YYYY-MM-DD --namespace qa-local --limit 1000
```

- `qa:offline`은 외부 AI 비용이 없다.
- `qa:critical`은 현재 핵심 질문을 KB에서 직접 답하므로 모델 호출이 0이어야 한다. 모든 case의
  양의 정수 `repeat`를 실행 전 검사하며, 로컬과 2026-08-25 Preview에서 17/17 통과했다.
- 보호된 Preview에서는 `vercel curl`로 임시 bypass cookie를 발급한 뒤 그 Cookie 문자열을
  `QA_PROTECTION_COOKIE`로 전달한다. 쿠키 파일은 검사 종료 즉시 삭제하고 commit하지 않는다.
- `qa:full`은 health의 namespace와 최악 비용(`문항 수 × 2`)을 먼저 확인하며 자동 재시도하지 않는다.
- full 결과는 ignored 경로에 저장된다. `qa:result`는 commit, set SHA-256, 문항/결과 수, 실패 0건을 모두 검사한다.
- 커밋 후 기존 결과는 즉시 stale이 된다. 현재 commit에서 다시 실행하지 않은 결과를 승인자료로 쓰지 않는다.
- Preview에서는 critical만, Production에서는 승인된 synthetic 질문 1건만 실행한다.

2026-08-24 사고 당시 내부 한도 500회 중 자동 QA·replay가 485회, 수정 확인 probe까지
포함하면 498회를 사용했다. 사람 브라우저의 AI 예산 소비는 0회였다. 현재는 `qa-local`과
`preview`를 분리하므로 같은 사고를 사람 QA에 전파하지 않는다. 상세 역산은
`자체챗봇_개선실행방안_및_AI한도_소진원인분석_20260824.md`를 기준으로 한다.

## 사용량과 장애 진단

```bash
npm run chatbot:report -- --day 2026-08-24 --namespace qa-local --limit 1000
```

`audit.difference`는 항상 0이어야 한다. 0이 아니면 모델 시도 로그 또는 usage event 유실이므로 배포를 중단한다.

| fallback reason | 의미 | 확인 순서 |
|---|---|---|
| `daily_limit` | 애플리케이션 일일 한도 소진 | report의 used/limit와 QA 실행 주체 확인 |
| `budget_unavailable` | Supabase 설정 또는 budget RPC 장애 | service-role 설정, DB 상태, v2 RPC/마이그레이션 확인 |
| `model_error` | Google/provider 오류 | `provider_error_code`별 건수와 제공자 quota/auth 상태 확인 |
| `model_refused` | 근거가 있어도 모델이 거절 문구 생성 | 해당 질문의 Top-K와 KB 원문 확인 |

`결제 연결`과 `CHATBOT_DAILY_AI_LIMIT`은 별개다. 결제가 정상이어도 내부 한도를 넘으면
`daily_limit`, DB가 실패하면 `budget_unavailable`, 제공자 quota/auth 문제면 `model_error`다.

## 예산 수동 조정

직접 `update chatbot_usage`를 실행하지 않는다. 사유가 남는 함수만 사용한다.

```sql
select adjust_chatbot_budget(
  date '2026-08-24',
  'qa-local',
  0,
  '승인자/티켓과 조정 사유'
);
```

조정 전후 `chatbot_usage_events`에서 `operation='adjustment'`, `outcome='adjusted'`,
`delta`, `used_after`, `reason`을 확인한다. Production 조정은 병원/운영 책임자 승인 없이 수행하지 않는다.

## 배포와 rollback

1. Preview에 마이그레이션과 KB를 적용한다.
2. 기능 브랜치를 push해 Git Preview를 만들고 환경변수 변경 뒤 그 Git 배포를 redeploy한다.
   worktree에서 `vercel deploy`로 파일을 직접 업로드하지 않는다. 로컬 전용 env symlink가 포함될
   수 있기 때문이다.
3. 정확한 Preview URL과 Git commit을 기록하고 critical/browser/accessibility QA를 수행한다.
4. 자동 QA·Preview Chrome 검증·Production 다크 배포가 통과하면
   `NEXT_PUBLIC_CHATBOT_ENABLED=true`로 전환한다. 기존 ChannelTalk 고정 사실을 변경할 때만
   별도 내용 확인을 수행한다.
5. 장애 시 즉시 feature flag를 `false`로 되돌리고 재배포해 ChannelTalk으로 복귀한다.
6. DB migration은 가산형이므로 긴급 rollback에서 테이블을 삭제하지 않는다. 위젯 flag만 되돌린다.

현재 활성 배포의 즉시 rollback은 Vercel Production
`NEXT_PUBLIC_CHATBOT_ENABLED=false` 설정 후 `dpl_21mh5pzp8aREuwdK4K4RhCqs3ZBz`를
Production으로 redeploy하는 것이다.

## 개인정보와 이력

- ChannelTalk 원본, 메시지, QA/replay 결과는 `docs/chatbot-assets/channeltalk-export/` 밖으로 복사하거나 commit하지 않는다.
- 파생 질문·답변은 `maskPII()`를 통과시킨다.
- 대화 로그는 기본 90일 보관 후 보호된 purge cron으로 삭제한다.
- Preview와 Production은 `CHATBOT_LOG_CONTENT=false`로 질문·답변 원문을 저장하지 않고
  session·응답 종류·근거 문서·오류·비용 지표만 저장한다. `maskPII()`는 원문 저장을 별도 승인해
  `true`로 켰을 때의 보조 방어선이며, 이름·서술형 생년월일·장애·질환을 완전히 판별하지 못한다.
- 원문 상담 이력 기능은 병원 개인정보 승인 전까지 비활성으로 유지한다.
