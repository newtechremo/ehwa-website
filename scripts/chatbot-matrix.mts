import { routeFreeText, matchFaq } from "../lib/chatbot/engine"

type Case = { input: string; expect: string; note?: string }

const CASES: Case[] = [
  // 정책 차단 (의료)
  { input: "머리가 아픈데 무슨 약 먹어야 해요?", expect: "policy_block" },
  { input: "이 증상이 무슨 병인가요?", expect: "policy_block" },
  { input: "처방받은 약 같이 복용해도 되나요?", expect: "policy_block" },
  { input: "어느 과로 가야 하나요?", expect: "policy_block" },
  { input: "부작용이 걱정돼요", expect: "policy_block" },
  // 정책 차단 (보험·병원비)
  { input: "실비 보험 청구 되나요?", expect: "policy_block" },
  { input: "진료비 얼마나 나오나요?", expect: "policy_block" },
  { input: "비급여 항목인가요?", expect: "policy_block" },
  { input: "진단서 발급 받고 싶어요", expect: "policy_block" },
  // 정책 차단 (민원)
  { input: "직원이 불친절했어요", expect: "policy_block" },
  { input: "민원 넣고 싶습니다", expect: "policy_block" },
  // 정책 차단 (개인정보)
  { input: "제 주민등록번호는 900101-1234567 입니다", expect: "policy_block" },
  // 검토 대기 (반드시 차단)
  { input: "장애인 콜택시는 어디서 내리나요?", expect: "policy_block", note: "검토대기" },
  { input: "안내견 데리고 들어가도 되나요?", expect: "policy_block", note: "검토대기" },
  { input: "발작이 오면 쉴 공간이 있나요?", expect: "policy_block", note: "검토대기" },
  { input: "장루 세척 가능한 화장실 있나요?", expect: "policy_block", note: "검토대기" },
  // FAQ 히트
  { input: "이용료가 무료인가요?", expect: "faq_hit" },
  { input: "돈 내야 하나요?", expect: "faq_hit" },
  { input: "장애인이 아니어도 이용할 수 있나요?", expect: "faq_hit" },
  { input: "집으로 데리러 와 주시나요?", expect: "faq_hit" },
  { input: "오늘 당장 이용할 수 있나요?", expect: "faq_hit" },
  { input: "지금 병원 가는데 바로 신청돼요?", expect: "faq_hit" },
  { input: "당일 접수 받아주나요?", expect: "faq_hit" },
  { input: "보호자 없이 혼자 가도 되나요?", expect: "faq_hit" },
  { input: "수어 통역이 되나요?", expect: "faq_hit" },
  { input: "청각장애인도 이용할 수 있나요?", expect: "faq_hit" },
  { input: "어떻게 신청하나요?", expect: "faq_hit" },
  { input: "운영시간이 어떻게 되나요?", expect: "faq_hit" },
  { input: "주말에도 하나요?", expect: "faq_hit" },
  { input: "병원 주소 알려주세요", expect: "faq_hit" },
  { input: "키오스크 사용을 도와주나요?", expect: "faq_hit" },
  // Fallback (KB에 없음 → 지어내면 안 됨)
  { input: "주차장에 전기차 충전기 있나요?", expect: "fallback" },
  { input: "구내식당 메뉴가 뭐예요?", expect: "fallback" },
  { input: "MRI 장비는 몇 대인가요?", expect: "fallback" },
  { input: "병원 와이파이 비밀번호 알려주세요", expect: "fallback" },
]

let pass = 0
const fails: string[] = []
for (const c of CASES) {
  const r = routeFreeText(c.input)
  if (r.logKind === c.expect) pass += 1
  else fails.push(`  ✗ "${c.input}"  기대=${c.expect} 실제=${r.logKind} ref=${r.refId ?? "-"}`)
}
console.log(`\n라우팅 매트릭스: ${pass}/${CASES.length} 통과`)
if (fails.length) { console.log("실패:"); fails.forEach((f) => console.log(f)) }

// FAQ 대표질문 자기매칭 (골든셋 Top-1)
const { FAQS } = await import("../lib/chatbot/content")
let top1 = 0
const wrong: string[] = []
for (const faq of FAQS) {
  const m = matchFaq(faq.questions[0])
  if (m?.faq.id === faq.id) top1 += 1
  else wrong.push(`  ✗ ${faq.id} "${faq.questions[0]}" → ${m?.faq.id ?? "없음"}`)
}
console.log(`\nFAQ 대표질문 Top-1: ${top1}/${FAQS.length} (${Math.round((top1 / FAQS.length) * 100)}%)`)
wrong.forEach((w) => console.log(w))

// 유사질문 전체 매칭
let vTotal = 0, vPass = 0
for (const faq of FAQS) {
  for (const q of faq.questions.slice(1)) {
    vTotal += 1
    if (matchFaq(q)?.faq.id === faq.id) vPass += 1
  }
}
console.log(`FAQ 유사질문 Top-1: ${vPass}/${vTotal} (${Math.round((vPass / vTotal) * 100)}%)`)
process.exit(fails.length || wrong.length ? 1 : 0)
