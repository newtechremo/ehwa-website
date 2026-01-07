# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

이대목동병원 장애인 이용편의 지원센터 (Ewha Womans University Mokdong Hospital Accessibility Support Center) - A Next.js website with public-facing landing page and admin CMS for managing news/blog posts.

## Build & Development Commands

```bash
npm run dev      # Start dev server (port 3112, hostname 0.0.0.0)
npm run build    # Production build
npm run start    # Production server (port 3112)
npm run lint     # ESLint
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
├── layout.tsx            # Root layout (fonts, Botpress chatbot, analytics)
└── admin/                # Protected CMS area
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
All data uses **localStorage** (no backend):
- Posts: `localStorage.getItem("news_posts")`
- Featured slots: `localStorage.getItem("featured_slots")`
- Auth: `localStorage.getItem("isAuthenticated")`

Post categories: `"공지"` (Notice), `"행사"` (Event), `"뉴스"` (News)

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

- `next.config.mjs`: CORS enabled for all routes, TypeScript errors ignored in build
- External services: Botpress chatbot, Vercel Analytics, Kakao Chat
- robots meta: `noindex, nofollow` (not indexed by search engines)

## Korean Language Context

This is a Korean-language website. Key terms:
- 고대비 = High contrast mode
- 수어 = Sign language
- 게시글 = Post/article
- 사업소식 = Business news/blog section
