# Chatbot Browser QA

- Preview URL: https://ehwa-website-ql6xyd68n-remo-dev.vercel.app
  (Deployment Protection 302 — bypass 필요)
- Git commit: `0632859b81f539ef9da078a6ab4483201e457805` (동작 코드 `64be426`)
- 자동 검증일/KST: 2026-08-24
- 수동 수행자: 미지정
- 채널톡 비교 기준: 4개 상태 28건·620메시지·158 자유질문 전체 replay. 결과는
  `docs/채널톡_실대화_비교결과_20260824.md` 참조

## 사전 자동 검증 (2026-08-24, 사람 검수를 대체하지 않음)

| 항목 | 결과 |
|---|---|
| Git Preview | `Ready`, commit·branch 일치 ✓ |
| Deployment Protection | 무인증 302 ✓ |
| health | `namespace=preview`, limit 396, KB 59, model/embedding configured ✓ |
| critical canary | 자동 13/13, 모델 시도·예산 증가 0 ✓ |
| canary 누락 위치 후속 | 별도 실행 4/4, KB 직답·모델 시도 0 ✓ |
| 기준 브랜치 build/lint | build PASS, lint 0 errors·기존 UI warning 24건 ✓ |
| 채널톡 SDK 미로드 / 자체 위젯만 포함 | 현재 Preview HTML에서 SDK 0·위젯 1 ✓ |
| 전체 ChannelTalk replay | 158/158 실행 ✓ |
| replay 내용 coverage | fallback 11건 모두 범위 밖·근거 부족, 답변 가능 fallback 0건 ✓ |

## 수동 검수 매트릭스 (병원 승인용 — 전 셀 판정·증빙 필수)

| 환경 | 화면/기기 | 기본 흐름 | 오류/긴 콘텐츠 | 접근성 | 증빙 링크 | 판정 |
|---|---|---|---|---|---|---|
| Chrome 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Edge 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Firefox 최신 | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| Safari 16.4+ | 1280×800 / 768×1024 / 390×844 | 미실행 | 미실행 | 미실행 | 미등록 | 차단 |
| iOS Safari 최신 | 실제 iPhone, 세로/가로 | 미실행 | 미실행 | VoiceOver 미실행 | 미등록 | 차단 |
| Android Chrome 최신 | 실제 Android, 세로/가로 | 미실행 | 미실행 | TalkBack 미실행 | 미등록 | 차단 |

검수 절차·오류 상태·접근성 체크리스트: `docs/superpowers/plans/2026-08-23-channeltalk-replacement-release.md` Task 5 Step 6~10.

## 결함

| ID | 심각도 | 환경 | 재현 절차 | 기대/실제 | 담당 | 상태 | 재검수 증빙 |
|---|---|---|---|---|---|---|---|
| D1 | P0(수정됨) | Vercel 서버리스 | 자유질문 5건 연속 | 로그 5행 / 4행 (유실) | Claude | `4a43915` 수정, 6건=6행 재검수 통과 | 본 문서 사전 검증 표 |
| D2 | P1(수정됨) | 전체 replay | 158문항 재생 | 답변 가능 질문 fallback 0건 | 개발 | `64be426` 수정, 최종 재현 통과 | `docs/채널톡_실대화_비교결과_20260824.md` |
| D3 | P1 | critical canary | 전체 case 실행 | 마지막 위치 후속 4건의 `repeat` 누락으로 자동 실행 제외 | 개발 | 미해결, 별도 4/4 통과 | Preview 직접 점검 |
| D4 | P0 | 대화 로그 | 이름·생년월일·장애/질환 입력 | 전화 등 정형정보만 마스킹, 서술형 민감정보 잔존 가능 | 개발·병원 | 미해결 | `lib/chatbot/log.ts` |

## 최종 승인

- P0 미해결: 1(D4) / P1 미해결: 1(D3), 수동 검수 미실행
- 개발 승인자/일시: 미승인
- 병원 승인자/일시: 미승인
- 출시 판정: **차단 — Production은 ChannelTalk 유지**
