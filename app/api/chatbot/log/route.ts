import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const KINDS = new Set(["button", "faq_hit", "policy_block", "ai_answer", "fallback"])
const MAX_INPUT = 500

/**
 * 이용자가 자발적으로 입력할 수 있는 식별정보를 저장 전에 제거한다.
 * 로그의 목적은 "어떤 질문이 답변되지 못했는가"이지 개인 식별이 아니다.
 */
export function maskPII(text: string): string {
  return text
    .replace(/\d{6}\s*[-–]\s*\d{7}/g, "[주민번호]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[카드번호]")
    .replace(/01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[휴대전화]")
    .replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[이메일]")
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // 로그 실패가 대화를 막으면 안 된다
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  try {
    const body = await request.json()
    const kind = String(body?.kind ?? "")
    if (!KINDS.has(kind)) {
      return NextResponse.json({ ok: false, error: "invalid kind" }, { status: 400 })
    }

    const sessionId = String(body?.sessionId ?? "").slice(0, 64) || "unknown"
    const rawInput = typeof body?.userInput === "string" ? body.userInput.slice(0, MAX_INPUT) : null
    const refId = typeof body?.refId === "string" ? body.refId.slice(0, 64) : null

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await supabase.from("chatbot_logs").insert({
      env: process.env.VERCEL_ENV ?? "development",
      session_id: sessionId,
      kind,
      user_input: rawInput ? maskPII(rawInput) : null,
      ref_id: refId,
    })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
