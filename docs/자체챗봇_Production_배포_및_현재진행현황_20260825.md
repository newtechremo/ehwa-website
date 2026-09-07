# 자체 챗봇 Production 배포 및 현재 진행 현황

- 기준일: 2026-08-25 KST
- 공개 URL: https://barrierfree.eumc.ac.kr
- 기준 브랜치/커밋: `main` / `d2153c90ec71519690bc111592c68f61a4243cb5`
- 현재 Production: `dpl_Dg9G5TJarfJC1inK1mEtLAtrBJhC`, `READY`
- 결론: **자체 RAG 챗봇 Production 활성화 및 기술 검증 완료**

## 1. 현재 운영 상태

| 항목 | 현재 상태 |
|---|---|
| 사용자 상담 위젯 | 자체 챗봇 활성화 |
| ChannelTalk SDK | 비활성, 공개 HTML 기준 0개 |
| 자체 챗봇 위젯 | 활성, `chat-widget-root` 1개 |
| 공개 도메인 | HTTP 200 |
| 생성 모델 | Google 직접 연결 `google/gemini-3.5-flash-lite` |
| 임베딩 모델 | `gemini-embedding-001` |
| Google API 키 | Vercel Production Sensitive 변수 등록 완료 |
| 일일 내부 AI 한도 | 500회 |
| 사용량 namespace | `production` |
| 대화 원문 저장 | OFF, `CHATBOT_LOG_CONTENT=false` |
| 로그 보존 설정 | 90일 |

전화번호 `02-2650-5586`, 카카오 상담 URL, Walla 신청 URL, 진료 3일 전 신청 권장 및
담당 매니저 상담 후 지원 확정 문구는 기존 ChannelTalk 운영 내용을 그대로 유지한다.

## 2. 현재 시스템 구성

| 계층 | 구성과 역할 |
|---|---|
| UI | Next.js `ChatWidget`, 메시지 시간·링크 카드·하단 AI 안내·모바일 모달 제공 |
| API | `/api/chatbot/ask`, 정책 → FAQ → KB 직답 → 하이브리드 RAG → fallback 순서 처리 |
| 지식검색 | Supabase Postgres/pgvector, 59문서·254청크, 문서당 상위 청크 병합 |
| AI | 서버에서 Google Gemini Developer API 직접 호출 |
| 예산보호 | 환경별 namespace, 일일 한도, 원자적 budget RPC 및 감사 이벤트 |
| 진단 | 원문을 제외한 응답 종류·근거 문서·오류·모델 시도 메타데이터 |
| 배포 | GitHub `main` → Vercel Production, 환경변수 변경 시 재배포 |
| 복구 | `NEXT_PUBLIC_CHATBOT_ENABLED=false` 재배포로 ChannelTalk 복귀 |

## 3. 해결한 주요 문제

초기 로컬 챗봇이 대부분 “잘 모르겠다”로 답한 원인은 단일 문제가 아니었다.

1. 자동 QA와 replay가 사람 QA와 같은 일일 500회 한도를 사용해 AI 경로를 소진했다.
2. 59개 전문을 한 번에 모델에 전달해 관련 근거가 희석되거나 잘렸다.
3. 문서의 위치·출발지·연결통로가 다른 청크로 분리되어 답변에 필요한 사실이 누락됐다.
4. 짧은 후속 질문에서 직전 목적지가 소실되거나 반대로 오래된 문맥이 독립 질문을 오염시켰다.
5. 위치명·층수 부분 일치가 잘못된 구조화 답변을 선택했다.
6. 과거 QA가 일부 case만 실행하거나 stale 결과를 현재 검증처럼 판단할 수 있었다.
7. Claude Code 분석은 제한된 자동 통과 수치와 오래된 결과를 실제 사용자 응답 품질로 잘못 확대 해석했다.

현재는 QA namespace 분리, 254청크 하이브리드 검색, 문서별 상위 청크 병합, 후속 문맥 제한,
정확한 층수 비교, 17개 critical case 전수 실행 및 commit/hash 검증으로 보강했다.

## 4. 검증 결과

### 로컬·Preview

