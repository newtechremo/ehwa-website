# GA4 Walla Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4 page and CTA tracking now while keeping Walla as the service application form, then add a Walla completion redirect that records completed applications before the separate Vercel/Supabase migration project.

**Architecture:** Keep the current Next.js app and Walla flow. Add the GA4 global tag in `app/layout.tsx`, centralize event helpers in `lib/analytics.ts`, wire existing CTA buttons to those helpers, and add a lightweight `/apply/complete` page that records a completion event when Walla redirects after submission.

**Tech Stack:** Next.js App Router, React client components, `next/script`, GA4 `gtag.js`, Walla Ending Field URL redirect.

---

## Scope

This plan has three deliverable phases:

1. Phase 1: GA4 page collection and CTA click events.
2. Phase 2: Walla completion redirect page and completion event.
3. Phase 3: Walla dashboard setting change and verification checklist.

Vercel/Supabase migration and Walla replacement are intentionally excluded from this plan. They should run as separate work after the managed deployment and database/storage migration are done.

## Current Context

Existing CTA locations:

- `components/main/HeroSection.tsx`
  - Service apply button opens `https://walla.my/a/barrierfree_v`
  - Kakao consult button opens `https://pf.kakao.com/_LKhxkn/chat`
- `components/main/ContactSection.tsx`
  - Service apply button opens `https://walla.my/a/barrierfree_v`
  - Kakao consult button opens `https://pf.kakao.com/_LKhxkn/chat`
- `app/layout.tsx`
  - Already uses `next/script` for Channel Talk
  - Already includes Vercel Analytics
  - Does not include GA4

GA4 measurement ID:

```text
G-FMFRLWXG12
```

Target event names:

```text
click_service_apply
click_kakao_consult
complete_service_apply
```

GA4 custom event names are under 40 characters, start with letters, and use lowercase snake case.

## File Structure

- Create `lib/analytics.ts`
  - Owns GA4 measurement ID and event helper functions.
  - Provides no-op behavior when GA4 is unavailable.

- Modify `app/layout.tsx`
  - Adds Google tag script once for all public and admin pages.
  - Keeps Channel Talk and Vercel Analytics untouched.

- Modify `components/main/HeroSection.tsx`
  - Tracks `click_service_apply` and `click_kakao_consult` before opening external links.
  - Sends `cta_location: "hero"`.

- Modify `components/main/ContactSection.tsx`
  - Tracks `click_service_apply` and `click_kakao_consult` before opening external links.
  - Sends `cta_location: "contact"`.

- Create `app/apply/complete/page.tsx`
  - Shows a simple completion confirmation page.
  - Client component sends `complete_service_apply` once on mount.

- Create `app/apply/complete/ApplyCompleteTracker.tsx`
  - Isolates client-only GA4 event dispatch from the server page.

- Create `docs/GA4_Walla_Tracking_운영가이드_20260526.md`
  - Documents GA4 event names, Walla redirect URL, and verification steps for handoff.

---

### Task 1: Add GA4 Event Helper

**Files:**
- Create: `lib/analytics.ts`

- [ ] **Step 1: Create the helper module**

Use this exact content:

```ts
export const GA_MEASUREMENT_ID = "G-FMFRLWXG12"

export const SERVICE_APPLY_URL = "https://walla.my/a/barrierfree_v"
export const KAKAO_CONSULT_URL = "https://pf.kakao.com/_LKhxkn/chat"

export type CtaLocation = "hero" | "contact"

type GtagCommand = "js" | "config" | "event"
type GtagParams = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (command: GtagCommand, target: string | Date, params?: GtagParams) => void
  }
}

export function trackGaEvent(eventName: string, params: GtagParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return
  }

  window.gtag("event", eventName, params)
}

export function trackServiceApplyClick(ctaLocation: CtaLocation) {
  trackGaEvent("click_service_apply", {
    cta_location: ctaLocation,
    link_url: SERVICE_APPLY_URL,
  })
}

export function trackKakaoConsultClick(ctaLocation: CtaLocation) {
  trackGaEvent("click_kakao_consult", {
    cta_location: ctaLocation,
    link_url: KAKAO_CONSULT_URL,
  })
}

export function trackServiceApplyComplete() {
  trackGaEvent("complete_service_apply", {
    source: "walla_redirect",
  })
}
```

- [ ] **Step 2: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
eslint completes without new errors
next build completes or only shows pre-existing warnings/errors unrelated to lib/analytics.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: add GA4 analytics helpers"
```

---

### Task 2: Install GA4 Global Tag

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Import the measurement ID**

Add this import near the existing imports:

```ts
import { GA_MEASUREMENT_ID } from "@/lib/analytics"
```

- [ ] **Step 2: Add GA4 scripts above Vercel Analytics**

In the `<body>` block, place these scripts immediately after `{children}` and before `<Analytics />`:

```tsx
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `,
          }}
        />
```

