import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * 대화 로그 보존기간 파기.
 *
 * 로그에 질문뿐 아니라 답변 본문까지 저장하게 되면서 보관량과 민감도가 함께 올라갔다.
 * 개인정보처리방침에 명시할 보존기간(기본 90일)을 코드가 아니라 DB 함수로 두고,
 * 이 라우트는 호출만 한다. 수동 실행과 cron이 같은 규칙을 쓰게 하기 위해서다.
 *
 * keepalive 와 분리한 이유: 한쪽이 실패해도 다른 쪽은 계속 돌아야 한다.
 * (파기 실패로 keepalive 가 멈추면 Supabase Free 플랜이 pause 된다)
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DEFAULT_RETAIN_DAYS = 90

export async function GET(request: Request) {
  // Vercel Cron은 CRON_SECRET이 설정돼 있으면 Authorization 헤더를 자동으로 붙인다.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase 환경변수 없음" }, { status: 500 })
  }

  const retainDays = Number(process.env.CHATBOT_LOG_RETAIN_DAYS) || DEFAULT_RETAIN_DAYS

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await db.rpc("purge_chatbot_logs", { retain_days: retainDays })
    if (error) throw error

    return NextResponse.json({
      ok: true,
      removed: data ?? 0,
      retainDays,
      at: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("purge-logs 실패:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
