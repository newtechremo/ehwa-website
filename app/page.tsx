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
import { Footer } from "@/components/main/Footer"
import "@/styles/main.css"

type SectionType = "hero" | "intro" | "faq"

export default function MainPage() {
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

  // 섹션으로 스크롤
  const scrollToSection = (section: SectionType) => {
    let targetRef: React.RefObject<HTMLDivElement | null> | null = null
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
  }

  // 페이지 로드 시 hash에 따라 섹션으로 스크롤
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as SectionType
      if (hash && ["hero", "intro", "faq"].includes(hash)) {
        setTimeout(() => scrollToSection(hash), 100)
      }
    }

    // 초기 로드 시 hash 처리
    handleHashChange()

    // hash 변경 이벤트 리스너
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // 스크롤 위치에 따라 현재 섹션 업데이트
  useEffect(() => {
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
  }, [])

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
        currentPage="main"
        currentSection={currentSection}
      />

      {/* 메인 콘텐츠 */}
      <main>
        {/* 히어로 섹션 */}
        <div ref={heroRef} id="hero">
          <HeroSection />
        </div>

        {/* 메인 인사말 수어 해설 섹션 (수어 기능 활성화 시에만 표시) */}
        <HeroSignSection signLanguageEnabled={signLanguage} />

        {/* 사업 소개 섹션 */}
        <div ref={introRef} id="intro">
          <IntroSection signLanguageEnabled={signLanguage} />
        </div>

        {/* 이용 방법 섹션 */}
        <StepsSection signLanguageEnabled={signLanguage} />

        {/* FAQ 섹션 */}
        <div ref={faqRef} id="faq">
          <FaqSection signLanguageEnabled={signLanguage} />
        </div>

        {/* 신청하기 섹션 */}
        <ContactSection />
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}
