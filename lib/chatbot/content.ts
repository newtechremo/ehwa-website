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

// 문구·구성은 실제 채널톡 동작 영상 실측 기준.
// 기획서(Excel)와 다르며, 실제 운영본이 기준이다.
export const WELCOME_MESSAGE =
  "환자분과 보호자분의 든든한 동행,\n" +
  "이대목동병원 편의지원 매니저입니다. 😊\n" +
  "무엇을 도와드릴까요?\n\n" +
  "⏰ **편의지원 서비스 운영 시간**\n" +
  "- 평일: 9:00 - 17:00\n" +
  "- 점심시간 : 12:00-13:00\n" +
  "- 휴무 : 토요일, 일요일, 공휴일"

export const INPUT_PLACEHOLDER = "궁금한 내용을 입력해주세요 (예 : 서비스 이용일 변경)"

/** 병원 대표번호 — 편의지원 범위를 벗어난 민원·행정 문의를 넘길 곳 */
export const HOSPITAL_TEL = "1666-5000"

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
  {
    id: "form",
    type: "link",
    label: "신청서 서식 다운로드",
    value:
      "https://drive.google.com/file/d/1rxBymUZiOXcgEAcbpFApPdkeD56fjGGd/view?usp=sharing",
    hint: "사전문진표 PDF",
  },
  {
    id: "hospitalTel",
    type: "tel",
    label: `병원 대표번호 ${HOSPITAL_TEL}`,
    value: HOSPITAL_TEL,
  },
]

// ─────────────────────────────────────────────────────────
// 버튼형 시나리오
// ─────────────────────────────────────────────────────────
/**
 * 실제 채널톡 동작(동영상 자산 기준) 을 따른다.
 * Excel 기획서에는 "모든 답변에 '이전 단계로' 버튼 추가"로 적혀 있으나,
 * 실제 구현된 챗봇은 종료형 답변에 "처음으로 / 질문하기"만 노출하고
 * 신청 흐름처럼 단계가 있는 곳에서만 "이전으로"를 보여준다.
 * 기획서는 계획, 영상은 실제이므로 실제를 기준으로 맞춘다.
 */
/** 종료형 답변 하단 (지원범위·이용대상·비용안내 등) */
const END_BUTTONS = [
  { label: "처음으로", goTo: "root" },
  { label: "질문하기", goTo: "ask" },
]

/** 단계가 있는 흐름 (신청 방법 하위 등) */
const STEP_BUTTONS = [
  { label: "이전으로", goTo: "__back__" },
  { label: "처음으로", goTo: "root" },
  { label: "질문하기", goTo: "ask" },
]

export const BACK_NODE_ID = "__back__"
export const ROOT_NODE_ID = "root"

// 답변 문구는 원본 Excel의 「A (출력 답변)」을 그대로 사용한다.
// 랜딩페이지 카피로 임의 재작성하지 않는다 — 챗봇 문구는 별도로 검수된 자산이다.
export const NODES: ChatNode[] = [
  {
    id: "root",
    message: WELCOME_MESSAGE,
    buttons: [
      { label: "지원 범위", goTo: "scope" },
      { label: "이용 대상", goTo: "target" },
      { label: "신청 방법", goTo: "apply" },
      { label: "비용안내", goTo: "cost" },
      { label: "운영 시간 & 위치", goTo: "hours" },
      { label: "질문하기", goTo: "ask" },
    ],
  },
  {
    id: "scope",
    message:
      "상담을 통해 꼭 필요한 서비스를 무료로 맞춤 지원해 드립니다.\n\n" +
      "✅ **지원 가능 항목**\n" +
      "**1. 이동·동행**\n원내 이동 시 전담 직원이 동행합니다. 휠체어 보조, 환복, 검사 자세 유지 등을 도와드립니다\n\n" +
      "**2. 의사소통**\n전문 수어통역사가 진료 전 과정을 함께하며, 필담 및 그림판(AAC) 등으로 의료진과 편하게 대화하도록 돕습니다\n\n" +
      "**3. 행정·진료**\n키오스크 사용이 어렵거나 복잡한 서류 작성이 필요할 때 곁에서 도와드리고, 장애 특성을 고려해 진료 일정을 조정합니다\n\n" +
      "❌ **지원 불가 항목**\n입원 간병, 원외 이동은 지원이 불가합니다",
    buttons: END_BUTTONS,
  },
  {
    id: "target",
    message:
      "병원 이용에 도움이 필요한 '등록 장애인'이라면 누구나 가능합니다.\n\n" +
      "🌟 **우선 지원 대상**\n" +
      "• 이대목동병원이 처음이신 분\n" +
      "• 장애 정도가 중증인 분\n" +
      "• 보호자 없이 혼자 오신 분",
    buttons: END_BUTTONS,
  },
  {
    id: "apply",
    message:
      "편하신 방법으로 신청해 주세요. (진료 3일 전 권장)\n" +
      "신청 시 '환자 정보'와 '진료 예약일'을 알려주셔야 합니다.",
    actionIds: ["walla"],
    buttons: [
      { label: "다른 방법으로 신청", goTo: "apply_other" },
      ...END_BUTTONS,
    ],
  },
  {
    id: "apply_other",
    message: "아래 방법 중 편하신 방법을 선택해주세요.",
    buttons: [
      { label: "카카오톡", goTo: "apply_kakao" },
      { label: "전화", goTo: "apply_tel" },
      { label: "메일", goTo: "apply_mail" },
      { label: "병원 방문", goTo: "apply_visit" },
      ...STEP_BUTTONS,
    ],
  },
  {
    id: "apply_kakao",
    message: "카카오톡 채널에서 담당직원과 1:1 채팅상담이 가능합니다.",
    actionIds: ["kakao"],
    buttons: STEP_BUTTONS,
  },
  {
    id: "apply_tel",
    message:
      // 문구는 원본 그대로. 사이트 카피(OPERATING_HOURS)와 표기가 달라 상수를 쓰지 않는다.
      "장애편의지원팀 공식 연락처입니다.\n\n" +
      "**운영 시간**\n평일 09:00 ~ 17:00 (점심 12~13시 제외)\n\n" +
      "아래 버튼을 누르면 바로 전화가 연결됩니다.",
    actionIds: ["tel"],
    buttons: STEP_BUTTONS,
  },
  {
    id: "apply_mail",
    message:
      "신청서를 작성하여 아래 메일로 보내주세요.\n" +
      `📧 장애편의지원팀 : ${SUPPORT_EMAIL}`,
    actionIds: ["form", "email"],
    buttons: STEP_BUTTONS,
  },
  {
    id: "apply_visit",
    message: "이대목동병원 본관 1층 접수창구로 오시면 직접 상담 및 신청이 가능합니다.",
    buttons: STEP_BUTTONS,
  },
  {
    id: "cost",
    message:
      "장애인 편의지원 서비스는 국가 사업으로 전액 무료입니다.\n" +
      "(단, 병원 진료비, 검사비, 약값 등은 환자분 부담입니다.)",
    buttons: END_BUTTONS,
  },
  {
    id: "hours",
    message: "🕒 운영 시간은 평일 09:00 ~ 17:00 입니다.",
    buttons: [{ label: "오시는 길", goTo: "directions" }, ...END_BUTTONS],
  },
  {
    id: "directions",
    message:
      // 원본의 "약도 이미지 첨부 예정"은 기획 메모이므로 이용자에게 노출하지 않는다.
      "**주소**: 서울 양천구 안양천로 1071\n\n" +
      "🚇 **지하철** : 신목동역 3번 출구 도보 15분\n" +
      "🚌 **버스** : 674번, 571번, 603번, 6620번, 6624번, 6627번, 6637번, 양천01번, 양천02번, 700번",
    buttons: STEP_BUTTONS,
  },
  {
    id: "ask",
    message:
      "궁금하신 내용을 아래 입력창에 자유롭게 적어주세요.\n" +
      "제가 아는 내용이면 바로 알려드리고, 확인이 필요한 내용이면 담당자에게 연결해 드릴게요.",
    buttons: [
      { label: "이전으로", goTo: "__back__" },
      { label: "처음으로", goTo: "root" },
    ],
  },
]

