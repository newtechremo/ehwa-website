# HTML 랜딩 페이지 상세 분석

## 1. 개요

### 1.1 파일 정보
- **파일명**: `이대목동 랜딩페이지 .html`
- **타입**: 단일 HTML 파일 (SPA 스타일)
- **목적**: 이대목동병원 장애인 이용편의 지원센터 공식 웹사이트

### 1.2 기술 스택
```
HTML5 + CSS3 + Vanilla JavaScript
├── 폰트: Pretendard (CDN)
├── 아이콘: FontAwesome 6.4.0
├── 챗봇: Botpress Webchat v3.5
└── 외부 연동: YouTube, Google Drive, Walla, Kakao
```

### 1.3 핵심 특징
- 접근성(Accessibility) 중심 설계
- 장애인 사용자를 위한 특화 기능
- 반응형 디자인 (데스크톱/모바일)
- 페이지 전환 없는 SPA 구조

---

## 2. 디자인 시스템

### 2.1 CSS 변수 (색상 체계)
```css
:root {
    --primary: #004c28;        /* 이화 그린 */
    --primary-dark: #00381e;   /* 어두운 그린 */
    --secondary: #0056b3;      /* 블루 */
    --text-black: #1a1a1a;     /* 본문 텍스트 */
    --text-gray: #4a4a4a;      /* 부가 텍스트 */
    --bg-light: #f5f7f9;       /* 배경 */
    --white: #ffffff;          /* 흰색 */
    --border: #e1e1e1;         /* 테두리 */
}
```

### 2.2 타이포그래피 체계
| 요소 | 크기 (rem) | 픽셀 환산 | 용도 |
|------|-----------|----------|------|
| `html` | 1rem | 16px | 기준 폰트 |
| `.hero h1` | 3.25rem | 52px | 히어로 제목 |
| `.sec-title` | 2.25rem | 36px | 섹션 제목 |
| `.hero p` | 1.375rem | 22px | 히어로 설명 |
| `.sec-desc` | 1.125rem | 18px | 섹션 설명 |
| `body` | 1rem | 16px | 본문 |

### 2.3 반응형 브레이크포인트
```css
@media (max-width: 1024px) {
    /* 태블릿/모바일 */
}
```

---

## 3. 페이지 구조 분석

### 3.1 전체 레이아웃
```
┌──────────────────────────────────────┐
│     접근성 도구 바 (a11y-bar)         │ ← Sticky
├──────────────────────────────────────┤
│          헤더 (Header + GNB)          │
├──────────────────────────────────────┤
│                                       │
│    [뷰 1] 메인 페이지 (view-main)     │
│    ├─ 히어로 섹션                     │
│    ├─ 수어 영상 섹션                  │
│    ├─ FAQ 섹션                        │
│    └─ 신청하기 섹션                   │
│                                       │
│    [뷰 2] 블로그 페이지 (view-blog)   │
│    ├─ 주요 소식 카드                  │
│    └─ 전체 게시글 테이블              │
│                                       │
├──────────────────────────────────────┤
│            푸터 (Footer)              │
└──────────────────────────────────────┘

         [오버레이]
         ├─ 모바일 메뉴 드로어
         ├─ 게시글 팝업 모달
         └─ Botpress 챗봇 (우측 하단)
```

---

## 4. 접근성 기능 상세 분석

### 4.1 접근성 도구 바 (a11y-bar)

#### A. HTML 구조
```html
<nav class="a11y-bar" aria-label="접근성 도구">
    <div class="a11y-container">
        <div class="a11y-title">
            <i class="fa-solid fa-universal-access"></i>
            <span class="desktop-text">접근성 도구</span>
        </div>
        <div class="a11y-controls">
            <!-- 고대비 버튼 -->
            <button class="a11y-btn" id="btn-lowvision"
                    onclick="toggleLowVision()"
                    aria-label="고대비 모드 켜기/끄기"
                    aria-pressed="false">
                <i class="fa-solid fa-eye"></i>
                <span class="desktop-text">고대비</span>
            </button>

            <!-- 글자 크기 조절 -->
            <div class="font-control-group" role="group"
                 aria-label="글자 크기 조정">
                <button class="font-btn" id="btn-font-minus"
                        onclick="changeFontSize(-1)">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <span class="font-label">
                    <i class="fa-solid fa-text-height"></i> 글자
                </span>
                <button class="font-btn" id="btn-font-plus"
                        onclick="changeFontSize(1)">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>

            <!-- 수어 영상 버튼 -->
            <button class="a11y-btn" id="btn-sign"
                    onclick="toggleSignLanguage()">
                <span class="emoji-icon">[수어 아이콘 SVG]</span>
                <span class="desktop-text">수어 영상</span>
            </button>
        </div>
    </div>
</nav>
```

