import { mkdirSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { maskPII } from "../lib/chatbot/log"

export const STATES = ["initial", "opened", "snoozed", "closed"] as const
export const BUTTON_LABELS = new Set([
  "질문하기", "처음으로", "지원 범위", "이용 대상", "신청 방법", "비용안내", "비용 안내",
  "운영 시간 & 위치", "이전으로", "온라인 신청서", "카카오톡 상담", "전화", "이메일", "병원 방문",
  "카카오톡", "메일", "병원방문", "다른 방법으로 신청", "신청서 작성하기",
])
const LIMIT = 500
const API = "https://api.channel.io/open/v5"
const OUTPUT = "docs/chatbot-assets/channeltalk-export"

const headers = () => ({
  "x-access-key": process.env.CHANNELTALK_ACCESS_KEY ?? "",
  "x-access-secret": process.env.CHANNELTALK_ACCESS_SECRET ?? "",
})

async function paginatePages<T>(url: URL, field: string, fetcher: typeof fetch) {
  const rows: T[] = []
  const cursors = new Set<string>()
  let pages = 0
  for (;;) {
    const response = await fetcher(url, { headers: headers() })
    if (!response.ok) throw new Error(`${response.status} ${url.pathname}`)
    const body = await response.json() as Record<string, unknown>
    const page = body[field]
    if (!Array.isArray(page)) throw new Error(`missing array: ${field}`)
    rows.push(...page as T[])
    pages += 1
    const next = typeof body.next === "string" && body.next ? body.next : null
    if (!next) return { rows, pages }
    if (cursors.has(next)) throw new Error(`repeated cursor: ${next}`)
    cursors.add(next)
    url.searchParams.set("since", next)
  }
}

export async function paginate<T>(url: URL, field: string, fetcher: typeof fetch = fetch): Promise<T[]> {
  return (await paginatePages<T>(url, field, fetcher)).rows
}

type ChannelRow = {
  id: string
  createdAt?: number
  personType?: string
  plainText?: string
}

function iso(value: number | undefined): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null
}

async function main() {
  process.loadEnvFile(".env.tokens")
  if (!process.env.CHANNELTALK_ACCESS_KEY || !process.env.CHANNELTALK_ACCESS_SECRET) {
    throw new Error("CHANNELTALK_ACCESS_KEY/SECRET is required")
  }

  const chats: ChannelRow[] = []
  const messages: Record<string, ChannelRow[]> = {}
  const seenChats = new Set<string>()
  const byState: Record<string, { chats: number; pages: number }> = {}
  let messagePages = 0

  for (const state of STATES) {
    const url = new URL(`${API}/user-chats`)
    url.search = new URLSearchParams({ sortOrder: "asc", limit: String(LIMIT), state }).toString()
    const page = await paginatePages<ChannelRow>(url, "userChats", fetch)
    byState[state] = { chats: page.rows.length, pages: page.pages }
    for (const chat of page.rows) {
      if (!chat.id || seenChats.has(chat.id)) throw new Error(`duplicate chat id: ${chat.id || "(empty)"}`)
      seenChats.add(chat.id)
      chats.push(chat)
    }
  }

  for (const chat of chats) {
    const url = new URL(`${API}/user-chats/${encodeURIComponent(chat.id)}/messages`)
    url.search = new URLSearchParams({ sortOrder: "asc", limit: String(LIMIT) }).toString()
    const page = await paginatePages<ChannelRow>(url, "messages", fetch)
    const ids = new Set<string>()
    for (const message of page.rows) {
      if (!message.id || ids.has(message.id)) throw new Error(`duplicate message id: ${chat.id}/${message.id || "(empty)"}`)
      ids.add(message.id)
    }
    messages[chat.id] = page.rows
    messagePages += page.pages
  }

  const qaPairs = chats.flatMap((chat) => {
    const rows = messages[chat.id] ?? []
    return rows.flatMap((message, index) => {
      if (message.personType !== "user") return []
      const question = message.plainText?.trim()
      if (!question || BUTTON_LABELS.has(question)) return []
      const answers: string[] = []
      for (const next of rows.slice(index + 1)) {
        if (next.personType === "user") break
        const answer = next.plainText?.trim()
        if (answer) answers.push(maskPII(answer))
      }
      return [{ chat: chat.id, at: message.createdAt ?? null, question: maskPII(question), answers }]
    })
  })

  const times = [...chats, ...Object.values(messages).flat()]
    .map((row) => row.createdAt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  const manifest = {
    exportedAt: new Date().toISOString(),
    states: [...STATES],
    byState,
    totals: {
      chats: chats.length,
      messages: Object.values(messages).reduce((sum, rows) => sum + rows.length, 0),
      chatPages: Object.values(byState).reduce((sum, state) => sum + state.pages, 0),
      messagePages,
      qaPairs: qaPairs.length,
    },
    firstAt: iso(times.length ? Math.min(...times) : undefined),
    lastAt: iso(times.length ? Math.max(...times) : undefined),
  }

  if (manifest.states.join(",") !== STATES.join(",")) throw new Error("missing chat state")
  mkdirSync(OUTPUT, { recursive: true })
  writeFileSync(`${OUTPUT}/user-chats.json`, JSON.stringify(chats, null, 2))
  writeFileSync(`${OUTPUT}/messages.json`, JSON.stringify(messages, null, 2))
  writeFileSync(`${OUTPUT}/qa-pairs.json`, JSON.stringify(qaPairs, null, 2))
  writeFileSync(`${OUTPUT}/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify(manifest, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
