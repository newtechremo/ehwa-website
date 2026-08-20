/**
 * KB 검색 골든셋 평가.
 * 각 문서의 예상 질문(총 187개)을 넣어 자기 문서를 되찾는지 측정한다.
 * 실행: npm run kb:eval
 */
import { loadKb, rankKb, KB_DIRECT_THRESHOLD } from "../lib/chatbot/kb"

const docs = await loadKb()
console.log("  KB 문서:", docs.length)
if (!docs.length) {
  console.error("  KB가 비어 있습니다. npm run kb:ingest 를 먼저 실행하세요.")
  process.exit(1)
}

let total = 0, top1 = 0, top3 = 0, aboveDirect = 0
const scores: number[] = []
const miss: string[] = []

for (const d of docs) {
  for (const q of d.questions) {
    if (/^\(?\s*예상\s*질문\s*없음/.test(q)) continue
    total += 1
    const hits = rankKb(q, docs, 3)
    const s = hits[0]?.score ?? 0
    scores.push(s)
    if (hits[0]?.doc.id === d.id) {
      top1 += 1
      if (s >= KB_DIRECT_THRESHOLD) aboveDirect += 1
    } else {
      miss.push(`  ✗ [${d.seq}] "${q.slice(0, 32)}" → ${hits[0]?.doc.seq}(${s.toFixed(2)})`)
    }
    if (hits.some((h) => h.doc.id === d.id)) top3 += 1
  }
}

const pct = (n: number) => Math.round((n / total) * 100)
console.log(`  예상질문 총 ${total}개`)
console.log(`  Top-1 정확도 : ${top1}/${total} (${pct(top1)}%)`)
console.log(`  Top-3 정확도 : ${top3}/${total} (${pct(top3)}%)`)
console.log(`  임계값(${KB_DIRECT_THRESHOLD}) 이상으로 직답 가능: ${aboveDirect}/${total} (${pct(aboveDirect)}%)`)

scores.sort((a, b) => a - b)
const p = (x: number) => scores[Math.min(scores.length - 1, Math.floor(scores.length * x))].toFixed(2)
console.log(`  1위 점수 분포 : p10=${p(0.1)} p25=${p(0.25)} 중앙=${p(0.5)} p90=${p(0.9)}`)

miss.slice(0, 6).forEach((m) => console.log(m))
if (miss.length > 6) console.log(`  … 외 ${miss.length - 6}건`)

const TARGET = 85
console.log(`\n  목표 Top-1 ${TARGET}% — ${pct(top1) >= TARGET ? "달성" : "미달"}`)
process.exit(pct(top1) >= TARGET ? 0 : 1)
