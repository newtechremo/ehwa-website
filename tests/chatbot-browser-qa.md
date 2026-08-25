# Chatbot Browser QA

- Preview URL: https://ehwa-website-lhtbp3too-remo-dev.vercel.app
  (branch alias: https://ehwa-website-git-feat-chatbot-remo-dev.vercel.app)
  (Deployment Protection 302 — bypass 필요)
- Git commit: `75f1829d70cf23f1e65fb1e57b0db7c582b9e4f2`
- Vercel deployment: `dpl_2DWxHu3b3FzPcrK4ZcPJAcFSzuUP`, `READY`
- 자동 검증일/KST: 2026-08-25
- 수동 수행자: 미지정
- 채널톡 비교 기준: 4개 상태 28건·620메시지·158 자유질문 전체 replay. 결과는
  `docs/채널톡_실대화_비교결과_20260824.md` 참조

## 사전 자동 검증 (2026-08-25, 사람 검수를 대체하지 않음)

| 항목 | 결과 |
|---|---|
| Git Preview | `Ready`, `feat/chatbot` push 직후 생성된 immutable deployment ✓ |
| Deployment Protection | 무인증 302 ✓ |
| health | `namespace=preview`, limit 396, KB 59, model/embedding configured ✓ |
| critical canary | 자동 17/17, 모델 시도·예산 증가 0 ✓ |
| 기준 브랜치 build/lint | build PASS, lint 0 errors·기존 UI warning 24건 ✓ |
| 이동 보조 신청 smoke | hybrid RAG·Google 직접 호출(embedding 1 + generation 1), 필수 사실 전부 포함 ✓ |
| 채널톡 SDK 미로드 / 자체 위젯만 포함 | 현재 Preview HTML에서 SDK 0·위젯 1 ✓ |
| 원문 로그 정책 | `CHATBOT_LOG_CONTENT=false`, 기본 비저장 runtime 회귀 검사 PASS ✓ |
| Chrome 390×844 자동 상호작용 | 제목·구문구 제거·시간·하단 안내·가로 넘침·배경 inert/스크롤 잠금·ESC·포커스/스크롤 복원 ✓ |
| 전체 ChannelTalk replay | 158/158 실행 ✓ |
| replay 내용 coverage | fallback 11건 모두 범위 밖·근거 부족, 답변 가능 fallback 0건 ✓ |

## 선택적 후속 수동 검수 매트릭스 (Production 차단 조건 아님)

| 환경 | 화면/기기 | 기본 흐름 | 오류/긴 콘텐츠 | 접근성 | 증빙 링크 | 판정 |
|---|---|---|---|---|---|---|
| Chrome 최신 | 1280×800 / 768×1024 / 390×844 | 390×844 자동 PASS | 390×844 자동 PASS | 자동 PASS | Preview 배포·CDP 결과 | 통과 |
| Edge 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 후속 권장 |
| Firefox 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 후속 권장 |
| Safari 16.4+ | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 후속 권장 |
| iOS Safari 최신 | 실제 iPhone, 세로/가로 | 미실행 | 미실행 | VoiceOver 미실행 | 미등록 | 후속 권장 |
| Android Chrome 최신 | 실제 Android, 세로/가로 | 미실행 | 미실행 | TalkBack 미실행 | 미등록 | 후속 권장 |

검수 절차·오류 상태·접근성 체크리스트: `docs/superpowers/plans/2026-08-23-channeltalk-replacement-release.md` Task 5 Step 6~10.

## 결함

| ID | 심각도 | 환경 | 재현 절차 | 기대/실제 | 담당 | 상태 | 재검수 증빙 |
|---|---|---|---|---|---|---|---|
| D1 | P0(수정됨) | Vercel 서버리스 | 자유질문 5건 연속 | 로그 5행 / 4행 (유실) | Claude | `4a43915` 수정, 6건=6행 재검수 통과 | 본 문서 사전 검증 표 |
| D2 | P1(수정됨) | 전체 replay | 158문항 재생 | 답변 가능 질문 fallback 0건 | 개발 | `64be426` 수정, 최종 재현 통과 | `docs/채널톡_실대화_비교결과_20260824.md` |
| D3 | P1(수정됨) | critical canary | 전체 case 실행 | 마지막 위치 후속 4건도 자동 실행 | 개발 | `14f0787` 수정, Preview 17/17 통과 | Preview 자동 QA |
| D4 | P0(수정됨) | 대화 로그 | 이름·생년월일·장애/질환 입력 | 원문 비저장, 진단 메타데이터만 저장 | 개발 | `7b7f623` 수정, 원문 저장은 OFF. 변경이 필요할 때만 별도 릴리스 | runtime 검사·환경 설정 |
| D5 | P1(수정됨) | 모바일·접근성 | 대화창을 열고 배경 탐색·스크롤 | 배경 컨트롤 25개 접근 가능, 페이지 스크롤 이동 / inert·고정 잠금 | 개발 | `75f1829` 수정, 실제 Preview Chrome 390×844 재검수 통과 | Preview CDP 자동검사 |

## 최종 승인

- P0 미해결: 0 / P1 미해결: 0
- 운영 내용 기준: 2026-08-25 사용자 확정 — 기존 ChannelTalk 공식 전화·URL·신청 문구를 그대로 유지
- 별도 병원 재승인: 동일한 운영 내용을 유지하므로 불필요. 고정 사실 변경 시에만 다시 확인
- 전체 실기기·스크린리더 매트릭스: 선택적 후속 검수이며 이번 Production 차단 조건이 아님
- 출시 판정: **기술 게이트 통과 — Production 다크 배포 및 활성화 진행 가능**
