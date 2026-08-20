import type { ChatAction, ChatFaq, ChatNode, ChatPolicy } from "./types"
import { GENERATED_FAQS } from "./faqs.generated"

// 챗봇 콘텐츠 원본.
// Phase A에서는 타입 검사와 git 버전관리를 받도록 코드로 둔다.
// Phase C(관리자 CRUD)에서 동일 스키마로 Supabase에 이관하며, 엔진은 데이터 출처만 바뀐다.
//
// 문구 출처: 랜딩페이지 실제 카피(IntroSection·StepsSection·ContactSection·FaqSection)와
// 인수인계 문서 `docs/자체구축_챗봇_현행구조_및_사용자시나리오 (1).md`.
// 근거 없는 내용은 넣지 않는다. 확인되지 않은 항목은 REVIEW_TOPICS로 차단한다.

export const BOT_NAME = "편의지원 매니저"
export const BOT_ORG = "이대목동병원 장애인 이용편의 지원센터"
export const BRAND_COLOR = "#004c28"

export const WELCOME_MESSAGE =
  "환자분과 보호자분의 든든한 동행, 이대목동병원 편의지원 매니저입니다. 😊\n" +
  "궁금하신 내용을 아래에서 골라주세요. 직접 물어보셔도 좋아요."

export const OPERATING_HOURS = "평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00)"
export const SUPPORT_TEL = "02-2650-5586"
export const SUPPORT_EMAIL = "eumc.barrierfree@gmail.com"
export const HOSPITAL_ADDRESS = "서울특별시 양천구 안양천로 1071"

// ─────────────────────────────────────────────────────────
// 외부 연결 액션 — URL·전화번호는 여기서만 관리한다 (하드코딩 금지 원칙)
// ─────────────────────────────────────────────────────────
export const ACTIONS: ChatAction[] = [
  {
    id: "walla",
    type: "walla",
    label: "온라인 신청서 작성하기",
    value: "https://walla.my/a/barrierfree_v",
    hint: "신청서 작성에는 약 3분이 걸려요.",
  },
  {
    id: "kakao",
    type: "kakao",
    label: "카카오톡으로 상담하기",
    value: "https://pf.kakao.com/_LKhxkn/chat",
  },
  {
    id: "tel",
    type: "tel",
    label: `전화 걸기 ${SUPPORT_TEL}`,
    value: SUPPORT_TEL,
    hint: OPERATING_HOURS,
  },
  {
    id: "email",
    type: "email",
    label: "이메일 보내기",
    value: SUPPORT_EMAIL,
  },
]

// ─────────────────────────────────────────────────────────
// 버튼형 시나리오
// ─────────────────────────────────────────────────────────
const BACK_BUTTONS = [
  { label: "처음으로", goTo: "root" },
  { label: "질문하기", goTo: "ask" },
]

export const ROOT_NODE_ID = "root"

