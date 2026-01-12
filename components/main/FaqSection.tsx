"use client"

// 수어 아이콘 SVG
const SignLanguageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" style={{ verticalAlign: "middle" }}>
    <path
      fill="currentColor"
      d="M29.253 13.056a3.64 3.64 0 0 0-2.008-1.265a3.72 3.72 0 0 0-2.628.274a17 17 0 0 0-1.633.965V4.844A3.7 3.7 0 0 0 19.3 1a3.8 3.8 0 0 0-3.688 3.844v1.649a4.2 4.2 0 0 0-.945-.118q-.363 0-.721.061l-.079.012q-.319.06-.62.177q-.057.023-.113.05a3 3 0 0 0-.487.264q-.059.041-.115.085q-.221.162-.406.365c-.013.014-.029.023-.042.038c-.031.035-.05.076-.079.112a3.4 3.4 0 0 0-.446.743a3.55 3.55 0 0 0-2.21-.182c-.084.019-.162.051-.243.076l-.131.04a3.6 3.6 0 0 0-.994-2.2A3.54 3.54 0 0 0 5.453 5a3.61 3.61 0 0 0-3.484 3.672c0 .684.019 3.7.039 6.532l.027 3.818c0 .51.006.933.009 1.227v.461A9.87 9.87 0 0 0 5.3 28.342a11.23 11.23 0 0 0 7.464 2.638a10.98 10.98 0 0 0 7.8-3.413a21.2 21.2 0 0 0 2.911-4.158c.334-.63.719-1.233 1.151-1.8a20.4 20.4 0 0 1 3.588-3.064c.146-.1.287-.206.418-.3a3.5 3.5 0 0 0 1.335-2.4a3.87 3.87 0 0 0-.714-2.789m-16.128-2.385q-.002-.345.034-.687c0-.051.015-.092.021-.14q.025-.184.061-.34a2.5 2.5 0 0 1 .135-.409c.016-.036.032-.076.049-.108q.071-.138.175-.254l.016-.015a1 1 0 0 1 .172-.137a1 1 0 0 1 .195-.099q.126-.048.26-.072h.022a2.5 2.5 0 0 1 .4-.031a1.29 1.29 0 0 1 1.055.42c.379.548.55 1.213.484 1.876V13.7c0 2.3-1.158 2.3-1.539 2.3c-.845 0-1.225-.154-1.4-.681q-.02-.053-.034-.11a3 3 0 0 1-.055-.3c0-.028-.008-.054-.011-.084a6 6 0 0 1-.031-.46v-.034q-.009-.285-.008-.631zm-1.986-.364c0 .121-.014.236-.014.364v3.377a7.3 7.3 0 0 0 .137 1.543a1.7 1.7 0 0 1-1.763.265a1.73 1.73 0 0 1-1.063-1.605V11.74a1.73 1.73 0 0 1 .583-1.295a1.4 1.4 0 0 1 .296-.212q.062-.037.127-.07q.11-.049.225-.081q.06-.022.121-.038a1.68 1.68 0 0 1 1.349.263zm15.914 6.616v-.003a22.3 22.3 0 0 0-3.93 3.374c-.52.662-.98 1.369-1.376 2.112a19.4 19.4 0 0 1-2.624 3.776a8.98 8.98 0 0 1-6.358 2.8a9.23 9.23 0 0 1-6.142-2.139A7.87 7.87 0 0 1 4.047 20.7v-.459c0-.295-.006-.717-.009-1.228l-.027-3.817c-.02-2.84-.039-5.843-.039-6.518A1.617 1.617 0 0 1 5.453 7a1.53 1.53 0 0 1 1.113.422a1.7 1.7 0 0 1 .45 1.25v1.084a3.7 3.7 0 0 0-.578 1.984v2.52A3.72 3.72 0 0 0 7.8 17.125a1 1 0 0 0-.012.092a1 1 0 0 0 1.068.926a45 45 0 0 1 4.916-.117c.645.027 1.268.078 1.855.152c-.065.029-.125.053-.191.084A15 15 0 0 0 9.5 23a1 1 0 1 0 1.625 1.167a13 13 0 0 1 5.146-4.09a16 16 0 0 1 2.106-.8c.264-.079.474-.133.615-.167l.156-.036l.036-.008h.006a1 1 0 0 0 .291-1.858a8 8 0 0 0-1.988-.727A5.14 5.14 0 0 0 18.2 13.7v-3.029a5.26 5.26 0 0 0-.594-2.65V4.844A1.81 1.81 0 0 1 19.3 3a1.7 1.7 0 0 1 1.687 1.844v9.5c-.018.383.106.758.348 1.055a1.19 1.19 0 0 0 1.216.344q.291-.086.533-.269c.054-.039.1-.076.13-.1l.04-.037l.011-.009a11.6 11.6 0 0 1 2.277-1.483a1.72 1.72 0 0 1 1.217-.111c.349.075.664.259.9.526c.278.388.396.868.331 1.341a1.5 1.5 0 0 1-.525 1.032z"
    />
  </svg>
)