#### B. 고대비 모드 (저시력 모드)

**JavaScript 상태 관리**:
```javascript
const state = {
    lowVision: false,  // 고대비 모드 상태
    sign: false,       // 수어 영상 상태
    fontScaleIndex: 0  // 글자 크기 인덱스 (0/1/2)
};
```

**토글 함수**:
```javascript
function toggleLowVision() {
    state.lowVision = !state.lowVision;
    const btn = document.getElementById('btn-lowvision');
    btn.setAttribute('aria-pressed', state.lowVision);

    if (state.lowVision) {
        // 글자 크기 기본값으로 되돌림
        state.fontScaleIndex = 0;
        document.documentElement.style.fontSize = '100%';

        // 글자 크기 버튼 비활성화
        fontButtons.forEach(b => {
            b.disabled = true;
            b.setAttribute('aria-disabled', 'true');
        });

        document.body.classList.add('low-vision');
        btn.classList.add('active');
        showToast("저시력 모드가 켜졌습니다");
    } else {
        // 글자 크기 버튼 다시 활성화
        fontButtons.forEach(b => {
            b.disabled = false;
            b.setAttribute('aria-disabled', 'false');
        });

        document.body.classList.remove('low-vision');
        btn.classList.remove('active');
        showToast("저시력 모드가 꺼졌습니다");
    }
}
```

**CSS 적용**:
```css
body.low-vision {
    background-color: #000 !important;
    color: #FFF !important;
    zoom: 1.2;  /* 전체 화면 120% 확대 */
}

body.low-vision * {
    border-color: #00FFFF !important;  /* 시안 테두리 */
    box-shadow: none !important;
}

/* 강조색 노란색 적용 */
body.low-vision h1, h2, h3, h4, .logo, a {
    color: #F7ED72 !important;
}

/* 버튼 스타일 */
body.low-vision .btn-cta {
    background: #000 !important;
    color: #F7ED72 !important;
    border: 2px solid #00FFFF !important;
}
```

