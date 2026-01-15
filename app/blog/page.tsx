"use client"

import { useAccessibility } from "@/hooks/useAccessibility"
import { A11yBar } from "@/components/main/A11yBar"
import { Header } from "@/components/main/Header"
import { BlogSection } from "@/components/main/BlogSection"
import { Footer } from "@/components/main/Footer"
import "@/styles/main.css"

export default function BlogPage() {
  const {
    lowVision,
    signLanguage,
    fontScale,
    toggleLowVision,
    toggleSignLanguage,
    changeFontSize,
  } = useAccessibility()

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
        currentPage="blog"
        currentSection={null}
      />

      {/* 블로그 콘텐츠 */}
      <main>
        <BlogSection />
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}
