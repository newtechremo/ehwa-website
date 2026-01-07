"use client"

import { useState, useEffect, useRef } from "react"
import { useAccessibility } from "@/hooks/useAccessibility"
import { A11yBar } from "@/components/main/A11yBar"
import { Header } from "@/components/main/Header"
import { HeroSection } from "@/components/main/HeroSection"
import { HeroSignSection } from "@/components/main/HeroSignSection"
import { IntroSection } from "@/components/main/IntroSection"
import { StepsSection } from "@/components/main/StepsSection"
import { FaqSection } from "@/components/main/FaqSection"
import { ContactSection } from "@/components/main/ContactSection"
import { BlogSection } from "@/components/main/BlogSection"
import { Footer } from "@/components/main/Footer"
import "@/styles/main.css"

type PageType = "main" | "blog"
type SectionType = "hero" | "intro" | "faq"

export default function MainPage() {
  const [currentPage, setCurrentPage] = useState<PageType>("main")
  const [currentSection, setCurrentSection] = useState<SectionType | null>("hero")

  const {
    lowVision,
    signLanguage,
    fontScale,
    toggleLowVision,
    toggleSignLanguage,
    changeFontSize,
  } = useAccessibility()

  // 섹션 refs
  const heroRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)

  // 메인 페이지 섹션으로 이동
  const navigateToMainSection = (section: SectionType) => {
    setCurrentPage("main")

    setTimeout(() => {
      let targetRef: React.RefObject<HTMLDivElement> | null = null
      switch (section) {
        case "hero":
          targetRef = heroRef
          break
        case "intro":
          targetRef = introRef
          break
        case "faq":
          targetRef = faqRef
          break
      }

      if (targetRef?.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth" })
      }
      setCurrentSection(section)
    }, 100)
  }

  // 블로그 페이지로 이동
  const navigateToBlog = () => {
    setCurrentPage("blog")
    setCurrentSection(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // 스크롤 위치에 따라 현재 섹션 업데이트
  useEffect(() => {
    if (currentPage !== "main") return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200

      const heroTop = heroRef.current?.offsetTop || 0
      const introTop = introRef.current?.offsetTop || 0
      const faqTop = faqRef.current?.offsetTop || 0

      if (scrollPosition >= faqTop) {
        setCurrentSection("faq")
      } else if (scrollPosition >= introTop) {
        setCurrentSection("intro")
      } else {
        setCurrentSection("hero")
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [currentPage])

  return (
    <div className={`min-h-screen ${lowVision ? "low-vision" : ""}`}>
      {/* 접근성 도구 바 */}
      <A11yBar
        lowVision={lowVision}
        signLanguage={signLanguage}
        fontScale={fontScale}
        onToggleLowVision={toggleLowVision}
        onToggleSignLanguage={toggleSignLanguage}
        onChangeFontSize={changeFontSize}
      />

      {/* 헤더 */}
      <Header
        currentPage={currentPage}
        currentSection={currentSection}
        onNavigateMain={navigateToMainSection}
        onNavigateBlog={navigateToBlog}
      />

      {/* 메인 페이지 */}
      {currentPage === "main" && (
        <main>
          {/* 히어로 섹션 */}
          <div ref={heroRef}>
            <HeroSection />
          </div>

          {/* 메인 인사말 수어 해설 섹션 (수어 기능 활성화 시에만 표시) */}
          <HeroSignSection signLanguageEnabled={signLanguage} />

          {/* 사업 소개 섹션 */}
          <div ref={introRef}>
            <IntroSection signLanguageEnabled={signLanguage} />
          </div>

          {/* 이용 방법 섹션 */}
          <StepsSection signLanguageEnabled={signLanguage} />

          {/* FAQ 섹션 */}
          <div ref={faqRef}>
            <FaqSection signLanguageEnabled={signLanguage} />
          </div>

          {/* 신청하기 섹션 */}
          <ContactSection />
        </main>
      )}

      {/* 블로그 페이지 */}
      {currentPage === "blog" && (
        <main>
          <BlogSection />
        </main>
      )}

      {/* 푸터 */}
      <Footer />
    </div>
  )
}