interface FaqSectionProps {
  signLanguageEnabled: boolean
}

const faqItems = [
  {
    q: "Q1.",
    badge: "비용문의",
    question: "이용료가 무료인가요?",
    answer: "A. 네, 이동 동행이나 수어 통역 등 지원 서비스는 무료입니다. (단, 진료비, 검사비, 약값은 본인이 내셔야 합니다.)",
  },
  {
    q: "Q2.",
    badge: "자격문의",
    question: "장애인이 아니어도 이용할 수 있나요?",
    answer: "A. 원칙적으로는 등록 장애인 환자를 위한 서비스입니다. 하지만 도움이 꼭 필요하신 상황이라면, 센터로 전화 주시면 상담 후 안내해 드리겠습니다.",
  },
  {
    q: "Q3.",
    badge: "동행범위",
    question: "집으로 데리러 와 주시나요?",
    answer: "A. 아니요, 집에서 병원까지의 이동은 지원하지 않습니다. 병원에 도착하시면 그때부터 직원이 마중 나가서 진료를 돕습니다.",
  },
  {
    q: "Q4.",
    badge: "당일신청",
    question: "오늘 당장 이용할 수 있나요?",
    answer: "A. 가급적 3일 전에 미리 신청해 주세요. 당일 신청은 다른 환자분의 예약 일정으로 어려울 수 있습니다. 급한 경우라면 전화로 먼저 확인해 주세요.",
  },
  {
    q: "Q5.",
    badge: "보호자 유무",
    question: "보호자 없이 혼자 가도 되나요?",
    answer: "A. 네, 걱정하지 마세요. 전문 교육을 받은 직원이 보호자를 대신하여 진료실 이동부터 수납, 약국 이용까지 곁에서 돕습니다.",
  },
]

export function FaqSection({ signLanguageEnabled }: FaqSectionProps) {
  return (
    <section id="faq" className="section py-[60px] lg:py-[100px] border-b border-[#eee]">
      <div className="container max-w-[1200px] mx-auto px-5">
        {/* 섹션 헤더 */}
        <div className="sec-header mb-[50px] text-left">
          <h2 className="sec-title text-[1.625rem] lg:text-[2.25rem] font-extrabold text-[#1a1a1a] mb-4 tracking-tight">
            자주 묻는 질문
          </h2>

          {/* 수어 영상 */}
          <div
            className={`sign-lang-container ${
              signLanguageEnabled ? "visible" : ""
            }`}
          >
            <div className="sign-video-placeholder">
              <div className="sign-content">
                <iframe
                  src="https://www.youtube.com/embed/CRQK4E51pN0?si=4cZZOKMCRskGWVbq"
                  title="FAQ 수어 해설 영상"
                  frameBorder="0"
                  allowFullScreen
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FAQ 아코디언 - HTML details/summary 구조 */}
        <div className="faq-list">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="faq-item border border-[#e1e1e1] rounded-xl mb-[15px] bg-white transition-all"
            >
              <summary className="faq-summary p-[25px] cursor-pointer font-bold text-lg flex justify-between items-center list-none text-[#333]">
                <span>
                  <span className="faq-q text-[#004c28] mr-3 font-black">{item.q}</span>
                  <span className="faq-badge inline-block bg-[#eaf3ed] text-[#004c28] px-2 py-0.5 rounded-md text-sm font-bold mr-2 align-[2px] border border-[rgba(0,76,40,0.1)]">
                    {item.badge}
                  </span>
                  {item.question}
                </span>
              </summary>
              <div className="faq-content faq-answer px-[25px] pb-[30px] text-lg leading-relaxed bg-white rounded-b-xl text-[#555]">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