The result should keep this order:

```tsx
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ ... }} />
        <Analytics />
        <Script id="channel-talk-sdk" ... />
```

- [ ] **Step 3: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
No new TypeScript or lint errors from app/layout.tsx
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: install GA4 global tag"
```

---

### Task 3: Track Hero CTA Clicks

**Files:**
- Modify: `components/main/HeroSection.tsx`

- [ ] **Step 1: Import analytics helpers**

Add this import under existing imports:

```ts
import {
  KAKAO_CONSULT_URL,
  SERVICE_APPLY_URL,
  trackKakaoConsultClick,
  trackServiceApplyClick,
} from "@/lib/analytics"
```

- [ ] **Step 2: Add click handlers inside `HeroSection`**

Add these functions below `moveSlide`:

```ts
  const openServiceApply = () => {
    trackServiceApplyClick("hero")
    window.open(SERVICE_APPLY_URL)
  }

  const openKakaoConsult = () => {
    trackKakaoConsultClick("hero")
    window.open(KAKAO_CONSULT_URL)
  }
```

- [ ] **Step 3: Replace inline `window.open` calls**

Change:

```tsx
            onClick={() => window.open("https://walla.my/a/barrierfree_v")}
```

to:

```tsx
            onClick={openServiceApply}
```

Change:

```tsx
            onClick={() => window.open("https://pf.kakao.com/_LKhxkn/chat")}
```

to:

```tsx
            onClick={openKakaoConsult}
```

- [ ] **Step 4: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
No new TypeScript or lint errors from HeroSection.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/main/HeroSection.tsx
git commit -m "feat: track hero CTA clicks"
```

---

### Task 4: Track Contact CTA Clicks

**Files:**
- Modify: `components/main/ContactSection.tsx`

- [ ] **Step 1: Import analytics helpers**

Add this import after `"use client"`:

```ts
import {
  KAKAO_CONSULT_URL,
  SERVICE_APPLY_URL,
  trackKakaoConsultClick,
  trackServiceApplyClick,
} from "@/lib/analytics"
```

- [ ] **Step 2: Add click handlers inside `ContactSection`**

Add these functions before the `return` statement:

```ts
  const openServiceApply = () => {
    trackServiceApplyClick("contact")
    window.open(SERVICE_APPLY_URL)
  }

  const openKakaoConsult = () => {
    trackKakaoConsultClick("contact")
    window.open(KAKAO_CONSULT_URL)
  }
```

- [ ] **Step 3: Replace inline `window.open` calls**

Change:

```tsx
              onClick={() => window.open("https://walla.my/a/barrierfree_v")}
```

to:

```tsx
              onClick={openServiceApply}
```

Change:

```tsx
              onClick={() => window.open("https://pf.kakao.com/_LKhxkn/chat")}
```

to:

```tsx
              onClick={openKakaoConsult}
```

- [ ] **Step 4: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
No new TypeScript or lint errors from ContactSection.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/main/ContactSection.tsx
git commit -m "feat: track contact CTA clicks"
```

---

### Task 5: Add Walla Completion Redirect Page

**Files:**
- Create: `app/apply/complete/page.tsx`
- Create: `app/apply/complete/ApplyCompleteTracker.tsx`

- [ ] **Step 1: Create `ApplyCompleteTracker.tsx`**

Use this exact content:

```tsx
"use client"

import { useEffect } from "react"
import { trackServiceApplyComplete } from "@/lib/analytics"

export function ApplyCompleteTracker() {
  useEffect(() => {
    trackServiceApplyComplete()
  }, [])

  return null
}
```

- [ ] **Step 2: Create `page.tsx`**

Use this exact content:

```tsx
import Link from "next/link"
import { ApplyCompleteTracker } from "./ApplyCompleteTracker"

export const metadata = {
  title: "서비스 신청 완료 | 이대목동병원 장애인 이용편의 지원센터",
  description: "장애인 의료기관 이용편의 지원사업 서비스 신청이 접수되었습니다.",
}

