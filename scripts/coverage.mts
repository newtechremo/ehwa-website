/**
 * AI 없이 현재 파이프라인이 실제 답변을 주는 비율 측정.
 * 표본: KB 문서 예상질문 + FAQ 질문 변형 전체 (실제 이용자가 던질 법한 문장)
 */
import { routeFreeText } from "../lib/chatbot/engine"
import { loadKb, rankKb, KB_DIRECT_THRESHOLD } from "../lib/chatbot/kb"
import { FAQS } from "../lib/chatbot/content"

const docs = await loadKb()
const samples: string[] = []
for (const d of docs) for (const q of d.questions) if (!/예상\s*질문\s*없음/.test(q)) samples.push(q)
for (const f of FAQS) samples.push(...f.questions)

const tally: Record<string, number> = {}
for (const q of samples) {
  const r = routeFreeText(q)
  let kind: string = r.logKind
  if (kind === "fallback") {
    const h = rankKb(q, docs, 1)[0]
    kind = h && h.score >= KB_DIRECT_THRESHOLD ? "kb_direct" : "fallback"
  }
  tally[kind] = (tally[kind] ?? 0) + 1
}

const total = samples.length
const answered = total - (tally.fallback ?? 0)
console.log(`  표본 ${total}개 (KB 예상질문 + FAQ 질문 변형)\n`)
const label: Record<string,string> = {
  policy_block: "정책 차단(의료·보험·검토대기)", faq_hit: "FAQ 고정답변",
  kb_direct: "KB 문서 답변", button: "버튼", fallback: "담당자 연결(답변 못함)",
}
for (const [k, v] of Object.entries(tally).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${(label[k] ?? k).padEnd(30)} ${String(v).padStart(4)}건  ${(v/total*100).toFixed(1)}%`)
}
console.log(`\n  → 실제 답변 제공: ${answered}/${total} (${(answered/total*100).toFixed(1)}%)`)
console.log(`  → AI가 필요한 구간: ${tally.fallback ?? 0}건 (${((tally.fallback ?? 0)/total*100).toFixed(1)}%)`)
