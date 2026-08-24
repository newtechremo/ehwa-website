import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

const setRaw = readFileSync("tests/qa-set.json", "utf8")
const set = JSON.parse(setRaw)
const questionCount = set.kb.length + set.policy.length + set.outOfScope.length
const setSha256 = createHash("sha256").update(setRaw).digest("hex")
const currentResult = "docs/chatbot-assets/channeltalk-export/qa-result.json"
const resultPath = process.env.QA_RESULT ?? currentResult
if (!existsSync(resultPath)) throw new Error(`QA result missing: ${resultPath}`)

const parsed = JSON.parse(readFileSync(resultPath, "utf8"))
const meta = Array.isArray(parsed) ? {} : parsed.meta ?? {}
const results = Array.isArray(parsed) ? parsed : parsed.results ?? []
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
const errors: string[] = []

if (meta.commit !== commit) errors.push("commit mismatch")
if (meta.setSha256 !== setSha256) errors.push("setSha256 mismatch")
if (meta.questionCount !== questionCount || meta.resultCount !== results.length || results.length !== questionCount) {
  errors.push(`questionCount/resultCount mismatch: set=${questionCount} meta=${meta.questionCount}/${meta.resultCount} actual=${results.length}`)
}
const failures = results.filter((result: { pass?: boolean }) => result.pass !== true).length
if (failures) errors.push(`failed results: ${failures}`)

if (errors.length) {
  errors.forEach((error) => console.error(error))
  process.exitCode = 1
} else {
  console.log(`qa-result: PASS (${results.length}/${questionCount}, ${commit.slice(0, 7)})`)
}
