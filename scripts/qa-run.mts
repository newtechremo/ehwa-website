import "./load-env.mts"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { evaluateAnswer, type AnswerContract } from "../lib/chatbot/answer-contract"

const BASE = process.env.QA_BASE ?? "http://localhost:3113"
const EXPECT_NAMESPACE = process.env.QA_EXPECT_NAMESPACE ?? "qa-local"
const OUTPUT = "docs/chatbot-assets/channeltalk-export/qa-result.json"
const setRaw = readFileSync("tests/qa-set.json", "utf8")
const set = JSON.parse(setRaw)
const critical = JSON.parse(readFileSync("tests/chatbot-critical-answers.json", "utf8")) as {
  cases: Array<AnswerContract & { id: string }>
}
const contracts = new Map(critical.cases.map((testCase) => [testCase.id, testCase]))
const questionCount = set.kb.length + set.policy.length + set.outOfScope.length
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const bypassHeader = bypass ? { "x-vercel-protection-bypass": bypass } : {}

const healthResponse = await fetch(`${BASE}/api/chatbot/health`, {
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`, ...bypassHeader },
  signal: AbortSignal.timeout(15_000),
})
const health = await healthResponse.json().catch(() => ({}))
if (!healthResponse.ok || health.namespace !== EXPECT_NAMESPACE || Number(health.remaining) < questionCount * 2) {
  throw new Error(`full QA preflight failed: status=${healthResponse.status} namespace=${health.namespace ?? "?"} remaining=${health.remaining ?? "?"}`)
}
if (health.kbCount !== 59 || !health.modelConfigured || !health.embeddingConfigured) {
  throw new Error(`full QA preflight incomplete: kb=${health.kbCount ?? "?"} model=${Boolean(health.modelConfigured)} embedding=${Boolean(health.embeddingConfigured)}`)
}

type Item = {
  id: string
  q: string
  expect: number[] | string
  history?: Array<{ role: "user" | "assistant"; text: string }>
}
type Result = {
  id: string
  q: string
  expect: number[] | string
  source: string
  refId: string
  docs: number[]
  reason: string
  answer: string
  evaluation: ReturnType<typeof evaluateAnswer> | null
  usage: unknown
  diagnostics: unknown
  latencyMs: number
  pass: boolean
}

const seqOf = (key: string) => Number(key.match(/^(\d+)_/)?.[1] ?? -1)
const faqSeq = (refId: unknown) => Number(String(refId ?? "").match(/^faq-(\d+)$/)?.[1] ?? -1)
const results: Result[] = []

async function ask(item: Item, kind: "kb" | "policy" | "refuse") {
  const startedAt = Date.now()
  let data: Record<string, unknown> = {}
  let error = ""
  try {
    const response = await fetch(`${BASE}/api/chatbot/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bypassHeader },
      body: JSON.stringify({ question: item.q, sessionId: `qa-full-${item.id}`, history: item.history }),
      signal: AbortSignal.timeout(90_000),
    })
    data = await response.json().catch(() => ({}))
    if (!response.ok) error = `HTTP ${response.status}`
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  }

  const source = String(data.source ?? "")
  const refId = String(data.refId ?? "")
  const docs = Array.isArray(data.docIds) ? data.docIds.map((key) => seqOf(String(key))).filter((seq) => seq > 0) : []
  const answer = String(data.answer ?? "")
  const contract = contracts.get(item.id)
  const evaluation = contract ? evaluateAnswer(answer, contract) : null
  let pass = false
  if (!error && kind === "kb" && Array.isArray(item.expect)) {
    pass = docs.some((seq) => item.expect.includes(seq)) || (source === "faq" && item.expect.includes(faqSeq(refId)))
  } else if (!error && kind === "policy") pass = source === "policy"
  else if (!error && kind === "refuse") {
    pass = source === "fallback" && ["unanswerable", "model_refused"].includes(String(data.reason ?? ""))
  }
  if (evaluation && !evaluation.pass) pass = false

  results.push({
    id: item.id,
    q: item.q,
    expect: item.expect,
    source,
    refId,
    docs,
    reason: error || String(data.reason ?? ""),
    answer,
    evaluation,
    usage: data.usage ?? null,
    diagnostics: data.diagnostics ?? null,
    latencyMs: Date.now() - startedAt,
    pass,
  })
  process.stdout.write(`${pass ? "✓" : "✗"} ${item.id} ${source}${data.reason ? `/${data.reason}` : ""}\n`)
}

const startedAt = new Date().toISOString()
for (const item of set.kb as Item[]) await ask(item, "kb")
for (const item of set.policy as Item[]) await ask(item, "policy")
for (const item of set.outOfScope as Item[]) await ask(item, "refuse")
const finishedAt = new Date().toISOString()

const meta = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  setSha256: createHash("sha256").update(setRaw).digest("hex"),
  namespace: EXPECT_NAMESPACE,
  questionCount,
  resultCount: results.length,
  startedAt,
  finishedAt,
}
mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, JSON.stringify({ meta, results }, null, 2))
const passed = results.filter((result) => result.pass).length
console.log(`full QA: ${passed}/${results.length} PASS`)
console.log(`result: ${OUTPUT}`)
if (passed !== results.length) process.exitCode = 1
