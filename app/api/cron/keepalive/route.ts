import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase Free 플랜은 7일간 DB 활동이 없으면 프로젝트를 자동 일시정지(pause)한다.
// 메인 페이지(/)는 정적 프리렌더라 DB를 건드리지 않으므로, /blog·/admin 방문이
// 일주일간 없으면 그대로 정지된다. 이 라우트가 주기적으로 가벼운 쿼리를 날려
// 프로젝트를 깨어 있게 유지한다. (2026-08-19 실제 pause 발생 후 추가)
export const dynamic = "force-dynamic"

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

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 가장 가벼운 형태의 실제 쿼리 (행 데이터를 받지 않고 카운트만)
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })

    if (error) throw error

    return NextResponse.json({ ok: true, posts: count ?? 0, at: new Date().toISOString() })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