**특징**:
- 배경: 검정색 (#000)
- 텍스트: 흰색 (#FFF)
- 강조: 노란색 (#F7ED72)
- 테두리: 시안 (#00FFFF)
- 화면 확대: 120%
- 고대비 모드 활성화 시 **글자 크기 조절 비활성화** (충돌 방지)

#### C. 글자 크기 조절

**크기 단계**:
```javascript
const fontScales = [100, 125, 150]; // % 단위
```

**조절 함수**:
```javascript
function changeFontSize(direction) {
    // 고대비 모드에서는 제한
    if (state.lowVision) {
        showToast("고대비 모드에서는 글자 크기 변경이 제한됩니다.");
        return;
    }

    let newIndex = state.fontScaleIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > 2) newIndex = 2;

    if (newIndex !== state.fontScaleIndex) {
        state.fontScaleIndex = newIndex;
        const scale = fontScales[newIndex];

        // HTML 태그의 폰트 사이즈를 %로 조절
        // REM 단위로 작성된 모든 요소가 일괄 변경됨
        document.documentElement.style.fontSize = scale + '%';

        showToast(`글자 크기: ${scale}%`);
    }
}
```

**동작 원리**:
1. `html { font-size: 16px }` 기본값
2. 버튼 클릭 시 `html { font-size: 125% }` 또는 `150%`로 변경
3. REM 단위로 작성된 모든 요소가 자동으로 비례 확대
4. 고대비 모드와 상호 배타적 동작

#### D. 수어 영상 기능

**토글 함수**:
```javascript
function toggleSignLanguage() {
    state.sign = !state.sign;
    const btn = document.getElementById('btn-sign');
    btn.setAttribute('aria-pressed', state.sign);

    const signContainers = document.querySelectorAll('.sign-lang-container');
    const signTriggers = document.querySelectorAll('.sign-trigger');
    const signSections = document.querySelectorAll('.sign-section');

    if (state.sign) {
        btn.classList.add('active');
        signContainers.forEach(el => el.classList.add('visible'));
        signTriggers.forEach(el => el.classList.add('active'));
        signSections.forEach(el => el.classList.add('active'));
        showToast('수어 영상 켜짐');
    } else {
        btn.classList.remove('active');
        signContainers.forEach(el => el.classList.remove('visible'));
        signTriggers.forEach(el => el.classList.remove('active'));
        signSections.forEach(el => el.classList.remove('active'));
        showToast("수어 영상 꺼짐");
    }
}
```

**CSS 애니메이션**:
```css
.sign-lang-container {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    margin-top: 0;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 16px;
    background: #000;
}

.sign-lang-container.visible {
    max-height: 600px;
    opacity: 1;
    margin-top: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}
```

**적용 위치**:
1. 히어로 섹션 아래 (메인 인사말 수어)
2. FAQ 섹션 헤더 (FAQ 수어 해설)

**특징**:
- YouTube iframe 임베드
- 아코디언 애니메이션으로 부드러운 전환
- 수어 기능 OFF 시 완전히 숨김

---

## 5. 헤더 및 네비게이션

### 5.1 헤더 구조
```html
<header>
    <div class="header-inner">
        <a onclick="showMainPage('hero')" class="logo">
            <i class="fa-solid fa-hospital"></i>
            이대목동병원 장애인 이용편의 지원센터
        </a>

        <!-- PC 네비게이션 -->
        <nav class="gnb-pc">
            <a onclick="showMainPage('hero')" id="nav-hero">신청하기</a>
            <a onclick="showMainPage('intro')" id="nav-intro">알아보기</a>
            <a onclick="showMainPage('faq')" id="nav-faq">자주 묻는 질문</a>
            <a onclick="showBlogPage()" id="nav-blog">사업소식</a>

            <!-- 사전문진표 다운로드 -->
            <a href="https://drive.google.com/uc?export=download&id=..."
               class="gnb-precheck-btn"
               target="_blank" download>
                <i class="fa-regular fa-file-lines"></i>
                <span>사전문진표</span>
            </a>
        </nav>

        <!-- 모바일 햄버거 버튼 -->
        <button class="btn-hamburger" onclick="openMenu()">
            <i class="fa-solid fa-bars"></i>
        </button>
    </div>
</header>
```

### 5.2 네비게이션 동작

#### A. 현재 메뉴 활성화
```javascript
function setActiveNav(id) {
    navLinks.forEach(link => link.classList.remove('current'));
    if(id) document.getElementById(id).classList.add('current');
}
```

**CSS 스타일**:
```css
.gnb-pc a.current {
    color: var(--primary);
}

.gnb-pc a.current::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--primary);
}
```

#### B. 페이지 내 스크롤
```javascript
function showMainPage(targetId) {
    closeMenu();
    viewMain.classList.remove('hidden');
    viewBlog.classList.add('hidden');

    // 네비게이션 활성화
    if (targetId === 'hero') setActiveNav('nav-hero');
    else if (targetId === 'intro') setActiveNav('nav-intro');
    else if (targetId === 'faq') setActiveNav('nav-faq');

    // 스크롤 이동
    if (targetId) {
        setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) {
                const offset = 80;  // 헤더 높이
                const top = el.getBoundingClientRect().top
                          + window.pageYOffset - offset;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        }, 100);
    }
}
```

### 5.3 모바일 메뉴 드로어

#### A. HTML 구조
```html
<!-- 오버레이 (배경 어둡게) -->
<div class="mobile-menu-overlay" id="mobileOverlay"
     onclick="closeMenu()"></div>

<!-- 드로어 메뉴 -->
<div class="mobile-menu-wrap" id="mobileMenu">
    <div class="m-menu-header">
        <span class="m-menu-title">전체 메뉴</span>
        <button class="btn-close-menu" onclick="closeMenu()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    </div>

    <ul class="mobile-gnb">
        <li><a onclick="showMainPage('hero')">신청하기</a></li>
        <li><a onclick="showMainPage('intro')">알아보기</a></li>
        <li><a onclick="showMainPage('faq')">자주 묻는 질문</a></li>
        <li><a onclick="showBlogPage()">사업소식</a></li>

        <!-- 사전문진표 버튼 -->
        <li>
            <a class="precheck" href="..." download>
                <i class="fa-regular fa-file-lines"></i>
                <span>사전문진표</span>
            </a>
        </li>
    </ul>

    <div style="margin-top:auto;">
        <p>문의전화<br>
        <span style="font-size:1.25rem; font-weight:bold;">
            02-2650-5586
        </span></p>
    </div>
</div>
```

#### B. 열기/닫기 함수
```javascript
function openMenu() {
    document.getElementById('mobileMenu').classList.add('open');
    document.getElementById('mobileOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';  // 배경 스크롤 방지
}

function closeMenu() {
    document.getElementById('mobileMenu').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('open');
    document.body.style.overflow = '';  // 스크롤 복원
}
```

#### C. CSS 애니메이션
```css
.mobile-menu-wrap {
    position: fixed;
    top: 0;
    right: -100%;  /* 초기 위치: 화면 밖 */
    width: 85%;
    max-width: 320px;
    height: 100%;
    background: #fff;
    z-index: 2500;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-menu-wrap.open {
    right: 0;  /* 열렸을 때: 화면 안으로 */
}
```

---

## 6. 히어로 섹션

### 6.1 이미지 슬라이더

#### A. HTML 구조
```html
<section id="hero" class="hero">
    <div class="hero-slider">
        <!-- 슬라이드 이미지 -->
        <div class="slide active"
             style="background-image: url('./KakaoTalk_20251215_101127870_01.jpg');"></div>
        <div class="slide"
             style="background-image: url('./KakaoTalk_20251215_101127870.jpg');"></div>
        <div class="slide"
             style="background-image: url('./KakaoTalk_20251215_101127870_02.jpg');"></div>

        <!-- 어두운 오버레이 -->
        <div class="hero-overlay"></div>

        <!-- 인디케이터 점 -->
        <div class="slider-dots">
            <button class="dot active" onclick="moveSlide(0)"></button>
            <button class="dot" onclick="moveSlide(1)"></button>
            <button class="dot" onclick="moveSlide(2)"></button>
        </div>
    </div>

    <!-- 히어로 콘텐츠 -->
    <div class="container">
        <h1>더 편안한 진료를 위해<br>동행하겠습니다</h1>
        <p>복잡한 의료기관, 이용하기 막막하셨나요?<br>
           이동이나 의사소통에 도움이 필요하시다면 언제든 신청해주세요</p>
        <div class="btn-group">
            <button onclick="window.open('https://walla.my/survey/...')"
                    class="btn-cta">
                서비스 신청하기 <i class="fa-solid fa-arrow-right"></i>
            </button>
            <button onclick="window.open('https://pf.kakao.com/...')"
                    class="btn-cta kakao">
                <i class="fa-solid fa-comment"></i> 카카오톡 상담
            </button>
        </div>
    </div>
</section>
```

#### B. 슬라이더 JavaScript
```javascript
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const slideCount = slides.length;

// 수동 슬라이드 전환
function moveSlide(index) {
    currentSlide = index;
    updateSlider();
}

// 자동 슬라이드 전환
function nextSlide() {
    currentSlide = (currentSlide + 1) % slideCount;
    updateSlider();
}

// 슬라이더 업데이트
function updateSlider() {
    slides.forEach((slide, idx) => {
        if (idx === currentSlide) slide.classList.add('active');
        else slide.classList.remove('active');
    });
    dots.forEach((dot, idx) => {
        if (idx === currentSlide) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

// 5초마다 자동 전환
setInterval(nextSlide, 5000);
```

#### C. CSS 효과
```css
.slide {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    opacity: 0;
    transition: opacity 1.0s ease-in-out;
    background-size: cover;
    background-position: center;
}

.slide.active {
    opacity: 1;
}

.hero-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);  /* 50% 검정 오버레이 */
    z-index: 1;
}
```

### 6.2 CTA 버튼

**연동 서비스**:
1. **서비스 신청**: Walla 설문 폼 (`https://walla.my/survey/...`)
2. **카카오톡 상담**: 카카오 채널 (`https://pf.kakao.com/_LKhxkn/chat`)

**버튼 스타일**:
```css
.btn-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--primary);
    color: #fff;
    padding: 18px 45px;
    border-radius: 50px;
    font-size: 1.25rem;
    font-weight: 700;
    box-shadow: 0 10px 25px rgba(0, 76, 40, 0.25);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.btn-cta:hover {
    transform: translateY(-4px);  /* 위로 올라감 */
    box-shadow: 0 15px 30px rgba(0, 76, 40, 0.35);
    background: var(--primary-dark);
}

.btn-cta.kakao {
    background: #FEE500;  /* 카카오 노란색 */
    color: #3c1e1e;
}
```

---

## 7. 이용 방법 섹션 (Steps)

### 7.1 HTML 구조
```html
<section id="hero-sign-section" class="section sign-section">
    <div class="container">
        <h2 class="sec-title" style="text-align: center;">
            메인 인사말 수어 해설
        </h2>

        <!-- 수어 영상 (토글 가능) -->
        <div class="sign-lang-container" id="sign-hero">
            <div class="sign-video-placeholder">
                <div class="sign-content">
                    <span class="sign-emoji">[수어 아이콘]</span>
                    <iframe src="https://www.youtube.com/embed/..."
                            title="메인 인사말 수어 해설 영상"
                            frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
        </div>

        <!-- 4단계 프로세스 -->
        <div class="step-list">
            <div class="step-item">
                <span class="step-num">STEP 01</span>
                <h3 class="step-title">서비스 신청</h3>
                <p class="step-desc">
                    홈페이지, 전화, 카카오톡, 방문을 통해 신청 의사를 전달해주세요.
                </p>
            </div>
            <div class="step-item">
                <span class="step-num">STEP 02</span>
                <h3 class="step-title">사전 상담</h3>
                <p class="step-desc">
                    환자분께 꼭 맞는 지원을 위해 상담을 통해 사전상담지를 작성합니다.
                </p>
            </div>
            <div class="step-item">
                <span class="step-num">STEP 03</span>
                <h3 class="step-title">병원 내원</h3>
                <p class="step-desc">
                    예약일에 병원에 오셔서 편안하게 진료를 받습니다.
                </p>
            </div>
            <div class="step-item">
                <span class="step-num">STEP 04</span>
                <h3 class="step-title">귀가 지원</h3>
                <p class="step-desc">
                    처방전 발급, 약국 이용 안내 후 다음 예약을 도와드립니다.
                </p>
            </div>
        </div>
    </div>
</section>
```

### 7.2 CSS 스타일
```css
.step-list {
    display: flex;
    gap: 25px;
}

.step-item {
    flex: 1;
    padding: 40px 30px;
    border: 1px solid #eee;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 5px 15px rgba(0,0,0,0.03);
    transition: transform 0.3s;
}

.step-item:hover {
    transform: translateY(-5px);  /* 호버 시 위로 */
}

.step-num {
    font-size: 1.125rem;
    font-weight: 900;
    color: var(--secondary);  /* 블루 */
    margin-bottom: 15px;
    display: block;
    letter-spacing: 1px;
}
```

---

## 8. FAQ 섹션

### 8.1 HTML 구조
```html
<section id="faq" class="section">
    <div class="container">
        <div class="sec-header">
            <h2 class="sec-title">자주 묻는 질문</h2>

            <!-- 수어 영상 -->
            <div class="sign-lang-container" id="sign-faq">
                <div class="sign-video-placeholder">
                    <div class="sign-content">
                        <span class="sign-emoji">[수어 아이콘]</span>
                        <iframe src="..." title="FAQ 수어 해설 영상"
                                frameborder="0" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        </div>

        <!-- FAQ 아코디언 -->
        <details>
            <summary>
                <span>
                    <span class="faq-q">Q1.</span>
                    <span class="faq-badge">비용문의</span>
                    이용료가 무료인가요?
                </span>
            </summary>
            <div class="faq-content">
                A. 네, 이동 동행이나 수어 통역 등 지원 서비스는 무료입니다.
                (단, 진료비, 검사비, 약값은 본인이 내셔야 합니다.)
            </div>
        </details>

        <details>
            <summary>
                <span>
                    <span class="faq-q">Q2.</span>
                    <span class="faq-badge">자격문의</span>
                    장애인이 아니어도 이용할 수 있나요?
                </span>
            </summary>
            <div class="faq-content">
                A. 원칙적으로는 등록 장애인 환자를 위한 서비스입니다.
                하지만 도움이 꼭 필요하신 상황이라면, 센터로 전화 주시면
                상담 후 안내해 드리겠습니다.
            </div>
        </details>

        <!-- Q3, Q4, Q5... -->
    </div>
</section>
```

### 8.2 FAQ 목록
| 번호 | 카테고리 | 질문 | 답변 요약 |
|------|---------|------|----------|
| Q1 | 비용문의 | 이용료가 무료인가요? | 지원 서비스는 무료, 진료비는 본인 부담 |
| Q2 | 자격문의 | 장애인이 아니어도 이용할 수 있나요? | 원칙은 등록 장애인, 상담 후 결정 |
| Q3 | 동행범위 | 집으로 데리러 와 주시나요? | 병원 내부만 지원 |
| Q4 | 당일신청 | 오늘 당장 이용할 수 있나요? | 3일 전 신청 권장 |
| Q5 | 보호자 유무 | 보호자 없이 혼자 가도 되나요? | 가능, 직원이 보호자 역할 |

### 8.3 CSS 아코디언
```css
details {
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 15px;
    background: #fff;
    transition: all 0.3s;
}

details[open] {
    border-color: var(--primary);
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

summary {
    padding: 25px;
    cursor: pointer;
    font-weight: 700;
    font-size: 1.125rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    list-style: none;  /* 기본 화살표 제거 */
}

/* 커스텀 화살표 */
summary::after {
    content: '\f078';  /* FontAwesome 아래 화살표 */
    font-family: 'Font Awesome 6 Free';
    font-size: 0.875rem;
    transition: transform 0.3s;
    color: #999;
}

details[open] summary::after {
    transform: rotate(180deg);  /* 열리면 위로 */
    color: var(--primary);
}
```

---

## 9. 신청하기 섹션

### 9.1 HTML 구조
```html
<section id="apply" class="section">
    <div class="container">
        <h2 class="sec-title" style="text-align: center;">
            서비스 신청 및 문의
        </h2>

        <div class="contact-box">
            <!-- CTA 버튼 -->
            <div class="btn-group">
                <button onclick="window.open('https://walla.my/survey/...')"
                        class="btn-cta">
                    편의지원 신청하기
                </button>
                <button onclick="window.open('https://pf.kakao.com/...')"
                        class="btn-cta kakao">
                    카카오톡 문의
                </button>
            </div>

            <!-- 신청 후 진행과정 안내 -->
            <div class="apply-process">
                <p><strong>신청 후 진행과정</strong></p>
                <p>1. 전화 연락 – 신청하시면 담당 직원이 평일 기준 2일 내 전화를 드립니다.</p>
                <p>2. 이용 확정 – (영상)전화 상담 후 서비스 이용이 최종 확정됩니다.</p>
            </div>

            <!-- 연락처 정보 -->
            <div class="contact-info">
                <div class="info-row">
                    <span class="info-label">전화</span>
                    <span class="info-val">02-2650-5586</span>
                </div>
                <div class="info-row">
                    <span class="info-label">이메일</span>
                    <span class="info-val">eumc.barrierfree@gmail.com</span>
                </div>
                <div class="info-row">
                    <span class="info-label">운영시간</span>
                    <span class="info-val">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00)</span>
                </div>
                <p style="margin-top:10px; font-size:0.875rem; color:#666;">
                    ※ 토요일 진료는 사전 예약 시에만 지원 가능합니다.
                </p>
            </div>
        </div>
    </div>
</section>
```

---

## 10. 사업소식 페이지

### 10.1 페이지 전환 구조
```javascript
// [뷰 1] 메인 페이지
const viewMain = document.getElementById('view-main');

// [뷰 2] 블로그 페이지
const viewBlog = document.getElementById('view-blog');

function showBlogPage() {
    closeMenu();
    viewMain.classList.add('hidden');
    viewBlog.classList.remove('hidden');
    setActiveNav('nav-blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

### 10.2 주요 소식 카드
```html
<h3>✨ 주요 소식</h3>
<div class="blog-featured">
    <div class="feat-card" onclick="openPopup(10)">
        <div class="feat-img">
            <img src="https://images.unsplash.com/..." alt="주요소식1">
        </div>
        <div class="feat-body">
            <span class="feat-badge">공지</span>
            <div class="feat-title">
                2025년도 장애인 건강검진 지원사업 확대 안내
            </div>
            <div class="feat-date">2025.01.15</div>
        </div>
    </div>
    <!-- 카드 2, 3 반복 -->
</div>
```

### 10.3 전체 게시글 테이블 (PC)
```html
<table class="blog-list-table">
    <caption class="blind">사업소식 전체 목록</caption>
    <colgroup>
        <col style="width: 10%">   <!-- 번호 -->
        <col style="width: 60%">   <!-- 제목 -->
        <col style="width: 15%">   <!-- 작성일 -->
        <col style="width: 15%">   <!-- 조회수 -->
    </colgroup>
    <thead>
        <tr>
            <th>번호</th>
            <th>제목</th>
            <th>작성일</th>
            <th>조회수</th>
        </tr>
    </thead>
    <tbody>
        <tr onclick="openPopup(10)">
            <td>10</td>
            <td class="subject">
                [안내] 휠체어 이용자를 위한 원내 이동 동선 안내 (본관/별관)
            </td>
            <td>2024.10.15</td>
            <td>124</td>
        </tr>
        <!-- 게시글 반복 -->
    </tbody>
</table>
```

### 10.4 게시글 모달 팝업

#### A. 게시글 데이터베이스
```javascript
const postDB = {
    10: {
        category: "안내",
        title: "[안내] 휠체어 이용자를 위한 원내 이동 동선 안내 (본관/별관)",
        date: "2024.10.15",
        views: 124,
        content: `<p>안녕하세요...</p>`,
        file: {
            name: "2024_hospital_wheelchair_map_v2.pdf",
            size: "2.4MB"
        }
    },
    9: { ... },
    8: { ... },
    7: { ... }
};
```

#### B. 팝업 열기 함수
```javascript
function openPopup(id) {
    const data = postDB[id];
    if (!data) return;

    // 데이터 바인딩
    document.getElementById('modal-category').textContent = data.category;
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-date').textContent = data.date;
    document.getElementById('modal-views').textContent = data.views;
    document.getElementById('modal-content').innerHTML = data.content;

    // 첨부파일 처리
    if (data.file) {
        document.getElementById('modal-file-box').style.display = 'flex';
        document.getElementById('modal-file-name').textContent = data.file.name;
    } else {
        document.getElementById('modal-file-box').style.display = 'none';
    }

    // 팝업 표시
    document.getElementById('post-modal').classList.add('active');
    document.body.style.overflow = 'hidden';  // 배경 스크롤 방지
}
```

#### C. 팝업 닫기
```javascript
function closePopup() {
    document.getElementById('post-modal').classList.remove('active');
    document.body.style.overflow = '';  // 배경 스크롤 복원
}

// 팝업 외부(검은 배경) 클릭 시 닫기
document.getElementById('post-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePopup();
    }
});
```

---

## 11. 외부 연동 서비스

### 11.1 Botpress 챗봇
```html
<!-- 스크립트 로드 -->
<script src="https://cdn.botpress.cloud/webchat/v3.5/inject.js" defer></script>
<script src="https://files.bpcontent.cloud/2025/12/10/03/20251210031337-4FY67QL3.js" defer></script>
```

**특징**:
- 우측 하단에 고정된 챗봇 버튼
- 클릭 시 채팅 창 팝업
- 자동 응답 및 FAQ 처리

### 11.2 Walla 설문 폼
```javascript
window.open('https://walla.my/survey/42xqoWjM1ebb1CDeHqKL')
```

**용도**: 서비스 신청 접수

### 11.3 카카오 채널
```javascript
window.open('https://pf.kakao.com/_LKhxkn/chat')
```

**용도**: 카카오톡 상담

### 11.4 Google Drive PDF
```html
<a href="https://drive.google.com/uc?export=download&id=1rxBymUZiOXcgEAcbpFApPdkeD56fjGGd"
   target="_blank" download>
```

**용도**: 사전문진표 PDF 다운로드

### 11.5 YouTube 임베드
```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?mute=1"
        title="수어 해설 영상"
        frameborder="0"
        allowfullscreen></iframe>
```

**용도**: 수어 영상 표시

---

## 12. 반응형 디자인

### 12.1 모바일 최적화
```css
@media (max-width: 1024px) {
    /* 네비게이션 */
    .gnb-pc { display: none; }
    .btn-hamburger { display: block; }

    /* 타이포그래피 */
    .hero h1 { font-size: 2rem; }
    .sec-title { font-size: 1.625rem; }

    /* 레이아웃 */
    .support-grid { grid-template-columns: 1fr; }
    .step-list { flex-direction: column; }
    .btn-group { flex-direction: column; width: 100%; }

    /* 블로그 카드 스크롤 */
    .blog-featured {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
    }
    .feat-card {
        min-width: 280px;
        scroll-snap-align: start;
    }

    /* 테이블 -> 모바일 리스트 */
    .blog-list-table { display: none; }
    .blog-list-mobile { display: block; }
}
```

---

## 13. 성능 최적화

### 13.1 이미지 최적화
- **배경 이미지**: 3장의 히어로 이미지 (로컬 파일)
- **카드 썸네일**: Unsplash CDN 사용 (`?q=80&w=600`)
- **Lazy Loading**: 없음 (향후 개선 필요)

### 13.2 폰트 로딩
```html
<link rel="stylesheet" as="style" crossorigin
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
```

### 13.3 외부 스크립트
- **defer 속성** 사용으로 HTML 파싱 우선
- FontAwesome, Botpress 모두 defer 적용

---

## 14. 접근성 준수 사항

### 14.1 ARIA 속성
```html
<nav aria-label="접근성 도구">
<button aria-label="고대비 모드 켜기/끄기" aria-pressed="false">
<div role="group" aria-label="글자 크기 조정">
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

### 14.2 시맨틱 HTML
- `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` 사용
- `<h1>` ~ `<h6>` 계층 구조 준수
- `<button>` vs `<a>` 적절한 구분

### 14.3 키보드 접근성
- 모든 인터랙티브 요소 포커스 가능
- 포커스 스타일 명확하게 표시
```css
*:focus-visible {
    outline: 3px solid #FFD700;  /* 노란색 아웃라인 */
    outline-offset: 2px;
    z-index: 9999;
}
```

### 14.4 스크린 리더 지원
- `<caption class="blind">` 테이블 설명
- `alt` 속성 이미지 설명
- `title` 속성 iframe 설명

---

## 15. SEO 설정

### 15.1 메타 태그
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>이대목동병원 장애인 이용편의 지원센터</title>

<!-- 검색엔진 비노출 설정 (개발/테스트용) -->
<meta name="robots" content="noindex, nofollow">
<meta name="googlebot" content="noindex, nofollow">
```

**주의**: 현재 검색엔진 노출이 차단되어 있습니다. 실제 배포 시 제거 필요.

---

## 16. 데이터 흐름도

```
사용자 입력
    │
    ├─ 접근성 도구 토글
    │   └─ JavaScript state 객체 업데이트
    │       └─ CSS 클래스 추가/제거
    │           └─ 화면 리렌더링
    │
    ├─ 네비게이션 클릭
    │   └─ showMainPage(targetId) / showBlogPage()
    │       └─ 뷰 전환 (.hidden 클래스)
    │           └─ 스크롤 이동
    │
    ├─ 슬라이더 자동 재생
    │   └─ setInterval(nextSlide, 5000)
    │       └─ updateSlider()
    │           └─ CSS 클래스 업데이트
    │
    ├─ 게시글 클릭
    │   └─ openPopup(id)
    │       └─ postDB[id] 데이터 조회
    │           └─ 모달 DOM 업데이트
    │               └─ .active 클래스 추가
    │
    └─ 외부 서비스 연결
        ├─ window.open(walla/kakao)
        ├─ PDF 다운로드 (Google Drive)
        └─ Botpress 챗봇 팝업
```

---

## 17. 한계점 및 개선 사항

### 17.1 현재 한계점
1. **정적 콘텐츠**: 게시글 데이터가 하드코딩되어 있음
2. **데이터 동기화**: Admin 페이지와 연동 안됨
3. **이미지 경로**: 로컬 파일 경로로 하드코딩
4. **검색 기능 없음**: 게시글 검색 불가
5. **페이지네이션 없음**: 게시글 목록이 고정
6. **국제화 없음**: 한국어만 지원

### 17.2 향후 개선 방향
1. **백엔드 API 연동**으로 동적 콘텐츠 관리
2. **이미지 CDN** 사용 (S3, Cloudinary 등)
3. **검색 및 필터링** 기능 추가
4. **페이지네이션** 구현
5. **다국어 지원** (영어, 중국어)
6. **성능 최적화**: Lazy Loading, Code Splitting
7. **PWA 변환**: 오프라인 지원, 설치 가능

---

## 18. 파일 구조 요약

```
이대목동 랜딩페이지.html (단일 파일)
├── <head>
│   ├── 메타 태그
│   ├── Pretendard 폰트
│   ├── FontAwesome 아이콘
│   ├── Botpress 스크립트
│   └── <style> (인라인 CSS)
│
├── <body>
│   ├── 접근성 도구 바
│   ├── 헤더 + GNB
│   ├── 모바일 메뉴 드로어
│   │
│   ├── [뷰 1] 메인 페이지
│   │   ├── 히어로 섹션
│   │   ├── 수어 영상 + 이용 방법
│   │   ├── FAQ
│   │   └── 신청하기
│   │
│   ├── [뷰 2] 블로그 페이지
│   │   ├── 주요 소식 카드
│   │   └── 전체 게시글 테이블
│   │
│   ├── 푸터
│   ├── 게시글 모달
│   └── <script> (인라인 JavaScript)
│
└── 참조 이미지 (별도 파일)
    ├── KakaoTalk_20251215_101127870.jpg
    ├── KakaoTalk_20251215_101127870_01.jpg
    └── KakaoTalk_20251215_101127870_02.jpg
```

---

## 19. 주요 JavaScript 함수 목록

| 함수명 | 기능 | 파라미터 |
|--------|------|----------|
| `toggleLowVision()` | 고대비 모드 토글 | 없음 |
| `changeFontSize(direction)` | 글자 크기 조절 | +1 또는 -1 |
| `toggleSignLanguage()` | 수어 영상 토글 | 없음 |
| `showMainPage(targetId)` | 메인 페이지 섹션 표시 | 'hero', 'intro', 'faq' |
| `showBlogPage()` | 블로그 페이지 표시 | 없음 |
| `setActiveNav(id)` | 네비게이션 활성화 | 네비게이션 ID |
| `openMenu()` | 모바일 메뉴 열기 | 없음 |
| `closeMenu()` | 모바일 메뉴 닫기 | 없음 |
| `moveSlide(index)` | 슬라이더 수동 전환 | 0, 1, 2 |
| `nextSlide()` | 슬라이더 자동 전환 | 없음 |
| `updateSlider()` | 슬라이더 UI 업데이트 | 없음 |
| `openPopup(id)` | 게시글 팝업 열기 | 게시글 ID |
| `closePopup()` | 게시글 팝업 닫기 | 없음 |
| `showToast(msg)` | 토스트 메시지 표시 | 메시지 문자열 |

---

## 20. 브라우저 호환성

### 20.1 지원 브라우저
- **Chrome/Edge**: 최신 2개 버전
- **Firefox**: 최신 2개 버전
- **Safari**: 최신 2개 버전
- **모바일 Safari**: iOS 12+
- **Chrome Mobile**: Android 8+

### 20.2 사용된 최신 기술
- CSS Grid/Flexbox
- CSS Custom Properties (변수)
- `details` / `summary` 태그
- `window.scrollTo({ behavior: 'smooth' })`
- ES6+ JavaScript

---

이 문서는 HTML 랜딩 페이지의 모든 기능과 구조를 상세하게 분석한 내용입니다.
