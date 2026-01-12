"use client"

import { useState, useEffect } from "react"

// 로컬 이미지 사용
const slides = [
  "/source/main_image0.jpg",
  "/source/main_image1.jpg",
  "/source/main_image2.jpg",
]

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // 자동 슬라이드 전환 (5초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const moveSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <section id="hero" className="hero relative text-center py-40 px-5 overflow-hidden text-white bg-[#333] scroll-mt-20">
      {/* 슬라이더 배경 */}
      <div className="hero-slider absolute top-0 left-0 w-full h-full z-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`slide absolute top-0 left-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${slide})` }}
          />
        ))}
        {/* 어두운 오버레이 */}
        <div className="hero-overlay absolute top-0 left-0 w-full h-full bg-black/50 z-[1]" />

        {/* 인디케이터 점 */}
        <div className="slider-dots absolute bottom-[30px] left-1/2 -translate-x-1/2 flex gap-2.5 z-[3]">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot w-3 h-3 rounded-full border-none cursor-pointer transition-all ${
                index === currentSlide ? "bg-white scale-[1.2]" : "bg-white/50"
              }`}
              onClick={() => moveSlide(index)}
              aria-label={`${index + 1}번 슬라이드 보기`}
            />
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="container relative z-[2] max-w-[1200px] mx-auto" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
        <h1 className="text-[2rem] lg:text-[3.25rem] mb-[30px] leading-[1.3] font-extrabold text-white tracking-[-1.5px]">
          더 편안한 진료를 위해
          <br />
          동행하겠습니다
        </h1>
        <p className="text-[1.125rem] lg:text-[1.375rem] text-[#eee] mb-[50px] font-medium">
          장벽 없는 병원 이용,
          <br />
          장애인 의료기관 이용편의 지원사업과 함께라면 가능합니다.
        </p>

        {/* CTA 버튼 그룹 - HTML과 동일한 스타일 */}
        <div className="btn-group flex justify-center gap-[15px] flex-wrap">
          <button
            onClick={() => window.open("https://walla.my/a/barrierfree_v")}
            className="btn-cta inline-flex items-center justify-center gap-2.5 bg-[#004c28] text-white py-[18px] px-[45px] rounded-[50px] text-[1.25rem] font-bold shadow-[0_10px_25px_rgba(0,76,40,0.25)] border-2 border-transparent transition-all hover:translate-y-[-4px] hover:shadow-[0_15px_30px_rgba(0,76,40,0.35)] hover:bg-[#00381e]"
            style={{ textShadow: "none" }}
          >
            서비스 신청하기 <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button
            onClick={() => window.open("https://pf.kakao.com/_LKhxkn/chat")}
            className="btn-cta kakao inline-flex items-center justify-center gap-2.5 bg-[#FEE500] text-[#3c1e1e] py-[18px] px-[45px] rounded-[50px] text-[1.25rem] font-bold shadow-[0_10px_25px_rgba(254,229,0,0.4)] border-2 border-transparent transition-all hover:translate-y-[-4px] hover:bg-[#fadd00]"
            style={{ textShadow: "none" }}
          >
            <i className="fa-solid fa-comment" aria-hidden="true"></i> 카카오톡 상담
          </button>
        </div>
      </div>
    </section>
  )
}
