import { createClient } from "@supabase/supabase-js"
import { createHash, randomUUID } from "node:crypto"
import { dayInSeoul, usageNamespace } from "./runtime"

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

/**
 * 세션·IP 단위 분당 호출 제한.
 *
 * ponytail: Vercel 인스턴스(Fluid Compute 워커)별 인메모리 제한이다. 인스턴스가
 * 여러 개면 각자 따로 센다. 전역 IP 차단이 필요해지면 Vercel WAF 로 올린다.
 * 일일 총량은 DB 가 원자적으로 보장하므로(consumeDailyBudget) 과금 상한은 이것과 무관하다.
 *
 * @param max 창당 허용 횟수. AI 호출(기본 8)보다 버튼 클릭 로그는 훨씬 잦으므로 호출부가 올린다.
 */
export function checkRateLimit(key: string, max = MAX_PER_WINDOW): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k)
    }
    return { ok: true, retryAfterSec: 0 }
  }

  if (b.count >= max) {
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

export function dailyLimit(): number {
  const n = Number(process.env.CHATBOT_DAILY_AI_LIMIT)
  return Number.isFinite(n) && n > 0 ? n : 500
}

/**
 * 오늘 AI 호출 여유가 있는지 확인하고, 있으면 1 증가시킨다.
 *
 * DB 함수 한 번으로 판정과 증가를 함께 처리한다(consume_chatbot_budget).
 * 이전의 "읽고 → 비교 → upsert" 두 단계는 동시 요청이 같은 값을 읽어 한도를
 * 넘길 수 있었다. 한도는 과금 방어선이라 경쟁 조건을 허용하면 안 된다.
 * DB 오류 시에는 열어두지 않고 닫는다(AI 만 꺼지고 버튼·FAQ·KB 는 계속 동작).
 */
export type BudgetResult =
  | { status: "allowed"; used: number; limit: number; namespace: string; day: string }
  | { status: "exhausted"; used: number; limit: number; namespace: string; day: string }
  | { status: "unavailable"; used: 0; limit: number; namespace: string; day: string }

export async function consumeDailyBudget(
  sessionId: string,
  operation: "embedding" | "generation",
): Promise<BudgetResult> {
  const limit = dailyLimit()
  const namespace = usageNamespace()
  const day = dayInSeoul()
  const client = db()
  if (!client) return { status: "unavailable", used: 0, limit, namespace, day }

  const { data, error } = await client
    .rpc("consume_chatbot_budget_v2", {
      p_day: day,
      p_env: namespace,
      p_limit: limit,
      p_event_id: randomUUID(),
      p_session_hash: createHash("sha256").update(sessionId).digest("hex").slice(0, 16),
      p_operation: operation,
    })
    .single<{ used: number; allowed: boolean }>()

  if (error || !data) {
    console.error("consumeDailyBudget rpc 실패:", error?.message)
    return { status: "unavailable", used: 0, limit, namespace, day }
  }
  return data.allowed
    ? { status: "allowed", used: data.used, limit, namespace, day }
    : { status: "exhausted", used: data.used, limit, namespace, day }
}

export function clientKey(request: Request, sessionId: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return `${ip}|${sessionId}`
}
