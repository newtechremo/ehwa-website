"use client"

import { useState } from "react"
import { Menu, X, ChevronRight } from "lucide-react"

type PageType = "main" | "blog"
type SectionType = "hero" | "intro" | "faq"

interface HeaderProps {
  currentPage: PageType
  currentSection: SectionType | null
  onNavigateMain: (section: SectionType) => void
  onNavigateBlog: () => void
}

export function Header({ currentPage, currentSection, onNavigateMain, onNavigateBlog }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openMenu = () => {
    setMobileMenuOpen(true)
    document.body.style.overflow = "hidden"
  }

  const closeMenu = () => {
    setMobileMenuOpen(false)
    document.body.style.overflow = ""
  }

  const handleNavClick = (section: SectionType) => {
    closeMenu()
    onNavigateMain(section)
  }

  const handleBlogClick = () => {
    closeMenu()
    onNavigateBlog()
  }

  const isActive = (page: PageType, section?: SectionType) => {
    if (page === "blog") return currentPage === "blog"
    return currentPage === "main" && currentSection === section
  }

  return (
    <>
      {/* 헤더 */}
      <header className="header-main border-b border-[#e1e1e1] bg-white min-h-[80px] flex items-center relative z-[1500] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="w-full max-w-[1200px] mx-auto px-5 py-3 flex justify-between items-center">
          {/* 로고 */}
          <button
            onClick={() => handleNavClick("hero")}
            className="logo text-[1.375rem] font-extrabold text-[#004c28] tracking-tight flex items-center gap-2 flex-1 lg:flex-none"
          >
            <img src="/logo_ehwa.svg" alt="이대목동병원 로고" className="h-8 w-auto flex-shrink-0" />
            <span className="flex flex-wrap break-keep">
              <span>이대목동병원</span>
              <span>&nbsp;장애인 이용편의 지원센터</span>
            </span>
          </button>

          {/* 모바일 햄버거 버튼 */}
          <button className="lg:hidden text-[1.625rem] text-[#333] p-2.5 flex-shrink-0" onClick={openMenu} aria-label="메뉴 열기">
            <Menu />
          </button>

          {/* PC 네비게이션 */}
          <nav className="gnb-pc hidden lg:flex gap-6 xl:gap-9 flex-wrap items-center">
            <button
              onClick={() => handleNavClick("hero")}
              className={`text-lg font-bold text-[#333] relative py-2.5 transition-colors hover:text-[#004c28]
                ${isActive("main", "hero") ? "text-[#004c28]" : ""}`}
            >
              신청하기
              {isActive("main", "hero") && (
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004c28]"></span>
              )}
            </button>
            <button
              onClick={() => handleNavClick("intro")}
              className={`text-lg font-bold text-[#333] relative py-2.5 transition-colors hover:text-[#004c28]
                ${isActive("main", "intro") ? "text-[#004c28]" : ""}`}
            >
              알아보기
              {isActive("main", "intro") && (
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004c28]"></span>
              )}
            </button>
            <button
              onClick={() => handleNavClick("faq")}
              className={`text-lg font-bold text-[#333] relative py-2.5 transition-colors hover:text-[#004c28]
                ${isActive("main", "faq") ? "text-[#004c28]" : ""}`}
            >
              자주 묻는 질문
              {isActive("main", "faq") && (
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004c28]"></span>
              )}
            </button>
            <button
              onClick={handleBlogClick}
              className={`text-lg font-bold text-[#333] relative py-2.5 transition-colors hover:text-[#004c28]
                ${isActive("blog") ? "text-[#004c28]" : ""}`}
            >
              알림/소식
              {isActive("blog") && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004c28]"></span>}
            </button>

            {/* 사전문진표 버튼 */}
            <a
              href="https://drive.google.com/uc?export=download&id=1rxBymUZiOXcgEAcbpFApPdkeD56fjGGd"
              target="_blank"
              rel="noopener noreferrer"
              download
              className="gnb-precheck-btn inline-flex items-center justify-center gap-2.5 h-11 px-[34px] rounded-md bg-white text-[#004c28] border-[1.5px] border-[#004c28] text-base font-bold whitespace-nowrap transition-all hover:bg-[#004c28] hover:text-white"
              aria-label="장애편의지원 사전문진표 PDF 다운로드"
            >
              <i className="fa-solid fa-file-arrow-down text-sm ml-1 text-current" aria-hidden="true"></i>
              <span className="mr-1">사전문진표</span>
            </a>
          </nav>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={closeMenu}
        aria-hidden={!mobileMenuOpen}
      />

      {/* 모바일 메뉴 드로어 */}
      <div className={`mobile-menu-wrap ${mobileMenuOpen ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="flex justify-between items-center mb-10 border-b border-[#eee] pb-5">
          <span className="font-extrabold text-lg text-[#004c28]">전체 메뉴</span>
          <button className="text-[1.75rem] text-[#333] p-1" onClick={closeMenu} aria-label="메뉴 닫기">
            <X />
          </button>
        </div>

        <ul className="flex-1">
          <li>
            <button
              onClick={() => handleNavClick("hero")}
              className="w-full text-xl font-bold text-[#333] py-4 border-b border-[#f5f5f5] flex justify-between items-center"
            >
              신청하기
              <ChevronRight className="h-4 w-4 text-[#ccc]" />
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavClick("intro")}
              className="w-full text-xl font-bold text-[#333] py-4 border-b border-[#f5f5f5] flex justify-between items-center"
            >
              알아보기
              <ChevronRight className="h-4 w-4 text-[#ccc]" />
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNavClick("faq")}
              className="w-full text-xl font-bold text-[#333] py-4 border-b border-[#f5f5f5] flex justify-between items-center"
            >
              자주 묻는 질문
              <ChevronRight className="h-4 w-4 text-[#ccc]" />
            </button>
          </li>
          <li>
            <button
              onClick={handleBlogClick}
              className="w-full text-xl font-bold text-[#333] py-4 border-b border-[#f5f5f5] flex justify-between items-center"
            >
              알림/소식
              <ChevronRight className="h-4 w-4 text-[#ccc]" />
            </button>
          </li>
          <li className="mt-4">
            <a
              href="https://drive.google.com/uc?export=download&id=1rxBymUZiOXcgEAcbpFApPdkeD56fjGGd"
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-full bg-[#004c28] text-white font-bold border border-[#00381e] text-base"
              aria-label="장애편의지원 사전문진표 PDF 다운로드"
            >
              <i className="fa-solid fa-file-arrow-down text-current" aria-hidden="true"></i>
              <span>사전문진표</span>
            </a>
          </li>
        </ul>

        <div className="mt-auto">
          <p className="text-sm text-[#666] leading-relaxed">
            <strong>문의전화</strong>
            <br />
            <span className="text-xl font-bold text-[#004c28]">02-2650-5586</span>
          </p>
        </div>
      </div>
    </>
  )
}
