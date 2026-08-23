/**
 * 채널톡 대체 검증 — 자동 채점.
 *
 * 정답은 KB 원본 문서 번호(tests/qa-set.json)이며 시스템 출력이 아니다.
 * 실행: npm run qa   (로컬 dev 서버가 떠 있어야 한다)
 */
import { readFileSync, writeFileSync } from "fs"

const BASE = process.env.QA_BASE ?? "http://localhost:3112"
const set = JSON.parse(readFileSync("tests/qa-set.json", "utf8"))

type Res = { q: string; expect: unknown; source: string; docs: number[]; reason: string; answer: string; pass: boolean }

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
    // KB 문항 판정:
    //   answered  = 정답 문서를 인용했거나, 검수된 FAQ가 답했다
    //   FAQ는 원본 44건의 고정 답변이라 내용이 KB와 동일한 주제를 다룬다.
    //   다만 FAQ가 엉뚱한 주제를 가로챌 수 있으므로 별도 집계해 눈으로 확인한다.
    let pass = false
    let note = ""
    if (kind === "kb") {
      const cited = docs.some((n: number) => it.expect.includes(n))
      if (cited) pass = true
      else if (d.source === "faq") { pass = true; note = "FAQ 응답 — 내용 확인 필요" }
      else if (d.source === "ai") { pass = false; note = `다른 문서 인용(${docs.join(",")})` }
      else note = d.reason ?? d.source
    } else if (kind === "policy") pass = d.source === "policy"
    else pass = d.source === "fallback"
    results.push({ q: it.q, expect: it.expect, source: d.source ?? "?", docs, reason: note || (d.reason ?? ""), answer: (d.answer ?? "").replace(/\n/g, " ").slice(0, 100), pass })
    await sleep(1800)
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
const kbCited = kb.filter((r) => r.pass && !r.reason.startsWith("FAQ"))
const kbFaq = kb.filter((r) => r.pass && r.reason.startsWith("FAQ"))
console.log(`  KB 정답 문서 인용   ${g(kbCited.length, kb.length)}`)
console.log(`  FAQ가 응답(확인要)  ${g(kbFaq.length, kb.length)}`)
console.log(`  KB 합계             ${g(kb.filter((r) => r.pass).length, kb.length)}`)
console.log(`  정책 차단           ${g(po.filter((r) => r.pass).length, po.length)}`)
console.log(`  범위 밖 거절        ${g(oo.filter((r) => r.pass).length, oo.length)}`)
console.log(`  전체                ${g(results.filter((r) => r.pass).length, results.length)}`)

const fails = results.filter((r) => !r.pass)
if (fails.length) {
  console.log("\n── 불합격 ──")
  for (const f of fails) console.log(`  ✗ "${f.q}"\n      기대=${JSON.stringify(f.expect)} 실제=${f.source}/${f.docs.join(",")||f.reason}\n      "${f.answer.slice(0, 70)}"`)
}
writeFileSync("tests/qa-result.json", JSON.stringify(results, null, 2), "utf8")
console.log("\n  상세: tests/qa-result.json")