// ─────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────
/**
 * 실제 서비스에 쓰는 FAQ 목록 = 채널톡 업로드본 44건 그대로.
 *
 * 이전에는 랜딩페이지 카피 기준 수기 항목 8건을 뒤에 붙였다. "원본과 겹치지 않는
 * 주제만"이라는 의도였지만 실제로는 7건이 원본 FAQ/KB와 겹쳤고, 넓은 키워드
 * (어디·위치·서류·행정 등) 때문에 원본보다 먼저 엉뚱한 질문을 가로챘다.
 * 실측(2026-08-23 77문항 QA): "진단서 발급받으려면 어디로 가요?" → 센터 위치 FAQ,
 * "보험사에 낼 서류" → 일반 행정 FAQ. 둘 다 KB에 정확한 문서(54, 29)가 있다.
 *
 * FAQ가 확실하지 않으면 서버의 KB 직답/LLM 으로 넘기는 편이 안전하다.
 * 수기 별칭은 다시 만들지 않는다. 표현 변형은 KB 검색과 LLM이 흡수한다.
 */
export const FAQS: ChatFaq[] = GENERATED_FAQS

// ─────────────────────────────────────────────────────────
// 정책 차단 — AI 이전 단계에서 코드로 걸러낸다 (프롬프트는 2차 방어선)
// ─────────────────────────────────────────────────────────
export const POLICIES: ChatPolicy[] = [
  {
    id: "policy-medical",
    label: "의료 진단·처방",
    keywords: [
      // "진단"만 두면 "진단서 발급"(문서 54 안내 대상)까지 잡힌다.
      // 의학적 판단을 묻는 표현으로 좁힌다.
      "증상", "진단이", "진단을", "진단 좀", "처방", "무슨 병", "병명", "치료법", "약 먹어도",
      "수술", "항암", "입원해야", "낫나요", "위험한가",
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
      // "진단서 발급"(문서 54), "비급여 진료비용"(문서 56)은 KB에 안내 문서가 있으므로
      // 정책으로 막지 않는다. 실제 비용 판단·보험 처리만 범위 밖으로 본다.
      "실비", "보험 적용", "보험청구", "보험 청구", "진료비", "병원비", "치료비",
      "산정특례", "환급", "보험금",
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

/**
 * AI 가 "몰라서"가 아니라 "일시적으로 못 써서"(일일 한도·예산 DB·모델 장애) 내려가는 경우의 문구.
 * 기존에는 이때도 "추측해서 답변드리지 않을게요"가 나가 이용자가 챗봇이 고장났다고
 * 오해했다(2026-08-24 실사용 지적). 버튼·FAQ 는 계속 동작한다는 안내를 함께 준다.
 */
export const FALLBACK_ANSWER_TEMPORARY =
  "지금은 문의가 많아 AI 상세 답변이 잠시 어려워요. 🙏\n" +
  "아래 버튼 메뉴에서 주요 안내를 바로 보실 수 있고,\n" +
  "급하신 내용은 편의지원팀으로 문의해 주세요."


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
