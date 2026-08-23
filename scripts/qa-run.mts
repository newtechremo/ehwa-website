/**
 * 채널톡 대체 검증 — 자동 채점.
 *
 * 정답은 KB 원본 문서 번호(tests/qa-set.json)이며 시스템 출력이 아니다.
 * 실행: npm run qa   (로컬 dev 서버가 떠 있어야 한다)
 */
import { readFileSync, writeFileSync } from "fs"

const BASE = process.env.QA_BASE ?? "http://localhost:3112"
const set = JSON.parse(readFileSync("tests/qa-set.json", "utf8"))

type Res = { q: string; expect: unknown; source: string; refId: string; docs: number[]; reason: string; answer: string; pass: boolean }

/** FAQ 업로드본의 faq-NN 번호는 KB 문서 번호와 1:1 로 대응한다 (faq-35 = KB 35 노쇼) */
const faqSeq = (refId: unknown) => Number(String(refId ?? "").match(/^faq-(\d+)$/)?.[1] ?? -1)

const seqOf = (k: string) => Number(String(k).match(/^(\d+)_/)?.[1] ?? -1)

async function ask(q: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // 기본 fetch 타임아웃(약 30초)으로는 KB 전문 호출이 간혹 초과된다
    let d: any = {}
    try {
      const r = await fetch(`${BASE}/api/chatbot/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, sessionId: `qa-${Math.random().toString(36).slice(2)}` }),
        signal: AbortSignal.timeout(90_000),
      })
      d = await r.json().catch(() => ({}))
    } catch {
      await sleep(3000)
      continue
    }
    // 무료 티어 일시 오류는 재시도 (판정을 흐리지 않기 위해)
    if (d?.reason === "model_error") { await sleep(4000); continue }
    return d
  }
  return { source: "fallback", reason: "model_error" }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const results: Res[] = []

async function run(items: any[], kind: "kb" | "policy" | "refuse") {
  for (const it of items) {
    const d = await ask(it.q)
    const docs = (d.docIds ?? []).map(seqOf).filter((n: number) => n > 0)
    // KB 문항 판정: 정답 문서를 인용했거나, 정답 문서에 대응하는 원본 FAQ(faq-NN)가 답했다.
    // 이전에는 source=faq 면 무조건 통과시켰고, 그 틈으로 "늦으면"→노쇼 FAQ,
    // "진단서"→센터위치 FAQ 같은 오답이 11건 중에 숨어 있었다(2026-08-23 발견).
    let pass = false
    let note = ""
    if (kind === "kb") {
      const cited = docs.some((n: number) => it.expect.includes(n))
      const matchedFaq = d.source === "faq" && it.expect.includes(faqSeq(d.refId))
      if (cited || matchedFaq) pass = true
      else if (d.source === "faq") note = `다른 FAQ 응답(${d.refId})`
      else if (d.source === "ai") note = `다른 문서 인용(${docs.join(",")})`
      else note = d.reason ?? d.source
    } else if (kind === "policy") pass = d.source === "policy"
    else pass = d.source === "fallback"
    results.push({ q: it.q, expect: it.expect, source: d.source ?? "?", refId: String(d.refId ?? ""), docs, reason: note || (d.reason ?? ""), answer: (d.answer ?? "").replace(/\n/g, " ").slice(0, 100), pass })
    await sleep(3000) // 무료 키 RPM 한도 회피: 출처 재시도로 호출이 2회가 될 수 있다
  }
}

await run(set.kb, "kb")
await run(set.policy, "policy")
await run(set.outOfScope, "refuse")

const g = (n: number, m: number) => `${n}/${m} (${Math.round((n / m) * 100)}%)`
const kb = results.slice(0, set.kb.length)
const po = results.slice(set.kb.length, set.kb.length + set.policy.length)
const oo = results.slice(set.kb.length + set.policy.length)

console.log("\n══════ 채점 결과 ══════")
const kbCited = kb.filter((r) => r.pass && r.source !== "faq")
const kbFaq = kb.filter((r) => r.pass && r.source === "faq")
console.log(`  KB 정답 문서 인용   ${g(kbCited.length, kb.length)}`)
console.log(`  정답 FAQ 응답       ${g(kbFaq.length, kb.length)}`)
console.log(`  KB 합계             ${g(kb.filter((r) => r.pass).length, kb.length)}`)
console.log(`  정책 차단           ${g(po.filter((r) => r.pass).length, po.length)}`)
console.log(`  범위 밖 거절        ${g(oo.filter((r) => r.pass).length, oo.length)}`)
console.log(`  전체                ${g(results.filter((r) => r.pass).length, results.length)}`)

const fails = results.filter((r) => !r.pass)
if (fails.length) {
  console.log("\n── 불합격 ──")
  for (const f of fails) console.log(`  ✗ "${f.q}"\n      기대=${JSON.stringify(f.expect)} 실제=${f.source}/${f.refId || f.docs.join(",") || f.reason}\n      "${f.answer.slice(0, 70)}"`)
}
writeFileSync("tests/qa-result.json", JSON.stringify(results, null, 2), "utf8")
console.log("\n  상세: tests/qa-result.json")
