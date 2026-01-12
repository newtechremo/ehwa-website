"use client"

export function ContactSection() {
  return (
    <section id="apply" className="section py-[60px] lg:py-[100px] border-b border-[#eee]">
      <div className="container max-w-[1200px] mx-auto px-5">
        <h2 className="sec-title text-[1.625rem] lg:text-[2.25rem] font-extrabold text-[#1a1a1a] mb-[50px] tracking-tight text-center">
          서비스 신청 및 문의
        </h2>

        {/* 연락처 박스 - HTML과 동일한 구조 */}
        <div className="contact-box bg-[#eaf3ed] p-[30px] lg:p-[60px] rounded-[24px] text-center border border-[rgba(0,76,40,0.1)]">
          {/* CTA 버튼 그룹 */}
          <div className="btn-group flex justify-center gap-[15px] flex-wrap">
            <button
              onClick={() => window.open("https://walla.my/a/barrierfree_v")}
              className="btn-cta inline-flex items-center justify-center gap-2.5 bg-[#004c28] text-white py-[18px] px-[45px] rounded-[50px] text-[1.25rem] font-bold shadow-[0_10px_25px_rgba(0,76,40,0.25)] border-2 border-transparent transition-all hover:translate-y-[-4px] hover:shadow-[0_15px_30px_rgba(0,76,40,0.35)] hover:bg-[#00381e]"
            >
              서비스 신청하기
            </button>
            <button
              onClick={() => window.open("https://pf.kakao.com/_LKhxkn/chat")}
              className="btn-cta kakao inline-flex items-center justify-center gap-2.5 bg-[#FEE500] text-[#3c1e1e] py-[18px] px-[45px] rounded-[50px] text-[1.25rem] font-bold shadow-[0_10px_25px_rgba(254,229,0,0.4)] border-2 border-transparent transition-all hover:translate-y-[-4px] hover:bg-[#fadd00]"
            >
              카카오톡 문의
            </button>
          </div>

          {/* 연락처 정보 */}
          <div className="contact-info mt-[40px] mx-auto text-lg max-w-[600px] bg-white p-[30px] rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.05)] text-left">
            <div className="info-row flex mb-[15px] items-center">
              <span className="info-label w-[100px] font-bold text-[#4a4a4a]">전화</span>
              <span className="info-val font-semibold text-[#333] text-lg">02-2650-5586</span>
            </div>
            <div className="info-row flex mb-[15px] items-center">
              <span className="info-label w-[100px] font-bold text-[#4a4a4a]">이메일</span>
              <span className="info-val font-semibold text-[#333] text-lg">eumc.barrierfree@gmail.com</span>
            </div>
            <div className="info-row flex mb-[15px] items-center">
              <span className="info-label w-[100px] font-bold text-[#4a4a4a]">운영시간</span>
              <span className="info-val font-semibold text-[#333] text-lg">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