| 검증 | 결과 |
|---|---|
| 라우팅 매트릭스 | 48/48 |
| FAQ 대표질문 | 43/43 |
| FAQ 유사질문 | 126/126 |
| KB 예상질문 Top-1·Top-3 | 268/268·268/268 |
| critical contract | 17/17, 모델 시도 0 |
| ChannelTalk 실대화 replay | 158/158 |
| 답변 가능한 질문 fallback | 0건 |
| 의도된 범위 밖 fallback | 11건 |
| UI 테스트·TypeScript·Production build | PASS |
| lint | 0 errors, 기존 warning 24건 |
| Preview Chrome 390×844 | 모달·포커스·스크롤·ESC·가로 넘침·하단 안내 PASS |

### Production

| 단계 | 결과 |
|---|---|
| `main` 통합 | PR #1, merge commit `8fa3304` |
| 다크 배포 | `dpl_9vPyfXY4WsaXyaFij1p6ZcDt2omj`, 플래그 OFF, READY |
| 다크 RAG | 이동 보조 질문 HTTP 200, `ai/google-direct`, 필수 사실 8/8 |
| 활성화 배포 | `dpl_21mh5pzp8aREuwdK4K4RhCqs3ZBz`, 플래그 ON, READY |
| 실제 Chrome 390×844 | 패널·제목·AI 안내·스크롤 잠금·가로 넘침 없음 PASS |
| 활성 canary | HTTP 200, `ai/google-direct`, 공식 전화번호 정상 응답 |
| 최종 문서 배포 | `dpl_Dg9G5TJarfJC1inK1mEtLAtrBJhC`, READY, 현재 alias |
| 최종 공개 상태 | ChannelTalk 0, 자체 위젯 1, HTTP 200 |

## 5. 개인정보와 운영 범위

- 질문·답변 원문은 Production에 저장하지 않는다.
- session hash, 응답 경로, 근거 문서, provider 오류, 비용 지표 등 진단 메타데이터만 저장한다.
- ChannelTalk 원본 대화와 첨부파일은 Git에 포함하지 않는다.
- 첨부파일 상담은 현재 자체 챗봇 범위에 포함하지 않는다.
- 실제 iPhone·Android 및 NVDA·VoiceOver·TalkBack 전체 수동 매트릭스는 후속 권장 검수이며
  이번 Production 릴리스 차단 조건은 아니다.

## 6. 현재 남은 운영 항목

| 우선순위 | 항목 | 판단 |
|---|---|---|
| 운영 | Production AI 사용량·fallback·provider 오류 정기 확인 | 지속 수행 |
| 운영 | 필요 시 Google API 키 교체 후 재배포·RAG smoke | 키는 언제든 교체 가능 |
| 후속 권장 | 실제 기기·교차 브라우저·스크린리더 표본 검수 | 운영 차단 아님 |
| 조건부 | 원문 저장 또는 첨부파일 기능 | 실제 요구가 생길 때 별도 설계 |
| 조건부 | 전화·URL·신청 문구 재확인 | 기존 고정 사실을 변경할 때만 수행 |

Production `CRON_SECRET`은 로컬 Preview secret과 다른 기존 운영 값이다. 이를 덮어쓰지 않았으며,
로컬 secret 또는 무인증 health 요청은 401로 차단된다. 실제 Google RAG 성공으로 키·모델·KB·예산
경로를 검증했다. health 상세 수치가 필요하면 기존 Production secret을 가진 운영 경로에서 조회한다.

## 7. 장애 대응

1. Vercel Production의 `NEXT_PUBLIC_CHATBOT_ENABLED`를 `false`로 변경한다.
2. 최근 정상 Production deployment를 Production 대상으로 redeploy한다.
3. 공개 HTML에서 자체 위젯 0, ChannelTalk SDK 1을 확인한다.
4. DB migration이나 기존 로그 테이블은 삭제하지 않는다.

Google 키 교체는 새 키 등록 → Production 재배포 → RAG smoke → 기존 키 폐기 순서로 수행한다.

## 8. 관련 문서