export const NODES: ChatNode[] = [
  {
    id: "root",
    message: WELCOME_MESSAGE,
    buttons: [
      { label: "지원 범위", goTo: "scope" },
      { label: "이용 대상", goTo: "target" },
      { label: "신청 방법", goTo: "apply" },
      { label: "비용 안내", goTo: "cost" },
      { label: "운영 시간 & 위치", goTo: "hours" },
      { label: "질문하기", goTo: "ask" },
    ],
  },
  {
    id: "scope",
    message:
      "병원 예약부터 진료, 귀가까지 병원 이용 전 과정에서 필요한 도움을 드려요.\n\n" +
      "🚶 **이동 · 동행 지원**\n혼자 이동하기 어려울 때 동행합니다. 휠체어 이용, 환복, 검사 중 자세 유지 등 신체 활동을 지원해요.\n\n" +
      "🤟 **의사소통 지원**\n수어통역이 필요할 때 원내 전담 수어통역사가 전 진료 과정을 함께합니다. 글자판(필담), 그림판(AAC) 등도 활용해요.\n\n" +
      "📝 **행정절차 지원**\n서류작성, 키오스크(무인기기) 등 복잡한 행정절차를 도와드려요. 필요하면 지역사회 복지자원과 연결해 드립니다.\n\n" +
      "🩺 **맞춤형 진료 지원**\n장애 유형과 정도, 이동 동선을 고려해 진료 일정과 대기 절차를 조정해요. 진료 후 복약 지도와 다음 내원 절차도 안내해 드립니다.\n\n" +
      "다만 **집에서 병원까지의 이동은 지원하지 않아요.** 병원에 도착하신 뒤부터 직원이 마중 나가 도와드립니다.",
    buttons: BACK_BUTTONS,
  },
  {
    id: "target",
    message:
      "등록 장애인 환자분을 위한 서비스예요. 그중에서도 아래 세 가지 경우를 우선 지원해 드립니다.\n\n" +
      "🏥 이대목동병원을 처음 방문하는 **초진 환자**\n" +
      "♿ 장애 정도가 심한 **중증 장애인**\n" +
      "🚶 **보호자 없이 혼자** 방문하는 분\n\n" +
      "장애인 등록이 안 되어 있더라도 도움이 꼭 필요한 상황이라면, 센터로 전화 주시면 상담 후 안내해 드릴게요.",
    actionIds: ["tel"],
    buttons: BACK_BUTTONS,
  },
  {
    id: "apply",
    message:
      "신청은 어렵지 않아요. 진행은 이렇게 이어집니다.\n\n" +
      "**STEP 01 서비스 신청** — 편의지원 서비스를 신청합니다.\n" +
      "**STEP 02 사전 상담** — 상담을 통해 필요한 도움을 확인하고 서비스 예약을 확정합니다.\n" +
      "**STEP 03 병원 내원** — 요청하신 서비스와 함께 진료를 받습니다.\n" +
      "**STEP 04 귀가 지원** — 진료 후 복약지도 및 다음 서비스 예약을 도와드립니다.\n\n" +
      "신청하실 때 **환자 정보와 진료 예약일**을 함께 알려주시면 더 빠르게 안내해 드릴 수 있어요.\n" +
      "가급적 **진료 3일 전**에 미리 신청해 주세요.",
    actionIds: ["walla"],
    buttons: [
      { label: "다른 방법으로 신청", goTo: "apply_other" },
      { label: "처음으로", goTo: "root" },
      { label: "질문하기", goTo: "ask" },
    ],
  },
  {
    id: "apply_other",
    message:
      "편하신 방법으로 연락해 주시면 됩니다. 어떤 방법이든 동일하게 신청하실 수 있어요.\n\n" +
      `📞 **전화** ${SUPPORT_TEL} (${OPERATING_HOURS})\n` +
      "💛 **카카오톡** 편의지원팀 채널로 상담\n" +
      `✉️ **이메일** ${SUPPORT_EMAIL}\n` +
      `🏥 **병원 방문** ${HOSPITAL_ADDRESS}`,
    actionIds: ["tel", "kakao", "email"],
    buttons: BACK_BUTTONS,
  },
  {
    id: "cost",
    message:
      "네, **편의지원 서비스는 모두 무료**입니다. 😊\n\n" +
      "이동 동행, 수어 통역, 행정절차 지원 등 지원 서비스에는 비용이 들지 않아요.\n" +
      "다만 **진료비, 검사비, 약값은 본인 부담**이라는 점만 참고해 주세요.",
    buttons: BACK_BUTTONS,
  },
  {
    id: "hours",
    message:
      `🕘 **운영시간**\n${OPERATING_HOURS}\n\n` +
      `📍 **위치**\n${BOT_ORG}\n${HOSPITAL_ADDRESS}\n\n` +
      `문의는 ${SUPPORT_TEL} 로 주시면 됩니다.`,
    actionIds: ["tel"],
    buttons: BACK_BUTTONS,
  },
  {
    id: "ask",
    message:
      "궁금하신 내용을 아래 입력창에 자유롭게 적어주세요.\n" +
      "제가 아는 내용이면 바로 알려드리고, 확인이 필요한 내용이면 담당자에게 연결해 드릴게요.",
    buttons: [{ label: "처음으로", goTo: "root" }],
  },
]

// ─────────────────────────────────────────────────────────
// FAQ — 랜딩페이지 FaqSection 5건 + 인수인계 문서에 명시된 유사질문
// (원본 44건은 faq_upload_template Excel 수령 후 확장)
// ─────────────────────────────────────────────────────────
/**
 * 랜딩페이지(FaqSection) 카피 기준 보완 항목.
 * 원본 44건이 다루지 않거나 표현이 다른 주제만 남긴다.
 * 원본과 주제가 겹치면 원본이 더 상세하므로 여기서 제거한다.
 */
