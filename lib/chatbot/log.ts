import { createClient } from "@supabase/supabase-js"
import type { LogKind } from "./types"

/**
 * 서버측 대화 로그.
 *
 * 클라이언트 로그만으로는 "어떤 KB 문서를 근거로 답했는가"를 남길 수 없다.
 * 인수인계 문서 11장 체크리스트의 "답변과 함께 사용한 근거 문서가 로그에 기록된다"
 * 요건을 충족하려면 답변을 만든 서버가 직접 기록해야 한다.
 *
 * 로그 실패가 대화를 막으면 안 되므로 모든 예외를 삼킨다.
 */
const MAX_INPUT = 500

export function maskPII(text: string): string {
  return text
    .replace(/\d{6}\s*[-–]\s*\d{7}/g, "[주민번호]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[카드번호]")
    .replace(/01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[휴대전화]")
    .replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[이메일]")
}

export async function logChat(entry: {
  sessionId: string
  kind: LogKind
  userInput?: string
  refId?: string | null
  sourceDocIds?: string[]
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    await db.from("chatbot_logs").insert({
      env: process.env.VERCEL_ENV ?? "development",
      session_id: entry.sessionId.slice(0, 64) || "unknown",
      kind: entry.kind,
      user_input: entry.userInput ? maskPII(entry.userInput.slice(0, MAX_INPUT)) : null,
      ref_id: entry.refId ? String(entry.refId).slice(0, 64) : null,
      source_doc_ids: entry.sourceDocIds?.length ? entry.sourceDocIds : null,
    })
  } catch {
    /* 로그 실패는 무시 */
  }
}