- [자체 챗봇 운영 Runbook](./chatbot-operations-runbook.md)
- [Production 배포 실행 계획](./superpowers/plans/2026-08-25-google-gemini-vercel-production-release.md)
- [채널톡 실대화 비교 결과](./채널톡_실대화_비교결과_20260824.md)
- [RAG QA 근본원인 분석](./자체챗봇_현재현황_및_RAG_QA_근본원인분석_20260824.md)
- [개선 실행방안과 AI 한도 원인](./자체챗봇_개선실행방안_및_AI한도_소진원인분석_20260824.md)
- [브라우저 QA 결과](../tests/chatbot-browser-qa.md)

## 최종 판정

현재 자체 챗봇은 검증된 Google 직접 연결 RAG 구성으로 Production에서 운영 중이다. 과거의
일괄 fallback과 AI 한도 공유 문제는 구조적으로 분리·개선됐고, 기존 ChannelTalk의 공식 신청
정보를 유지하면서 자체 위젯으로 전환했다. 현재 확인된 P0/P1 미해결 결함은 0건이다.

---

## 9. 2026-09-07 재점검 결과

기준일 이후 코드·설정 변경 없이 현황만 재확인했다.

### 운영 상태 (실측)

| 항목 | 결과 |
|---|---|
| 공개 HTML | ChannelTalk SDK 0 · 자체 위젯 1 |
| 관리자 무인증 쓰기 | `POST /api/posts` 401 |
| cron 무인증 | keepalive · purge-logs 모두 401 |
| health 무인증 | 401 |
| 예산 감사 이벤트 | 8건 전부 `allowed`, 거부 0건. embedding·generation 쌍 계상 정상 |
| provider 오류 | production 0건 (fallback 1건은 의도된 범위 밖 `unanswerable`) |

### 실사용 질문 검증 (Production 직접 호출)

채널톡 실이력의 최빈 질문 유형으로 확인했고 전부 정상 응답했다.

| 질문 | 경로 | 근거 |
|---|---|---|
| 지원되는 교통 서비스는? | kb | 문서 6, 병원 내부 한정 범위까지 명시 |
| 검사실·진료실 이동 보조 신청 | kb | 문서 3 |
| 무료인가요 | ai | 문서 16 (주차 오매칭 없음) |
| 진료 예약은 어떻게? | ai | 문서 46 |
| 장애인 화장실 위치 | faq | 건물·층별 전체 |
| 신청 방법 | ai | 문서 3·5 |
| 주차비 | ai | 문서 36·37·38 |
| 운영시간 | faq | 평일 09-17 |
| 미등록 장애인 이용 가능? | ai | 문서 7·8 |
| 비트코인 시세 | fallback | 정상 거절 |

### 실사용 규모 (채널톡 8개월 이력 기준)

`npm run ct:volume` 실측: 활성 12일 · 총 158문항 · p95/p99 일간 97문항 · 권장 한도 388.
현재 설정 500은 적정하다. 채널톡 최신 상담은 2026-08-24 14:14 KST 로, 전환 이후 신규 유입이 없다.
Production 로그는 8/25~9/7 사이 8건이며 배포일 점검과 본 재점검 호출이다. **조직적 실사용
데이터는 아직 축적되지 않았으므로 운영 품질 지표는 합성·과거 데이터 기준임을 유지한다.**

### 정리한 항목

- 최신 검증 산출물(158건 replay, 119문항 QA, manifest)이 `.worktrees/` 에만 있어
  `main` 에서 `npm run ct:replay` 가 manifest 부재로 실패하는 상태였다. `main` 으로 동기화하고
  구버전은 `_archive-20260824-old/` 로 옮겼다. 폴더는 개인정보 때문에 계속 git 추적 제외다.
- `feat/chatbot-rag-reliability` 워크트리 제거(브랜치는 보존).
- `hotfix/admin-auth` 브랜치 삭제 — 인증 파일 5개가 `main` 과 완전 동일한 중복이다.
- 실행계획 3건에 상태 배너 추가(체크박스 183개가 미갱신 상태로 남아 오독 위험).

### 재점검 후 회귀 검사

라우팅 48/48 · FAQ 43/43·126/126 · KB Top-1 268/268 · lint 0 errors(warning 24) · tsc 0.
