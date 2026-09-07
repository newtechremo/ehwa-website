import { existsSync, mkdirSync, writeFileSync } from "node:fs"
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

  // 구독 해지 시 함께 사라지는 채널 메타데이터. 대화만으로는 복원할 수 없다.
  // users 는 상담 상대(대부분 익명 방문자)이며 이메일·전화가 담길 수 있으므로
  // 이 폴더 전체가 git 추적 제외라는 전제 위에서만 보관한다.
  const sidecars: Record<string, unknown> = {}
  for (const state of STATES) {
    const url = new URL(`${API}/user-chats`)
    url.search = new URLSearchParams({ sortOrder: "asc", limit: String(LIMIT), state }).toString()
    const response = await fetch(url, { headers: headers() })
    if (!response.ok) throw new Error(`sidecar fetch failed: ${state} ${response.status}`)
    const body = await response.json() as Record<string, unknown>
    for (const field of ["users", "managers", "chatTags"]) {
      const rows = body[field]
      if (!Array.isArray(rows)) continue
      const bucket = (sidecars[field] as Record<string, unknown>[] | undefined) ?? []
      const ids = new Set(bucket.map((row) => (row as { id?: string }).id))
      for (const row of rows as Record<string, unknown>[]) {
        if (!ids.has(row.id as string)) bucket.push(row)
      }
      sidecars[field] = bucket
    }
  }
  for (const [path, field] of [["/managers", "managers"], ["/groups", "groups"]] as const) {
    const response = await fetch(new URL(`${API}${path}`), { headers: headers() })
    if (!response.ok) continue
    const body = await response.json() as Record<string, unknown>
    if (Array.isArray(body[field])) sidecars[`channel_${field}`] = body[field]
  }
  const channelResponse = await fetch(new URL(`${API}/channel`), { headers: headers() })
  if (channelResponse.ok) sidecars.channel = ((await channelResponse.json()) as Record<string, unknown>).channel

  // 첨부파일은 채널톡 스토리지에 있어 해지 후 접근 불가. 원본을 로컬로 내려받는다.
  const attachments: Array<Record<string, unknown>> = []
  for (const [chatId, rows] of Object.entries(messages)) {
    for (const message of rows) {
      for (const file of ((message.files as Record<string, unknown>[] | undefined) ?? [])) {
        attachments.push({ chatId, messageId: message.id, ...file })
      }
    }
  }
  if (attachments.length) {
    mkdirSync(`${OUTPUT}/attachments`, { recursive: true })
    for (const file of attachments) {
      const target = `${OUTPUT}/attachments/${file.id}_${String(file.name).replace(/[/\\]/g, "_")}`
      if (existsSync(target)) { file.savedAs = target; continue }
      const direct = typeof file.url === "string" ? file.url : null
      const bucketUrl = file.bucket && file.key ? `https://${file.bucket}/${file.key}` : null
      let saved = false
      for (const candidate of [direct, bucketUrl].filter(Boolean) as string[]) {
        try {
          const response = await fetch(candidate, { headers: headers() })
          if (!response.ok) continue
          writeFileSync(target, Buffer.from(await response.arrayBuffer()))
          file.savedAs = target
          saved = true
          break
        } catch { /* 다음 후보 */ }
      }
      // 내려받지 못한 첨부는 조용히 넘기지 않는다. 해지 전에 사람이 데스크에서 받아야 한다.
      if (!saved) file.savedAs = null
    }
    writeFileSync(`${OUTPUT}/attachments.json`, JSON.stringify(attachments, null, 2))
  }

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
      users: ((sidecars.users as unknown[]) ?? []).length,
      managers: ((sidecars.channel_managers as unknown[]) ?? []).length,
      groups: ((sidecars.channel_groups as unknown[]) ?? []).length,
      attachments: attachments.length,
      attachmentsSaved: attachments.filter((file) => file.savedAs).length,
    },
    firstAt: iso(times.length ? Math.min(...times) : undefined),
    lastAt: iso(times.length ? Math.max(...times) : undefined),
  }

  if (manifest.states.join(",") !== STATES.join(",")) throw new Error("missing chat state")
  mkdirSync(OUTPUT, { recursive: true })
  writeFileSync(`${OUTPUT}/user-chats.json`, JSON.stringify(chats, null, 2))
  writeFileSync(`${OUTPUT}/messages.json`, JSON.stringify(messages, null, 2))
  writeFileSync(`${OUTPUT}/qa-pairs.json`, JSON.stringify(qaPairs, null, 2))
  writeFileSync(`${OUTPUT}/channel-metadata.json`, JSON.stringify(sidecars, null, 2))
  writeFileSync(`${OUTPUT}/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify(manifest, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
