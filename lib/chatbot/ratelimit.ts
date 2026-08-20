import { createClient } from "@supabase/supabase-js"

/**
 * 챗봇 AI 호출 보호장치.
 *
 * 공개 무인증 엔드포인트가 LLM을 호출하므로, 방치하면 과금 폭탄 경로가 된다.
 * 세 겹으로 막는다: 세션·IP 단위 rate limit → 입력 길이 제한 → 일일 총량 서킷브레이커.
 * 한도를 넘으면 AI만 끄고 버튼·FAQ·KB 검색은 계속 동작한다(자동 강등).
 */

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 8

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k)
    }
    return { ok: true, retryAfterSec: 0 }
  }

  if (b.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true, retryAfterSec: 0 }
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function dailyLimit(): number {
  const n = Number(process.env.CHATBOT_DAILY_AI_LIMIT)
  return Number.isFinite(n) && n > 0 ? n : 500
}

/** 오늘 AI 호출 여유가 있는지 확인하고, 있으면 1 증가시킨다 */
export async function consumeDailyBudget(): Promise<{ ok: boolean; used: number; limit: number }> {
  const limit = dailyLimit()
  const client = db()
  if (!client) return { ok: false, used: 0, limit }

  const env = process.env.VERCEL_ENV ?? "development"
  const day = today()

  const { data } = await client
    .from("chatbot_usage")
    .select("ai_calls")
    .eq("day", day)
    .eq("env", env)
    .maybeSingle()

  const used = data?.ai_calls ?? 0
  if (used >= limit) return { ok: false, used, limit }

  await client.from("chatbot_usage").upsert(
    { day, env, ai_calls: used + 1 },
    { onConflict: "day,env" },
  )
  return { ok: true, used: used + 1, limit }
}

export function clientKey(request: Request, sessionId: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return `${ip}|${sessionId}`
}
