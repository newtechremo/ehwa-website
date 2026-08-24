# Chatbot Browser QA

- Preview URL: https://ehwa-website-git-feat-chatbot-rag-reliability-remo-dev.vercel.app
  (Deployment Protection 302 — bypass 필요)
- Git commit: `26e955241c51632e74ebb1a1df0ead977ddb2eab`
- 자동 검증일/KST: 2026-08-24
- 수동 수행자: 미지정
- 채널톡 비교 기준: 4개 상태 28건·620메시지·163문항 전체 replay. 결과는
  `docs/채널톡_실대화_비교결과_20260824.md` 참조

## 사전 자동 검증 (2026-08-24, 사람 검수를 대체하지 않음)

| 항목 | 결과 |
|---|---|
| Git Preview | `Ready`, commit·branch 일치 ✓ |
| Deployment Protection | 무인증 302 ✓ |
| health | `namespace=preview`, limit 396, KB 59, model/embedding configured ✓ |
| critical canary | 10/10, 모델 시도·예산 증가 0 ✓ |
| 채널톡 SDK 미로드 / 자체 위젯만 포함 | 현재 Preview HTML에서 SDK 0·위젯 1 ✓ |
| 전체 ChannelTalk replay | 163/163 실행, 로그 163행 ✓ |
| replay 응답시간 | p95 1.89초, 최대 2.31초, 15초 초과 0 ✓ |
| replay 내용 coverage | 자체 fallback 개선 후보 20건 **실패(P1)** |

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
| D2 | P1 | 전체 replay | 163문항 재생 | ChannelTalk 핵심 안내/자체 fallback 0건 / 개선 후보 20건 | 개발 | 미해결 | `docs/채널톡_실대화_비교결과_20260824.md` |

## 최종 승인

- P0 미해결: 0 / P1 미해결: 1(D2), 수동 검수 미실행
- 개발 승인자/일시: 미승인
- 병원 승인자/일시: 미승인
- 출시 판정: **차단 — Production은 ChannelTalk 유지**
