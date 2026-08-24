/**
 * 채널톡 실대화 재생 비교.
 *
 * Open API 로 받은 실제 이용자 대화(docs/chatbot-assets/channeltalk-export/, git 제외)를
 * 자체 챗봇에 같은 순서·같은 맥락으로 재생해 채널톡 실답변과 나란히 기록한다.
 * 맥락 구성은 ChatWidget 과 동일: 직전 4턴, 300자, user + (ai|faq) 봇 답변만.
 *
 * 실행: npm run ct:replay            (전체)
 *       npm run ct:replay -- --retry (직전 결과에서 model_error 였던 항목만 재실행·병합)
 */
import { readFileSync, writeFileSync, existsSync } from "fs"

const BASE = process.env.QA_BASE ?? "http://localhost:3112"
const EXPORT = "docs/chatbot-assets/channeltalk-export"
const OUT = `${EXPORT}/replay-result.json`

const BUTTONS = new Set(["질문하기","처음으로","지원 범위","이용 대상","신청 방법","비용안내","비용 안내",
  "운영 시간 & 위치","이전으로","온라인 신청서","카카오톡 상담","전화","이메일","병원 방문",
  "다른 방법으로 신청","신청서 작성하기"])

function mask(t: string): string {
  return t
    .replace(/\d{6}\s*[-–]\s*\d{7}/g, "[주민번호]")
    .replace(/01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[휴대전화]")
    .replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[이메일]")
}

type Turn = { role: "user" | "assistant"; text: string }
type Row = {
  chat: string; at: number; q: string
  ct_answer: string
  our_source: string; our_ref: string; our_reason: string; our_answer: string
}

async function ask(q: string, sessionId: string, history: Turn[]) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const r = await fetch(`${BASE}/api/chatbot/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, sessionId, history }),
        signal: AbortSignal.timeout(90_000),
      })
      return await r.json()
    } catch { /* 재시도 */ }
  }
  return { source: "error", answer: "" }
}

const chats = JSON.parse(readFileSync(`${EXPORT}/user-chats.json`, "utf8"))
const msgs = JSON.parse(readFileSync(`${EXPORT}/messages.json`, "utf8"))
const retryMode = process.argv.includes("--retry")
const prev: Row[] = retryMode && existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : []
const prevMap = new Map(prev.map((r) => [`${r.chat}|${r.at}`, r]))

const rows: Row[] = []
for (const c of chats) {
  const ms = msgs[c.id]
  const history: Turn[] = []
  const sid = `ct_replay_${c.id.slice(-8)}`
  for (let i = 0; i < ms.length; i += 1) {
    const m = ms[i]
    if (m.personType !== "user") continue
    const q = (m.plainText ?? "").trim()
    if (!q || BUTTONS.has(q)) continue

    // 채널톡측 답변: 다음 user 발화 전까지의 bot 텍스트
    const ct: string[] = []
    for (const n of ms.slice(i + 1)) {
      if (n.personType === "user") break
      const a = (n.plainText ?? "").trim()
      if (a) ct.push(a)
    }

    const key = `${c.id}|${m.createdAt}`
    const cached = prevMap.get(key)
    let row: Row
    if (retryMode && cached && cached.our_reason !== "model_error" &&
        cached.our_source !== "error" && cached.our_source !== "rate_limited") {
      row = cached // 이미 유효한 결과는 재호출하지 않는다
    } else {
      const d = await ask(mask(q), sid, history.slice(-4))
      row = {
        chat: c.id, at: m.createdAt, q: mask(q),
        ct_answer: mask(ct.join("\n---\n")),
        our_source: d.source ?? "?", our_ref: String(d.refId ?? ""),
        our_reason: String(d.reason ?? ""),
        our_answer: (d.answer ?? "").trim(),
      }
      // 자체 rate limit(세션당 분당 8회)에 걸리지 않도록 AI 경로는 넉넉히 쉰다
      await new Promise((r) => setTimeout(r, d.source === "ai" || d.source === "fallback" || d.source === "rate_limited" ? 9000 : 300))
    }
    rows.push(row)
    // 맥락 갱신 — ChatWidget 과 동일 필터 (user + ai/faq 만, kb 직답·fallback 제외)
    history.push({ role: "user", text: row.q.slice(0, 300) })
    if (row.our_source === "ai" || row.our_source === "faq") {
      history.push({ role: "assistant", text: row.our_answer.slice(0, 300) })
    }
    process.stdout.write(`  [${rows.length}] ${row.our_source.padEnd(9)} ${row.q.slice(0, 30)}\n`)
  }
}
writeFileSync(OUT, JSON.stringify(rows, null, 1))
const bySrc: Record<string, number> = {}
for (const r of rows) bySrc[r.our_source + (r.our_reason ? `/${r.our_reason}` : "")] = (bySrc[r.our_source + (r.our_reason ? `/${r.our_reason}` : "")] ?? 0) + 1
console.log(`\n총 ${rows.length}건 →`, JSON.stringify(bySrc, null, 0))