const MANUAL_FAQS: ChatFaq[] = [
  {
    id: "faq-cost-free",
    category: "비용문의",
    // "이용 요금이 얼마인가요?"는 "주차 요금 얼마인가요"까지 끌어당겨 제외했다.
    // 주차비는 원본 faq-36, 서비스 비용 일반은 KB [16]이 담당한다.
    questions: [
      "이용료가 무료인가요?",
      "돈 내야 하나요?",
      "편의지원 서비스도 유료인가요?",
    ],
    // "요금·얼마·비용·돈"은 주차비·진료비 문의에도 그대로 걸려 오답을 만든다
    // (실측: "주차 요금 얼마인가요" → 서비스 무료 안내). 서비스 비용 고유어만 남긴다.
    keywords: ["무료", "이용료", "유료"],
    answer:
      "네, 이동 동행이나 수어 통역 등 **지원 서비스는 무료**입니다.\n" +
      "다만 진료비, 검사비, 약값은 본인이 내셔야 해요.",
  },
  {
    id: "faq-eligibility",
    category: "자격문의",
    questions: [
      "장애인이 아니어도 이용할 수 있나요?",
      "장애 등록이 안 되어 있는데 가능한가요?",
      "누구나 이용할 수 있나요?",
      "이용 대상이 어떻게 되나요?",
    ],
    keywords: ["장애인", "대상", "자격", "등록", "누구나", "이용할 수"],
    answer:
      "원칙적으로는 **등록 장애인 환자**를 위한 서비스예요.\n" +
      "하지만 도움이 꼭 필요하신 상황이라면, 센터로 전화 주시면 상담 후 안내해 드리겠습니다.",
    actionIds: ["tel"],
  },
  {
    id: "faq-pickup",
    category: "동행범위",
    questions: [
      "집으로 데리러 와 주시나요?",
      "집에서 병원까지 데려다주나요?",
      "픽업 되나요?",
      "병원 밖에서도 동행해 주나요?",
    ],
    keywords: ["집", "픽업", "데리러", "데려다", "병원 밖", "외부 이동"],
    answer:
      "아니요, **집에서 병원까지의 이동은 지원하지 않습니다.**\n" +
      "병원에 도착하시면 그때부터 직원이 마중 나가서 진료를 돕습니다.",
  },
  {
    id: "faq-alone",
    category: "보호자",
    questions: [
      "보호자 없이 혼자 가도 되나요?",
      "혼자 병원에 가도 괜찮을까요?",
      "보호자가 꼭 있어야 하나요?",
    ],
    keywords: ["보호자", "혼자", "동반"],
    answer:
      "네, 걱정하지 마세요. 😊\n" +
      "전문 교육을 받은 직원이 보호자를 대신하여 **진료실 이동부터 수납, 약국 이용까지** 곁에서 돕습니다.",
  },
  {
    id: "faq-signlanguage",
    category: "의사소통",
    questions: [
      "수어 통역이 되나요?",
      "수어통역사가 있나요?",
      "청각장애인도 이용할 수 있나요?",
      "필담이나 그림판으로 소통할 수 있나요?",
    ],
    keywords: ["수어", "통역", "청각", "필담", "글자판", "그림판", "소통"],
    answer:
      "네, **원내 전담 수어통역사**가 전 진료 과정을 함께합니다.\n" +
      "글자판(필담), 그림판(AAC) 등 다양한 의사소통 방식도 활용해요.",
  },
  {
    id: "faq-hours",
    category: "운영",
    questions: [
      "운영시간이 어떻게 되나요?",
      "몇 시까지 하나요?",
      "주말에도 하나요?",
      "언제 전화하면 되나요?",
    ],
    keywords: ["운영시간", "몇 시", "주말", "토요일", "일요일", "점심"],
    answer: `편의지원팀은 **${OPERATING_HOURS}** 운영합니다.\n주말과 공휴일은 운영하지 않아요.`,
    actionIds: ["tel"],
  },
  {
    id: "faq-location",
    category: "위치",
    questions: [
      "센터 위치가 어디인가요?",
      "병원 주소 알려주세요",
      "어디로 가면 되나요?",
    ],
    keywords: ["위치", "주소", "어디", "찾아가"],
    answer: `${BOT_ORG}\n📍 ${HOSPITAL_ADDRESS}\n\n자세한 원내 위치는 전화로 안내해 드릴게요.`,
    actionIds: ["tel"],
  },
  {
    id: "faq-admin-help",
    category: "행정지원",
    questions: [
      "서류 작성도 도와주나요?",
      "키오스크 사용을 도와주나요?",
      "수납이나 접수도 같이 해주나요?",
      "약 대리수령이 되나요?",
    ],
    keywords: ["서류", "키오스크", "수납", "접수", "대필", "대독", "대리수령", "행정"],
    answer:
      "네, **서류작성과 키오스크(무인기기) 이용 등 복잡한 행정절차**를 도와드립니다.\n" +
      "진료실 이동부터 수납, 약국 이용까지 곁에서 지원해요.\n" +
      "개별 상황에 따라 가능한 범위가 다를 수 있어 자세한 내용은 담당자와 확인해 주세요.",
    actionIds: ["tel"],
  },
]

/**
 * 실제 서비스에 쓰는 FAQ 목록.
 * 채널톡 업로드본 44건(생성)이 기준이고, 수기 항목은 뒤에 붙여 보완 역할만 한다.
 * 매칭 점수가 동점이면 앞선 항목이 이기므로 원본이 우선한다.
 */
