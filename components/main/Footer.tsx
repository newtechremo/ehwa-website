"use client"

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#eee]">
      <div className="max-w-[1200px] mx-auto px-5 py-10 text-center">
        <p className="mb-2.5 font-bold text-[#333] text-base">
          이대목동병원 장애인 이용편의 지원센터
        </p>
        <p className="text-sm text-[#666]">02-2650-5586 | 서울특별시 양천구 안양천로 1071</p>
        <p className="mt-2.5 text-sm">
          <a
            href="https://mokdong.eumc.ac.kr/customer/privacyPolicy.do"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#666] underline hover:text-[#004c28]"
          >
            개인정보처리방침
          </a>
        </p>
        <p className="mt-5 text-xs text-[#999]">
          Copyright (c) Ewha Womans University Medical Center All rights reserved.
        </p>
      </div>
    </footer>
  )
}
