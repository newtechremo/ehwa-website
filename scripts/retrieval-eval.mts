import "./load-env.mts"
import { readFileSync } from "node:fs"
import { loadKb } from "../lib/chatbot/kb"
import { retrieveContext } from "../lib/chatbot/retrieval"

process.env.CHATBOT_USAGE_NAMESPACE ||= "qa-retrieval"

type Case = { id: string; q: string; expectAny: number[] }
const cases = JSON.parse(readFileSync("tests/retrieval-set.json", "utf8")) as Case[]
const docs = await loadKb()
let passed = 0
for (const testCase of cases) {
  const result = await retrieveContext(testCase.q, `retrieval-${testCase.id}`, docs)
  const top3 = result.chunks.slice(0, 3).map((chunk) => chunk.seq)
  const pass = result.status === "ok" && testCase.expectAny.some((seq) => top3.includes(seq))
  if (pass) passed += 1
  console.log(`${pass ? "✓" : "✗"} ${testCase.id}: ${top3.join(",")} (${result.method})`)
}
console.log(`retrieval holdout: ${passed}/${cases.length} Top-3`)
if (passed !== cases.length) process.exitCode = 1
