import "./load-env.mts"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { evaluateAnswer, type AnswerContract } from "../lib/chatbot/answer-contract"

const BASE = process.env.QA_BASE ?? "http://localhost:3113"
const OUTPUT = "docs/chatbot-assets/channeltalk-export/qa-critical-result.json"
const EXPECT_NAMESPACE = process.env.QA_EXPECT_NAMESPACE ?? "qa-local"
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const protectionCookie = process.env.QA_PROTECTION_COOKIE
const requestHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
  ...(protectionCookie ? { Cookie: protectionCookie } : {}),
}

type CriticalCase = AnswerContract & {
  id: string
  question: string
  allowedSources: string[]
  repeat: number
  expectedAttempts: { embedding: number; generation: number; model: number }
}

const suite = JSON.parse(readFileSync("tests/chatbot-critical-answers.json", "utf8")) as {
  cases: CriticalCase[]
}
for (const testCase of suite.cases) {
  if (!Number.isInteger(testCase.repeat) || testCase.repeat < 1) {
    throw new Error(`critical case has invalid repeat: ${testCase.id}`)
  }
}
const qaSet = JSON.parse(readFileSync("tests/qa-set.json", "utf8")) as {
  kb: Array<{ id: string; history?: Array<{ role: "user" | "assistant"; text: string }> }>
}
const histories = new Map(qaSet.kb.map((item) => [item.id, item.history]))

const requiredOperations = suite.cases.reduce((sum, testCase) => sum + testCase.repeat, 0) * 2
const health = await fetch(`${BASE}/api/chatbot/health`, {
  headers: {
    Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
    ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
    ...(protectionCookie ? { Cookie: protectionCookie } : {}),
  },
  signal: AbortSignal.timeout(15_000),
}).then(async (response) => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }))
if (!health.ok || health.body.namespace !== EXPECT_NAMESPACE || Number(health.body.remaining) < requiredOperations) {
  throw new Error(`critical preflight failed: status=${health.status} namespace=${health.body.namespace ?? "?"} remaining=${health.body.remaining ?? "?"}`)
}

const results = []
for (const testCase of suite.cases) {
  for (let attempt = 1; attempt <= testCase.repeat; attempt += 1) {
    const startedAt = Date.now()
    let response: Record<string, unknown> = {}
    let error = ""
    try {
      const raw = await fetch(`${BASE}/api/chatbot/ask`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          question: testCase.question,
          sessionId: `qa-critical-${testCase.id}-${attempt}`,
          history: histories.get(testCase.id),
        }),
        signal: AbortSignal.timeout(90_000),
      })
      response = await raw.json().catch(() => ({}))
      if (!raw.ok) error = `HTTP ${raw.status}`
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught)
    }

    const answer = String(response.answer ?? "")
    const evaluation = evaluateAnswer(answer, testCase)
    const source = String(response.source ?? "")
    const diagnostics = (response.diagnostics ?? {}) as Record<string, unknown>
    const attempts = {
      embedding: typeof diagnostics.embeddingAttempts === "number" ? diagnostics.embeddingAttempts : null,
      generation: typeof diagnostics.generationAttempts === "number" ? diagnostics.generationAttempts : null,
      model: typeof diagnostics.modelAttempts === "number" ? diagnostics.modelAttempts : null,
    }
    const expected = source === "ai" ? { embedding: 1, generation: 1, model: 2 } : testCase.expectedAttempts
    const attemptsPass = attempts.embedding === expected.embedding &&
      attempts.generation === expected.generation && attempts.model === expected.model &&
      attempts.model === (attempts.embedding ?? -1) + (attempts.generation ?? -1)
    const pass = !error && testCase.allowedSources.includes(source) && evaluation.pass && attemptsPass
    results.push({
      id: testCase.id,
      attempt,
      question: testCase.question,
      answer,
      source,
      reason: response.reason ?? null,
      provider: response.provider ?? null,
      usage: response.usage ?? null,
      latencyMs: Date.now() - startedAt,
      evaluation,
      attempts,
      attemptsPass,
      error: error || null,
      pass,
    })
  }
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, JSON.stringify({ base: BASE, createdAt: new Date().toISOString(), results }, null, 2))
const passed = results.filter((result) => result.pass).length
console.log(`critical QA: ${passed}/${results.length} PASS`)
console.log(`result: ${OUTPUT}`)
if (passed !== results.length) process.exitCode = 1
