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

interface IntroSectionProps {
  signLanguageEnabled: boolean
}

// 대상자 목록
const targetList = [
  {
    icon: "fa-solid fa-hospital-user",
    title: "이대목동병원을",
    subtitle: "처음 방문하는 초진 환자",
  },
  {
    icon: "fa-solid fa-wheelchair",
    title: "장애 정도가 심한",
    subtitle: "중증 장애인",
  },
  {
    icon: "fa-solid fa-person-walking",
    title: "보호자 없이",
    subtitle: "혼자 방문하는 분",
  },
]

// 지원 서비스 목록
const supportServices = [
  {
    icon: "fa-solid fa-person-walking",
    title: "이동 · 동행 지원",
    description: "혼자 이동하기 힘드신 경우 직원이 밀착 동행합니다. 휠체어 이용, 환복, 검사 중 자세 유지 등 신체적 보조를 지원합니다.",
    useSignIcon: false,
  },
  {
    icon: "",
    title: "의사소통 지원",
    description: "전문 수어통역사가 진료 전 과정을 통역합니다. 글자판(필담), 그림판(AAC) 등을 활용해 정확한 의사소통을 돕습니다.",
    useSignIcon: true,
  },
  {
    icon: "fa-solid fa-file-signature",
    title: "행정절차 지원",
    description: "키오스크(무인기기) 사용이나 복잡한 서류 작성을 곁에서 도와드립니다. 필요 시 지역사회 내 복지 자원으로 연계해 드립니다.",
    useSignIcon: false,
  },
  {
    icon: "fa-solid fa-user-doctor",
    title: "맞춤형 진료 지원",
    description: "장애 유형 및 동선을 고려해 진료 일정과 대기 절차를 조정합니다. 진료 후 복약 지도와 다음 내원 절차를 상세히 안내합니다.",
    useSignIcon: false,
  },
]

export function IntroSection({ signLanguageEnabled }: IntroSectionProps) {
  return (
    <section id="intro" className="py-[60px] lg:py-[100px] border-b border-[#eee] relative">
      <div className="max-w-[1200px] mx-auto px-5 relative z-[2]">
        {/* 섹션 헤더 */}
        <div className="mb-[50px] text-left">
          <h2 className="text-[1.625rem] lg:text-[2.25rem] font-extrabold text-[#1a1a1a] mb-4 tracking-tight">
            어떤 서비스인가요?
          </h2>
          <p className="text-lg text-[#4a4a4a] max-w-[800px] leading-relaxed">
            장애인 환자분이 병원 예약부터 귀가하실 때까지 겪는 이동, 의사소통, 행정 절차의 어려움을 덜어드립니다.
            수어통역사를 포함한 전담 인력이 1:1 맞춤형 서비스를 제공합니다.
          </p>

          {/* 수어 영상 */}
          <div
            className={`sign-lang-container ${
              signLanguageEnabled ? "visible" : ""
            }`}
          >
            <div className="sign-video-placeholder">
              <div className="sign-content">
                <span className="sign-emoji">
                  <SignLanguageIcon />
                </span>
                <iframe
                  src="https://www.youtube.com/embed/ArvQ4IZTbq8?si=x22JycVyHbd2JNmV&mute=1"
                  title="사업 소개 수어 해설 영상"
                  frameBorder="0"
                  allowFullScreen
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 대상자 안내 */}
        <div className="intro-box mb-[60px] bg-white rounded-[20px] p-6 lg:p-10 border border-[#eee] shadow-[0_5px_20px_rgba(0,0,0,0.03)]">
          <h3 className="intro-sub-title text-xl lg:text-2xl font-extrabold mb-6 text-[#333] flex items-center gap-2.5">
            <span className="block w-1.5 h-6 bg-[#004c28] rounded"></span>
            누가 이용할 수 있나요?
          </h3>
          <p className="intro-text text-lg text-[#4a4a4a] mb-5">
            병원 이용에 도움이 필요한 등록 장애인 누구나 신청 가능하며,
            <br className="hidden lg:block" />
            아래의 경우 우선적으로 지원해 드립니다.
          </p>
          <ul className="target-list flex flex-col lg:flex-row gap-4 lg:gap-5 mt-5">
            {targetList.map((item, index) => (
              <li
                key={index}
                className="target-item flex-1 min-w-[250px] bg-[#f5f7f9] p-6 rounded-xl flex items-center gap-4 font-semibold text-lg text-[#333]"
              >
                <div className="target-icon w-[70px] h-[70px] text-2xl bg-white rounded-full flex items-center justify-center text-[#004c28] shadow-[0_2px_5px_rgba(0,0,0,0.05)] flex-shrink-0">
                  <i className={item.icon} aria-hidden="true"></i>
                </div>
                <p>
                  {item.title}
                  <br />
                  {item.subtitle}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 지원 서비스 안내 */}
        <div className="intro-box mb-[60px] bg-white rounded-[20px] p-6 lg:p-10 border border-[#eee] shadow-[0_5px_20px_rgba(0,0,0,0.03)]">
          <h3 className="intro-sub-title text-xl lg:text-2xl font-extrabold mb-6 text-[#333] flex items-center gap-2.5">
            <span className="block w-1.5 h-6 bg-[#004c28] rounded"></span>
            어떤 도움을 받을 수 있나요?
          </h3>
          <div className="support-grid grid grid-cols-1 lg:grid-cols-2 gap-5">
            {supportServices.map((service, index) => (
              <div
                key={index}
                className="support-card bg-white border border-[#eee] p-8 rounded-2xl transition-all hover:translate-y-[-5px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:border-[#004c28]"
              >
                <h4 className="text-xl lg:text-[1.375rem] mb-3 text-[#004c28] font-extrabold flex items-center gap-2.5">
                  {service.useSignIcon ? (
                    <span className="text-2xl">
                      <SignLanguageIcon />
                    </span>
                  ) : (
                    <i className={service.icon} aria-hidden="true"></i>
                  )}
                  {service.title}
                </h4>
                <p className="intro-text text-[1.0625rem] text-[#555] leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