export default function ApplyCompletePage() {
  return (
    <main className="min-h-screen bg-white px-5 py-20">
      <ApplyCompleteTracker />
      <section className="mx-auto max-w-[720px] text-center">
        <p className="mb-4 text-sm font-bold text-[#004c28]">서비스 신청 완료</p>
        <h1 className="mb-6 text-[2rem] font-extrabold leading-tight text-[#1a1a1a] lg:text-[2.75rem]">
          신청이 접수되었습니다
        </h1>
        <p className="mb-10 break-keep text-lg leading-relaxed text-[#444]">
          담당자가 신청 내용을 확인한 뒤 안내드리겠습니다. 추가 문의가 필요하시면 카카오톡 상담 또는 전화로 연락해주세요.
        </p>
        <div className="rounded-2xl border border-[#d1e2d9] bg-[#f5f9f7] p-6 text-left">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row">
            <span className="w-[100px] font-bold text-[#4a4a4a]">전화</span>
            <span className="font-semibold text-[#333]">02-2650-5586</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row">
            <span className="w-[100px] font-bold text-[#4a4a4a]">운영시간</span>
            <span className="font-semibold text-[#333]">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00)</span>
          </div>
        </div>
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-[#004c28] px-8 py-4 text-base font-bold text-white transition-colors hover:bg-[#00381e]"
        >
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
No new TypeScript or lint errors from app/apply/complete/*
```

- [ ] **Step 4: Commit**

```bash
git add app/apply/complete
git commit -m "feat: add Walla completion tracking page"
```

---

### Task 6: Add Operations Guide

**Files:**
- Create: `docs/GA4_Walla_Tracking_운영가이드_20260526.md`

- [ ] **Step 1: Create the guide**

Use this exact content:

```md
# GA4 및 Walla 추적 운영 가이드

작성일: 2026-05-26

## 목적

장애인 의료기관 이용편의 지원사업 랜딩페이지의 국가사업 운영 성과보고와 이용현황 확인을 위해 GA4 방문 통계와 CTA 클릭 이벤트를 수집한다.

## 적용 URL

- 랜딩페이지: https://barrierfree.eumc.ac.kr/
- Walla 신청 링크: https://walla.my/a/barrierfree_v
- 카카오톡 상담 링크: https://pf.kakao.com/_LKhxkn/chat
- Walla 완료 리디렉션 URL: https://barrierfree.eumc.ac.kr/apply/complete

## GA4 설정

- 측정 ID: G-FMFRLWXG12
- 공통 태그 위치: `app/layout.tsx`
- 이벤트 helper: `lib/analytics.ts`

## 수집 지표

GA4 기본 보고서에서 확인:

- 방문자 수
- 페이지뷰
- 유입 경로
- 접속 기기 구분

커스텀 이벤트에서 확인:

| 이벤트명 | 의미 | 주요 파라미터 |
|---|---|---|
| `click_service_apply` | 서비스 신청하기 CTA 클릭 | `cta_location`, `link_url` |
| `click_kakao_consult` | 카카오톡 상담 CTA 클릭 | `cta_location`, `link_url` |
| `complete_service_apply` | Walla 제출 완료 후 리디렉션 도착 | `source` |

## Walla 설정

Walla 프로젝트 편집 화면에서 엔딩 필드를 추가한다.

1. 엔딩 필드 종류를 `URL로 이동`으로 설정한다.
2. 이동 URL을 `https://barrierfree.eumc.ac.kr/apply/complete`로 입력한다.
3. 로직 화면에서 제출하기 버튼 클릭 후 해당 엔딩 필드로 이동하도록 지정한다.
4. 모든 응답자가 완료 후 이동해야 한다면 기본 이동을 해당 엔딩 필드로 설정한다.
5. `게시하기`를 눌러 운영 설문에 반영한다.

## 검증 절차

1. `npm run build`로 빌드가 통과하는지 확인한다.
2. 로컬 또는 운영 페이지에서 GA4 스크립트가 로드되는지 브라우저 네트워크 탭에서 확인한다.
3. 서비스 신청하기 버튼 클릭 후 GA4 DebugView 또는 Realtime에서 `click_service_apply`를 확인한다.
4. 카카오톡 상담 버튼 클릭 후 GA4 DebugView 또는 Realtime에서 `click_kakao_consult`를 확인한다.
5. `/apply/complete` 접속 후 `complete_service_apply`를 확인한다.
6. Walla 테스트 응답을 제출하고 `/apply/complete`로 이동하는지 확인한다.

## 개인정보 수집 범위

랜딩페이지 GA4에는 개인정보를 전송하지 않는다. 이벤트에는 버튼 위치와 외부 링크 URL만 포함한다.

Walla 응답 데이터는 기존 Walla 운영 범위 안에서 관리한다. 자체 신청 시스템으로 전환하기 전까지 이 프로젝트의 서버와 DB에는 신청자 개인정보를 저장하지 않는다.

## 향후 전환 전략

1. 현재 단계: Walla 유지, GA4 클릭 및 완료 추적 적용
2. 이후 단계: Vercel/Supabase 배포 및 DB/Storage 안정화
3. 최종 단계: Walla 대체 자체 신청 시스템 검토 및 별도 보안 설계
```

- [ ] **Step 2: Commit**

```bash
git add docs/GA4_Walla_Tracking_운영가이드_20260526.md
git commit -m "docs: document GA4 and Walla tracking operations"
```

---

### Task 7: Local Verification

**Files:**
- No source changes.

- [ ] **Step 1: Build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
```

If build fails because of a pre-existing error, capture the failing file and error message before continuing.

- [ ] **Step 2: Start production server locally**

Run:

```bash
npm run start
```

Expected:

```text
Local: http://localhost:3112
```

- [ ] **Step 3: Verify GA4 script appears in HTML**

Open:

```text
http://localhost:3112/
```

Expected page source contains:

```text
https://www.googletagmanager.com/gtag/js?id=G-FMFRLWXG12
gtag('config', 'G-FMFRLWXG12')
```

- [ ] **Step 4: Verify CTA handlers**

In browser devtools console, stub `gtag`:

```js
window.__events = []
window.gtag = (...args) => window.__events.push(args)
```

Click the hero service apply button.

Expected:

```js
window.__events
```

includes:

```js
["event", "click_service_apply", { cta_location: "hero", link_url: "https://walla.my/a/barrierfree_v" }]
```

Click the hero Kakao button.

Expected:

```js
["event", "click_kakao_consult", { cta_location: "hero", link_url: "https://pf.kakao.com/_LKhxkn/chat" }]
```

Scroll to the contact section and repeat.

Expected:

```js
["event", "click_service_apply", { cta_location: "contact", link_url: "https://walla.my/a/barrierfree_v" }]
["event", "click_kakao_consult", { cta_location: "contact", link_url: "https://pf.kakao.com/_LKhxkn/chat" }]
```

- [ ] **Step 5: Verify completion page**

Open:

```text
http://localhost:3112/apply/complete
```

Expected:

```text
신청이 접수되었습니다
```

Devtools stub expected event:

```js
["event", "complete_service_apply", { source: "walla_redirect" }]
```

---

### Task 8: Production Deployment and GA4/Walla Verification

**Files:**
- No source changes.

- [ ] **Step 1: Deploy to current PM2/nginx server**

Run from project root:

```bash
npm run build
pm2 restart ehwa-website
```

Expected:

```text
PM2 process ehwa-website restarts and remains online
```

- [ ] **Step 2: Verify production page**

Open:

```text
https://barrierfree.eumc.ac.kr/
```

Expected:

```text
Landing page loads normally.
GA4 script request to googletagmanager.com is visible in network tab.
```

- [ ] **Step 3: Verify production completion page**

Open:

```text
https://barrierfree.eumc.ac.kr/apply/complete
```

Expected:

```text
Completion page loads with "신청이 접수되었습니다".
```

- [ ] **Step 4: Configure Walla Ending Field**

In Walla dashboard:

```text
Project editor → Ending field → URL로 이동 → https://barrierfree.eumc.ac.kr/apply/complete
Logic → 제출하기 → 엔딩 필드 지정
게시하기
```

Expected:

```text
Submitting the Walla form redirects to https://barrierfree.eumc.ac.kr/apply/complete
```

- [ ] **Step 5: Verify GA4 Realtime or DebugView**

In GA4:

```text
Realtime / DebugView
```

Expected events:

```text
page_view
click_service_apply
click_kakao_consult
complete_service_apply
```

Expected parameters:

```text
cta_location = hero or contact
link_url = tracked external URL
source = walla_redirect
```

- [ ] **Step 6: Final commit if deployment docs changed**

If the Walla dashboard setting details or GA4 verification notes are added to docs:

```bash
git add docs/GA4_Walla_Tracking_운영가이드_20260526.md
git commit -m "docs: update GA4 production verification notes"
```

---

## Later Separate Project: Walla Replacement After Vercel/Supabase

Do not implement this in the current tracking phase.

Recommended future architecture after Vercel/Supabase migration:

```text
barrierfree.eumc.ac.kr/apply
  -> Next.js application form
  -> server-validated API route
  -> Supabase Postgres applications table
  -> Supabase Storage for optional attachments
  -> authenticated admin review page
  -> CSV export for reporting
```

Minimum security requirements before storing application data:

- Server-side authentication for administrators.
- CSRF or same-site session protection.
- Rate limiting on submission endpoint.
- Zod validation for all submitted fields.
- Clear retention/deletion policy for personal information.
- Updated privacy policy language approved by the service owner.

This future work should have its own design and implementation plan because it changes the data ownership, privacy, and operational support model.

## References

- Google Analytics event setup: https://developers.google.com/analytics/devguides/collection/ga4/events
- Walla Ending Field redirect: https://docs.walla.my/ko/docs/help-center/create-forms/ending-field

## Self-Review

- Spec coverage: Phase 1 GA4 tracking, Phase 2 Walla completion redirect, Phase 3 Walla dashboard verification, and future Walla replacement strategy are covered.
- Placeholder scan: No placeholder terms are present.
- Type consistency: Event names, helper names, and URL constants are consistent across all tasks.
