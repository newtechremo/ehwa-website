import { routeFreeText, matchFaq } from "../lib/chatbot/engine"

type Case = { input: string; expect: string; expectRef?: string; note?: string }

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
  // 비급여 "가격 조회"는 KB 문서 56이 안내한다. 정책 차단 대상이 아니다.
  // (보험 처리·진료비 판단만 범위 밖)
  { input: "비급여 항목인가요?", expect: "fallback" },
  // 진단서 "발급 절차"는 KB 문서 54(신청발급 안내)가 답한다.
  // 의학적 판단(진단 자체)만 정책 차단 대상이다.
  { input: "진단서 발급 받고 싶어요", expect: "fallback" },
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
  // FAQ 히트 — 원본 44건이 자기 표현 변형을 잡는 경우. 참조 ID까지 고정한다.
  { input: "집으로 데리러 와 주시나요?", expect: "faq_hit", expectRef: "faq-19" },
  { input: "오늘 당장 이용할 수 있나요?", expect: "faq_hit", expectRef: "faq-04" },
  { input: "지금 병원 가는데 바로 신청돼요?", expect: "faq_hit", expectRef: "faq-04" },
  { input: "당일 접수 받아주나요?", expect: "faq_hit", expectRef: "faq-04" },
  { input: "어떻게 신청하나요?", expect: "faq_hit", expectRef: "faq-03" },
  { input: "운영시간이 어떻게 되나요?", expect: "faq_hit", expectRef: "faq-13" },
  // 서버(KB 직답/LLM)로 넘기는 경우.
  // 2026-08-23 수기 FAQ 8건 제거 + 의문형 잡음 제거 이전에는 FAQ가 답했으나,
  // 그 매칭은 "…할 수 있나요" 같은 어미 겹침이거나 넓은 수기 키워드 때문이었다.
  // KB에 더 정확한 문서가 있으므로 서버로 넘기는 것이 맞다. 서버 답변은 77문항 QA가 검증한다.
  { input: "이용료가 무료인가요?", expect: "fallback", note: "KB 16 비용" },
  { input: "돈 내야 하나요?", expect: "fallback", note: "KB 16 비용" },
  { input: "장애인이 아니어도 이용할 수 있나요?", expect: "fallback", note: "KB 7·8 이용대상/자격" },
  { input: "보호자 없이 혼자 가도 되나요?", expect: "fallback", note: "KB 7·24" },
  { input: "수어 통역이 되나요?", expect: "fallback", note: "KB 26 수어·필담" },
  { input: "청각장애인도 이용할 수 있나요?", expect: "fallback", note: "KB 26" },
  { input: "주말에도 하나요?", expect: "fallback", note: "KB 13 운영시간" },
  { input: "병원 주소 알려주세요", expect: "fallback", note: "KB 12 위치" },
  { input: "키오스크 사용을 도와주나요?", expect: "fallback", note: "KB 28 대필·대독/행정" },
  // FAQ가 가로채면 안 되는 질문 (2026-08-23 77문항 QA에서 발견된 실제 오답)
  // 클라이언트 엔진의 fallback = 서버 KB 직답/LLM 으로 넘긴다는 뜻이다.
  { input: "제가 늦으면 어떻게 되나요?", expect: "fallback", note: "노쇼 FAQ(faq-35) 오분류 금지 — KB 33 지각" },
  { input: "진단서 발급받으려면 어디로 가요?", expect: "fallback", note: "센터 위치 FAQ 오분류 금지 — KB 54" },
  { input: "보험사에 낼 서류 떼는 것도 도와주세요", expect: "fallback", note: "일반 행정 FAQ 오분류 금지 — KB 29" },
  { input: "어디까지 도와주시는 거예요?", expect: "fallback", note: "KB 6/20 지원범위" },
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
  const ok = r.logKind === c.expect && (!c.expectRef || r.refId === c.expectRef)
  if (ok) pass += 1
  else fails.push(`  ✗ "${c.input}"  기대=${c.expect} 실제=${r.logKind} ref=${r.refId ?? "-"}`)
}
console.log(`\n라우팅 매트릭스: ${pass}/${CASES.length} 통과`)
if (fails.length) { console.log("실패:"); fails.forEach((f) => console.log(f)) }

// FAQ 골든셋 — 원본 44건 + 수기 보조를 모두 포함해 전 질문 변형을 검증한다.
// 정책 차단이 FAQ보다 우선하므로, 정책 키워드에 걸리는 질문은 집계에서 제외한다.
const { FAQS } = await import("../lib/chatbot/content")
let top1 = 0, repTotal = 0
const wrong: string[] = []
for (const faq of FAQS) {
  const r = routeFreeText(faq.questions[0])
  if (r.logKind === "policy_block") continue   // 정책이 우선하는 질문은 대상 아님
  repTotal += 1
  const m = matchFaq(faq.questions[0])
  if (m?.faq.id === faq.id) top1 += 1
  else wrong.push(`  ✗ ${faq.id} "${faq.questions[0]}" → ${m?.faq.id ?? "없음"}`)
}
const repPct = Math.round((top1 / repTotal) * 100)
console.log(`\nFAQ 대표질문 Top-1: ${top1}/${repTotal} (${repPct}%)`)
wrong.slice(0, 8).forEach((w) => console.log(w))
if (wrong.length > 8) console.log(`  … 외 ${wrong.length - 8}건`)

// 유사질문 전체 매칭
let vTotal = 0, vPass = 0
const vWrong: string[] = []
for (const faq of FAQS) {
  for (const q of faq.questions.slice(1)) {
    if (routeFreeText(q).logKind === "policy_block") continue
    vTotal += 1
    if (matchFaq(q)?.faq.id === faq.id) vPass += 1
    else vWrong.push(`  ✗ ${faq.id} "${q.slice(0, 34)}" → ${matchFaq(q)?.faq.id ?? "없음"}`)
  }
}
const vPct = Math.round((vPass / vTotal) * 100)
console.log(`FAQ 유사질문 Top-1: ${vPass}/${vTotal} (${vPct}%)`)
vWrong.slice(0, 8).forEach((w) => console.log(w))
if (vWrong.length > 8) console.log(`  … 외 ${vWrong.length - 8}건`)

// 기준선: 원본 44건은 자기 대표·유사 질문을 100% 잡아야 한다.
// 통합구현플랜 7.2의 85%는 최초 목표였고, 2026-08-23 현재 100%이므로
// 여기서 한 건이라도 떨어지면 회귀다. 점수를 맞추려 기준을 낮추지 않는다.
const baselineOk = top1 === repTotal && vPass === vTotal
console.log(`\n기준선(100%) — 대표질문 ${top1 === repTotal ? "유지" : "회귀"} / 유사질문 ${vPass === vTotal ? "유지" : "회귀"}`)
process.exit(fails.length || !baselineOk ? 1 : 0)
