import assert from "node:assert/strict"
import { BUTTON_LABELS, paginate } from "./ct-export.mts"

for (const label of ["카카오톡", "메일", "병원방문"]) assert.ok(BUTTON_LABELS.has(label), label)

let page = 0
const fetcher = (async () => {
  page += 1
  return Response.json(page === 1
    ? { next: "p2", userChats: [{ id: "1" }] }
    : { next: null, userChats: [{ id: "2" }] })
}) as typeof fetch

const rows = await paginate<{ id: string }>(new URL("https://example.com/user-chats"), "userChats", fetcher)
assert.deepEqual(rows.map((row) => row.id), ["1", "2"])

const repeated = (async () => Response.json({ next: "same", userChats: [] })) as typeof fetch
await assert.rejects(
  paginate(new URL("https://example.com/user-chats"), "userChats", repeated),
  /repeated cursor: same/,
)
console.log("ct-export: PASS")
