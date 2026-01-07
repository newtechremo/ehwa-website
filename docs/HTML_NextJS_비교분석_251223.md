# HTML vs Next.js 비교 분석 문서

> 이대목동장애인이용편의 지원센터251223 수정반영코드.html과 현재 Next.js 구현 비교
> 작성일: 2025년 12월 23일

---

## 목차

1. [개요](#1-개요)
2. [섹션 구조 비교](#2-섹션-구조-비교)
3. [상세 차이점 분석](#3-상세-차이점-분석)
4. [수정 필요 사항](#4-수정-필요-사항)
5. [우선순위별 작업 목록](#5-우선순위별-작업-목록)

---

## 1. 개요

### 1.1 비교 대상

| 구분 | 파일 |
|-----|------|
| **원본 HTML** | `docs/이대목동장애인이용편의 지원센터251223 수정반영코드.html` |
| **현재 구현** | Next.js App Router (`app/page.tsx` + `components/main/*`) |

### 1.2 주요 변경 사항 요약

| 항목 | 현재 Next.js | 새 HTML (251223) | 상태 |
|-----|-------------|------------------|------|
| 섹션 구성 | 5개 섹션 | 7개 섹션 | ❌ 불일치 |
| 수어 영상 | 3개 | 4개 | ❌ 불일치 |
| YouTube URL | 더미 URL | 실제 URL | ❌ 불일치 |
| 서비스 신청 URL | 구버전 | 신버전 | ❌ 불일치 |
| 사업 소개 섹션 | 없음 | 있음 | ❌ 누락 |
| 이용 방법 섹션 | StepsSection에 통합 | 별도 섹션 | ❌ 불일치 |

---

## 2. 섹션 구조 비교

### 2.1 현재 Next.js 구조

```
app/page.tsx
├── A11yBar (접근성 도구)
├── Header (네비게이션)
├── HeroSection (히어로)
├── StepsSection (이용 방법 + 수어 1)
├── FaqSection (FAQ + 수어 2)
├── ContactSection (신청하기 + 수어 3)
├── BlogSection (사업 소식)
└── Footer
```

### 2.2 새 HTML (251223) 구조

```
HTML
├── A11yBar (접근성 도구)
├── Header (네비게이션)
├── Hero Section (히어로)
├── Hero Sign Section (메인 인사말 수어) ⭐ 별도 섹션
├── Intro Section (사업 소개) ⭐ 신규
│   ├── "어떤 서비스인가요?" 설명
│   ├── 수어 영상 (sign-intro)
│   ├── "누가 이용할 수 있나요?" (대상자 3종)
│   └── "어떤 도움을 받을 수 있나요?" (지원서비스 4종)
├── Method Section (이용 방법) ⭐ 별도 섹션
│   ├── 수어 영상 (sign-method)
│   └── STEP 01-04
├── FAQ Section (자주 묻는 질문)
│   └── 수어 영상 (sign-faq)
├── Contact Section (서비스 신청 및 문의)
├── Blog Section (사업 소식)
└── Footer
```

### 2.3 구조 차이 시각화

| 순서 | 현재 Next.js | 새 HTML (251223) |
|-----|-------------|------------------|
| 1 | HeroSection | Hero Section |
| 2 | - | **Hero Sign Section (신규)** |
| 3 | - | **Intro Section (신규)** |
| 4 | StepsSection (수어 포함) | **Method Section (수어 포함)** |
| 5 | FaqSection (수어 포함) | FAQ Section (수어 포함) |
| 6 | ContactSection (수어 포함) | Contact Section (수어 없음) |
| 7 | BlogSection | Blog Section |

---

## 3. 상세 차이점 분석

### 3.1 수어 영상 (Sign Language Videos)

#### 현재 Next.js (3개)

| 위치 | 컴포넌트 | YouTube URL |
|-----|---------|-------------|
| 이용 방법 | StepsSection | `https://www.youtube.com/embed/dQw4w9WgXcQ?mute=1` (더미) |
| FAQ | FaqSection | `https://www.youtube.com/embed/dQw4w9WgXcQ?mute=1` (더미) |
| 신청하기 | ContactSection | `https://www.youtube.com/embed/dQw4w9WgXcQ?mute=1` (더미) |

#### 새 HTML (4개) - 실제 URL

| 위치 | ID | YouTube URL | 제목 |
|-----|---|-------------|------|
| 메인 인사말 | sign-hero | `https://www.youtube.com/embed/bG0kC10NdRs?si=2hOHCSzZvLTZNf3W&mute=1` | 메인 인사말 수어 해설 |
| 사업 소개 | sign-intro | `https://www.youtube.com/embed/ArvQ4IZTbq8?si=x22JycVyHbd2JNmV&mute=1` | 이용방법 수어 해설 |
| 이용 방법 | sign-method | `https://www.youtube.com/embed/Ah0GHfdMBeY?si=VENUwhk4zhGpl12Z&mute=1` | 이용방법 수어 해설 |
| FAQ | sign-faq | `https://www.youtube.com/embed/CRQK4E51pN0?si=4cZZOKMCRskGWVbq` | FAQ 수어 해설 |

**차이점:**
- Next.js는 더미 YouTube URL 사용 중
- HTML은 실제 수어 해설 영상 URL 사용
- 영상 개수: 3개 → 4개
- ContactSection에서 수어 영상 제거됨

---

### 3.2 신규 섹션: 사업 소개 (Intro Section)

#### 현재 Next.js
- **없음** (누락)

#### 새 HTML 구성

**섹션 헤더:**
```
제목: "어떤 서비스인가요?"
설명: "장애인 환자분이 병원 예약부터 귀가하실 때까지 겪는 이동, 의사소통,
      행정 절차의 어려움을 덜어드립니다. 수어통역사를 포함한 전담 인력이
      1:1 맞춤형 서비스를 제공합니다."
수어 영상: sign-intro
```

**대상자 안내 (target-list):**

| 아이콘 | 대상 |
|-------|------|
| fa-hospital-user | 이대목동병원을 처음 방문하는 초진 환자 |
| fa-wheelchair | 장애 정도가 심한 중증 장애인 |
| fa-person-walking | 보호자 없이 혼자 방문하는 분 |

**지원 서비스 안내 (support-grid):**

| 아이콘 | 서비스명 | 설명 |
|-------|---------|------|
| fa-person-walking | 이동·동행 지원 | 혼자 이동하기 힘드신 경우 직원이 밀착 동행합니다. 휠체어 이용, 환복, 검사 중 자세 유지 등 신체적 보조를 지원합니다. |
| SVG (수어 아이콘) | 의사소통 지원 | 전문 수어통역사가 진료 전 과정을 통역합니다. 글자판(필담), 그림판(AAC) 등을 활용해 정확한 의사소통을 돕습니다. |
| fa-file-signature | 행정절차 지원 | 키오스크(무인기기) 사용이나 복잡한 서류 작성을 곁에서 도와드립니다. 필요 시 지역사회 내 복지 자원으로 연계해 드립니다. |
| fa-user-doctor | 맞춤형 진료 지원 | 장애 유형 및 동선을 고려해 진료 일정과 대기 절차를 조정합니다. 진료 후 복약 지도와 다음 내원 절차를 상세히 안내합니다. |

---

### 3.3 이용 방법 섹션 변경

#### 현재 Next.js (StepsSection)
- 제목: "메인 인사말 수어 해설"
- 수어 영상 + STEP 1-4 통합

#### 새 HTML (Method Section)
- 제목: "어떻게 이용하나요?"
- 부제: "최소 3일 전 신청해주시면 더 원활한 지원이 가능합니다."
- 수어 영상 별도
- STEP 1-4 동일

**STEP 내용 (동일):**
```
STEP 01: 서비스 신청 - 홈페이지, 전화, 카카오톡, 방문을 통해 신청 의사를 전달해주세요.
STEP 02: 사전 상담 - 환자분께 꼭 맞는 지원을 위해 상담을 통해 사전상담지를 작성합니다.
STEP 03: 병원 내원 - 예약일에 병원에 오셔서 편안하게 진료를 받습니다.
STEP 04: 귀가 지원 - 처방전 발급, 약국 이용 안내 후 다음 예약을 도와드립니다.
```

---

### 3.4 히어로 섹션 차이

#### 서비스 신청 URL 변경

| 구분 | URL |
|-----|-----|
| **현재 Next.js** | `https://walla.my/survey/42xqoWjM1ebb1CDeHqKL` |
| **새 HTML** | `https://walla.my/a/barrierfree_v` |

#### 슬라이드 이미지

| 구분 | 이미지 |
|-----|-------|
| **현재 Next.js** | 로컬 이미지 (KakaoTalk_*.jpg) |
| **새 HTML** | Unsplash 이미지 3장 |

---

### 3.5 ContactSection 차이

#### 수어 영상
- **현재 Next.js**: 수어 영상 있음
- **새 HTML**: 수어 영상 **없음**

#### 신청 URL
- **현재 Next.js**: 구버전 URL
- **새 HTML**: 신버전 URL (`https://walla.my/a/barrierfree_v`)

---

### 3.6 네비게이션 메뉴 차이

#### 현재 Next.js
```
신청하기 | 알아보기 | 자주 묻는 질문 | 사업소식 | 사전문진표
```

#### 새 HTML
```
신청하기 | 알아보기 | 자주 묻는 질문 | 사업소식 | 사전문진표
```
- 메뉴 항목은 동일
- `intro` 섹션이 "알아보기"에 해당 (사업 소개 + 이용 방법 통합)

---

### 3.7 스타일 차이

#### CSS 변수 (새 HTML)
```css
:root {
    --primary: #004c28;
    --primary-dark: #00381e;
    --secondary: #0056b3;
    --text-black: #1a1a1a;
    --text-gray: #4a4a4a;
    --bg-light: #f5f7f9;
    --white: #ffffff;
    --border: #e1e1e1;
}
```

#### 새로운 CSS 클래스 (추가 필요)
```css
.intro-box { ... }
.intro-sub-title { ... }
.intro-text { ... }
.target-list { ... }
.target-item { ... }
.target-icon { ... }
.support-grid { ... }
.support-card { ... }
```

---

## 4. 수정 필요 사항

### 4.1 구조 변경 (필수)

| 번호 | 작업 | 우선순위 | 난이도 |
|-----|------|---------|-------|
| 1 | IntroSection 컴포넌트 신규 생성 | 높음 | 중 |
| 2 | StepsSection → MethodSection 리네이밍 및 수정 | 높음 | 하 |
| 3 | HeroSignSection 분리 또는 HeroSection 내 포함 | 중 | 하 |
| 4 | ContactSection에서 수어 영상 제거 | 중 | 하 |

### 4.2 컨텐츠 수정 (필수)

| 번호 | 작업 | 현재 값 | 변경 값 |
|-----|------|--------|--------|
| 1 | 서비스 신청 URL | `walla.my/survey/42xqo...` | `walla.my/a/barrierfree_v` |
| 2 | 메인 수어 영상 | 더미 URL | `youtube.com/embed/bG0kC10NdRs...` |
| 3 | 사업 소개 수어 영상 | 없음 | `youtube.com/embed/ArvQ4IZTbq8...` |
| 4 | 이용 방법 수어 영상 | 더미 URL | `youtube.com/embed/Ah0GHfdMBeY...` |
| 5 | FAQ 수어 영상 | 더미 URL | `youtube.com/embed/CRQK4E51pN0...` |

### 4.3 스타일 추가 (필수)

| 파일 | 추가할 스타일 |
|-----|-------------|
| `styles/main.css` | `.intro-box`, `.intro-sub-title`, `.target-list`, `.target-item`, `.target-icon`, `.support-grid`, `.support-card` |

---

## 5. 우선순위별 작업 목록

### 5.1 긴급 (즉시 수정)

```
□ 서비스 신청 URL 변경 (HeroSection, ContactSection)
  - 현재: https://walla.my/survey/42xqoWjM1ebb1CDeHqKL
  - 변경: https://walla.my/a/barrierfree_v

□ 수어 영상 YouTube URL 실제 값으로 변경
  - StepsSection: bG0kC10NdRs → 메인 인사말
  - FaqSection: CRQK4E51pN0 → FAQ
```

### 5.2 높음 (신규 섹션 추가)

```
□ IntroSection 컴포넌트 생성
  - "어떤 서비스인가요?" 설명
  - 수어 영상 (sign-intro)
  - "누가 이용할 수 있나요?" 대상자 3종
  - "어떤 도움을 받을 수 있나요?" 지원서비스 4종

□ page.tsx에 IntroSection 추가
  - HeroSection 다음에 배치
  - signLanguageEnabled prop 전달
```

### 5.3 중간 (구조 변경)

```
□ StepsSection 수정
  - 제목 변경: "메인 인사말 수어 해설" → "어떻게 이용하나요?"
  - 부제 추가: "최소 3일 전 신청해주시면 더 원활한 지원이 가능합니다."
  - YouTube URL 변경: Ah0GHfdMBeY (이용방법 수어)

□ HeroSection 수어 영상 분리 검토
  - 현재: 없음
  - 필요: 히어로 바로 아래 별도 섹션으로 분리 또는 통합 결정

□ ContactSection 수어 영상 제거
  - 현재: 수어 영상 포함
  - 변경: 수어 영상 제거 (새 HTML에 없음)
```

### 5.4 낮음 (스타일 보완)

```
□ 새로운 CSS 클래스 추가 (styles/main.css)
  - intro-box, intro-sub-title, intro-text
  - target-list, target-item, target-icon
  - support-grid, support-card

□ 고대비 모드 스타일 추가
  - body.low-vision .intro-box
  - body.low-vision .target-item
  - body.low-vision .support-card
```

---

## 부록: 컴포넌트 생성 가이드

### IntroSection.tsx 구조 제안

```tsx
interface IntroSectionProps {
  signLanguageEnabled: boolean
}

export function IntroSection({ signLanguageEnabled }: IntroSectionProps) {
  return (
    <section id="intro" className="section">
      {/* 섹션 헤더 */}
      <div className="sec-header">
        <h2>어떤 서비스인가요?</h2>
        <p>장애인 환자분이 병원 예약부터 귀가하실 때까지...</p>

        {/* 수어 영상 */}
        <SignVideo
          enabled={signLanguageEnabled}
          src="https://www.youtube.com/embed/ArvQ4IZTbq8..."
          title="이용방법 수어 해설 영상"
        />
      </div>

      {/* 대상자 안내 */}
      <div className="intro-box">
        <h3>누가 이용할 수 있나요?</h3>
        <ul className="target-list">
          <li className="target-item">...</li>
        </ul>
      </div>

      {/* 지원 서비스 */}
      <div className="intro-box">
        <h3>어떤 도움을 받을 수 있나요?</h3>
        <div className="support-grid">
          <div className="support-card">...</div>
        </div>
      </div>
    </section>
  )
}
```

---

## 문서 정보

| 항목 | 내용 |
|-----|------|
| 문서 버전 | 1.0 |
| 작성일 | 2025년 12월 23일 |
| 원본 HTML | 이대목동장애인이용편의 지원센터251223 수정반영코드.html |
| 비교 대상 | Next.js 프론트엔드 (app/page.tsx) |
