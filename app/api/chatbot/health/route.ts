import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resolveEmbeddingModel, resolveModel } from "@/lib/chatbot/model"
import { dailyLimit } from "@/lib/chatbot/ratelimit"
import { dayInSeoul, usageNamespace } from "@/lib/chatbot/runtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 미설정" }, { status: 503 })
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ ok: false, error: "Supabase 환경변수 없음" }, { status: 500 })

  const namespace = usageNamespace()
  const day = dayInSeoul()
  const limit = dailyLimit()
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const [usage, kb] = await Promise.all([
    db.from("chatbot_usage").select("ai_calls").eq("day", day).eq("env", namespace).maybeSingle(),
    db.from("kb_documents").select("id", { count: "exact", head: true }).eq("published", true),
  ])
  if (usage.error || kb.error) {
    return NextResponse.json({ ok: false, error: "health query failed" }, { status: 500 })
  }
  const used = Number(usage.data?.ai_calls ?? 0)
  return NextResponse.json({
    ok: true,
    namespace,
    day,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    kbCount: kb.count ?? 0,
    modelConfigured: Boolean(resolveModel()),
    embeddingConfigured: Boolean(resolveEmbeddingModel()),
  })
}
