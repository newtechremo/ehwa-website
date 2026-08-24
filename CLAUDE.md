# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

이대목동병원 장애인 이용편의 지원센터의 Next.js 웹사이트다. 공개 랜딩/소식 CMS와 함께,
채널톡의 버튼·FAQ·KB·AI 안내를 사이트 DOM 내부 자체 챗봇으로 교체하는 작업이 `feat/chatbot`에서 진행 중이다.

## Build & Development Commands

```bash
npm run dev      # Start dev server (port 3112, hostname 0.0.0.0)
npm run dev:qa   # QA 전용 namespace 서버 (port 3113)
npm run build    # Production build
npm run start    # Production server (port 3112)
npm run lint     # ESLint (현재 의존성/Flat Config 미설정, 최신 실행 계획 Task 3에서 복구)
npx tsc --noEmit # Next build가 건너뛰는 TypeScript 독립 검사
npm run test:chatbot # 정책·FAQ 라우팅 회귀
npm run kb:eval      # 로컬 Supabase KB 검색 평가
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run kb:ingest # 변경 chunk만 768차원 embedding 적재
CHATBOT_EMBEDDING_MODEL=gemini-embedding-001 npm run retrieval:eval # 하이브리드 검색 holdout
npm run retrieval:test # RRF와 12,000자 문맥 상한 순수 검증
npm run qa           # dev 서버 대상 현재 qa-set 전체 API QA (문항 수 하드코딩 금지)
npm run qa:critical  # 핵심 답변 전체 계약을 반복 검증 (자동 재시도 없음)
npm run test:runtime # KST 날짜와 usage namespace 검증
npm run test:budget  # 로컬 DB 예산 경계·감사 이벤트 검증
npm run db:start     # 로컬 Supabase 시작
npm run db:reset     # 로컬 DB 마이그레이션 재적용
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router
- **React 19**, **TypeScript 5**
- **Tailwind CSS 4** with PostCSS
- **shadcn/ui** components (Radix UI primitives)
- **Tiptap** rich text editor

### App Structure
```
app/
├── page.tsx              # Main landing page (client-side SPA)
├── layout.tsx            # Root layout, ChannelTalk/self-hosted chatbot switch, analytics
├── api/chatbot/          # ask/log APIs
└── admin/                # Server-session-protected CMS area
    ├── login/            # Authentication
    ├── posts/            # CRUD for news posts
    │   ├── write/        # Create post
    │   └── [id]/         # Edit post
    └── featured/         # Configure 3 featured post slots
```

### Component Organization
- `components/ui/` - shadcn/ui components
- `components/main/` - Landing page sections (Header, HeroSection, FaqSection, BlogSection, A11yBar, etc.)
- `hooks/` - Custom hooks (useAccessibility for high-contrast/sign-language/font-scale)
- `lib/` - Utilities (api.ts for fetch wrapper, posts.ts for data management)

### Data Persistence

- Supabase Postgres: posts, attachments, featured slots, chatbot logs/usage, KB 59 documents
- Supabase Storage: `ehwa-attachments`
- Admin auth: server-side scrypt verification + HMAC-signed httpOnly cookie
- Local development: Docker-based local Supabase; Preview/Production use the hosted project
- Post categories: `"공지"` (Notice), `"행사"` (Event), `"뉴스"` (News)

### ChannelTalk Replacement

- Authoritative design: `docs/챗봇_자체구축_통합구현플랜_20260820.md`
- **Authoritative current status/correction:** `docs/자체챗봇_현재현황_및_RAG_QA_근본원인분석_20260824.md`
- Improvement order and 500-call attribution: `docs/자체챗봇_개선실행방안_및_AI한도_소진원인분석_20260824.md`
- Latest status/release plan: `docs/superpowers/plans/2026-08-23-channeltalk-replacement-release.md`
- Flow: policy/review block → FAQ → KB direct → grounded LLM → phone/Kakao fallback
- AI 호출량은 `CHATBOT_USAGE_NAMESPACE`로 분리한다. 로컬 사람은 `development-human`,
  자동 QA는 `qa-local`, Preview는 `preview`, Production은 `production`을 사용한다.
- 일일 한도는 한국 시간 자정 기준이며 embedding과 generation 실제 제공자 호출을 각각 1회로 센다.
- `NEXT_PUBLIC_CHATBOT_ENABLED=true`: render `components/chat/ChatWidget.tsx`; otherwise load ChannelTalk
- Production remains on ChannelTalk until QA, privacy, migration, accessibility, and history-export gates pass
- Do not treat `tests/qa-result.json`'s old 76/77 as release approval; its FAQ scoring must be fixed first
- Do not treat the later 80/80 result or closed-only ChannelTalk replay as release approval either. The current
  `qa-set` has 82 cases while `qa-result` has 80 rows, and the old export omitted 13 `initial` chats.
- Phase A's browser check is historical; latest Preview still needs Chrome/Edge/Firefox/Safari, iOS/Android, NVDA/VoiceOver/TalkBack, failure-state, and hospital copy/UI approval
- Record the exact Preview URL, Git commit, browser/device results, evidence links, P0/P1 count, and approvers in `tests/chatbot-browser-qa.md` when executing release-plan Task 5

## Key Patterns

### Accessibility Features (A11yBar)
- High-contrast mode: `body.low-vision` class, styles in `styles/main.css`
- Sign language videos: Toggled via `signLanguageEnabled` prop
- Font scaling: 100%, 125%, 150% via `document.documentElement.style.fontSize`

### Styling
- Global styles: `app/globals.css` (CSS variables, Tailwind base)
- Main page styles: `styles/main.css` (animations, low-vision mode overrides)
- Low-vision mode uses `!important` overrides with `#000` background, `#fff`/`#f7ed72` text

### API Pattern
```typescript
import { apiGet, apiPost } from "@/lib/api"
// Uses relative paths, works on localhost and external hosting
```

## Configuration Notes

- `next.config.mjs`: cross-origin GET/HEAD/OPTIONS only; TypeScript errors are currently ignored in Next build
- External services: ChannelTalk fallback, Vercel Analytics/AI Gateway, Google Generative AI, Kakao Chat, Walla
- robots meta: `noindex, nofollow` (not indexed by search engines)

## Korean Language Context

This is a Korean-language website. Key terms:
- 고대비 = High contrast mode
- 수어 = Sign language
- 게시글 = Post/article
- 사업소식 = Business news/blog section