export const FAQS: ChatFaq[] = [...GENERATED_FAQS, ...MANUAL_FAQS]

// ─────────────────────────────────────────────────────────
// 정책 차단 — AI 이전 단계에서 코드로 걸러낸다 (프롬프트는 2차 방어선)
// ─────────────────────────────────────────────────────────
export const POLICIES: ChatPolicy[] = [
  {
    id: "policy-medical",
    label: "의료 진단·처방",
    keywords: [
      "증상", "진단", "처방", "무슨 병", "병명", "치료법", "수술해야", "약 먹어도",
      "복용해도", "먹어도 되", "아픈데", "아파요", "통증", "열이 나", "부작용",
      "어느 과로 가야", "무슨 과",
    ],
    answer:
      "죄송해요, 저는 병원 이용을 돕는 안내 챗봇이라 **증상이나 치료에 대한 의학적 판단은 도와드리기 어려워요.**\n" +
      "정확한 내용은 **담당 의료진과 상의**해 주시기 바랍니다.\n" +
      "진료 예약이나 진료과 안내가 필요하시면 병원 대표번호로 문의해 주세요.",
    actionIds: ["tel"],
  },
  {
    id: "policy-billing",
    label: "보험·병원비",
    keywords: [
      // "진료비 얼마"처럼 띄어쓰기를 포함한 구는 조사가 끼면("진료비는 얼마") 빗나간다.
      // 진료비·병원비는 그 자체로 편의지원 범위 밖이므로 단독 낱말로 잡는다.
      "실비", "보험 적용", "보험청구", "보험 청구", "진료비", "병원비", "치료비",
      "급여", "비급여", "산정특례", "영수증", "진단서 발급", "환급",
    ],
    answer:
      "보험 적용 여부나 진료비 같은 의료 행정은 **편의지원 서비스 범위를 벗어나는 내용**이에요.\n" +
      "원무팀이나 병원 대표번호로 문의해 주시면 정확하게 안내받으실 수 있습니다.",
    actionIds: ["tel"],
  },
  {
    id: "policy-complaint",
    label: "민원·불만",
    keywords: ["불친절", "민원", "항의", "컴플레인", "신고하고", "따지고", "화가 나"],
    answer:
      "불편을 드려 정말 죄송합니다. 🙇\n" +
      "말씀하신 내용은 제가 처리해 드리기 어려워, **병원 대표번호로 접수**해 주시면 담당 부서에서 확인해 드립니다.",
    actionIds: ["tel"],
  },
  {
    id: "policy-privacy",
    label: "개인정보",
    // "비밀번호"처럼 일반 문의(예: 와이파이 비밀번호)와 겹치는 낱말은 넣지 않는다.
    // 실제 식별정보 입력은 engine의 PII 패턴 검사로 잡는다.
    keywords: ["주민등록번호", "주민번호", "카드번호", "계좌번호"],
    answer:
      "안전을 위해 **이 채팅창에는 주민등록번호나 결제 정보 같은 개인정보를 입력하지 말아주세요.**\n" +
      "신청에 필요한 정보는 신청서나 전화 상담에서 안전하게 확인해 드립니다.",
    actionIds: ["walla", "tel"],
  },
]

// 공식 답변이 확정되지 않아 AI·FAQ 모두 답하면 안 되는 주제
// (인수인계 문서 10장 "검토 대기 질문")
export const REVIEW_TOPICS: ChatPolicy[] = [
  {
    id: "review-pending",
    label: "검토 대기",
    keywords: [
      "콜택시", "장애인 콜택시", "하차", "발작", "안정 공간", "안내견", "보조견",
      "장루", "장루 세척",
    ],
    answer:
      "말씀하신 내용은 정확한 안내를 위해 **담당자 확인이 필요한 항목**이에요.\n" +
      "잘못된 정보를 드리지 않도록, 편의지원팀으로 문의해 주시면 확인 후 정확히 안내해 드리겠습니다.",
    actionIds: ["tel", "kakao"],
  },
]

export const FALLBACK_ANSWER =
  "제가 확실히 알고 있는 내용이 아니라 **추측해서 답변드리지 않을게요.**\n" +
  "편의지원팀 담당자가 정확히 확인해 드릴 수 있어요. 아래로 문의해 주세요."

export const FALLBACK_ACTION_IDS = ["tel", "kakao"]

export function getAction(id: string): ChatAction | undefined {
  return ACTIONS.find((a) => a.id === id)
}

export function getActions(ids?: string[]) {
  if (!ids) return undefined
  const list = ids.map(getAction).filter((a): a is ChatAction => Boolean(a))
  return list.length ? list : undefined
}

export function getNode(id: string): ChatNode | undefined {
  return NODES.find((n) => n.id === id)
}
