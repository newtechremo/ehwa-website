import assert from "node:assert/strict"
import { buildContext, rrf, type Candidate } from "../lib/chatbot/retrieval"

const item = (seq: number, content = `문서 ${seq}`): Candidate => ({
  docId: seq,
  docKey: `${seq}_doc`,
  seq,
  content,
})

const merged = rrf([
  [item(55), item(19), item(6)],
  [item(6), item(6, "같은 문서의 다른 chunk"), item(24), item(25)],
])
assert.equal(merged[0].seq, 6)
assert.equal(new Set(merged.map((candidate) => candidate.docId)).size, merged.length)
assert.equal(merged.length, 5)

const context = buildContext([item(1, "가".repeat(7_000)), item(2, "나".repeat(7_000))])
assert.ok(context.length <= 12_000)
assert.match(context, /<문서 1>/)
assert.doesNotMatch(context, /<문서 2>/)
console.log("retrieval: PASS")
