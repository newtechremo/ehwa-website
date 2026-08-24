import "./load-env.mts"
import { createClient } from "@supabase/supabase-js"
import { dailyLimit } from "../lib/chatbot/ratelimit"

const arg = (name: string) => process.argv[process.argv.indexOf(name) + 1]
const day = arg("--day")
const namespace = arg("--namespace")
if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? "") || !namespace) {
  throw new Error("usage: chatbot:report -- --day YYYY-MM-DD --namespace NAME [--limit N]")
}
const limitArg = Number(arg("--limit"))
const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : dailyLimit()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Supabase environment is required")
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const from = new Date(`${day}T00:00:00+09:00`)
const to = new Date(from.getTime() + 86_400_000)

const [usageResult, logsResult, eventsResult] = await Promise.all([
  db.from("chatbot_usage").select("ai_calls").eq("day", day).eq("env", namespace).maybeSingle(),
  db.from("chatbot_logs").select("session_id,kind,fallback_reason,provider,latency_ms,tokens_in,tokens_out,tokens_cached,retrieval_method,model_attempts,provider_error_code,created_at")
    .eq("env", namespace).gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).limit(5000),
  db.from("chatbot_usage_events").select("operation,outcome,delta").eq("day", day).eq("env", namespace).limit(5000),
])
if (usageResult.error || logsResult.error || eventsResult.error) {
  throw new Error(usageResult.error?.message || logsResult.error?.message || eventsResult.error?.message)
}

const logs = logsResult.data ?? []
const events = eventsResult.data ?? []
const used = Number(usageResult.data?.ai_calls ?? 0)
const count = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]))
const source = (row: typeof logs[number]) => row.kind === "ai_answer"
  ? row.provider === "kb-direct" ? "kb" : "ai"
  : row.kind === "faq_hit" ? "faq" : row.kind === "policy_block" ? "policy" : row.kind
const reasons = ["daily_limit", "budget_unavailable", "model_error", "model_refused"]
const fallbackWindows = Object.fromEntries(reasons.map((reason) => {
  const times = logs.filter((row) => row.fallback_reason === reason).map((row) => row.created_at).sort()
  return [reason, { count: times.length, firstAt: times[0] ?? null, lastAt: times.at(-1) ?? null }]
}))
const aiLatencies = logs.filter((row) => row.kind === "ai_answer" && row.provider !== "kb-direct" && typeof row.latency_ms === "number")
  .map((row) => Number(row.latency_ms)).sort((a, b) => a - b)
const sum = (field: "tokens_in" | "tokens_out" | "tokens_cached" | "model_attempts") => logs.reduce((total, row) => total + Number(row[field] ?? 0), 0)
const tokensIn = sum("tokens_in")
const tokensCached = sum("tokens_cached")
const modelAttempts = sum("model_attempts")
const allowedEvents = events.filter((event) => event.outcome === "allowed").reduce((total, event) => total + Number(event.delta), 0)
const sessions = new Map<string, number>()
for (const row of logs) {
  const prefix = String(row.session_id).split("-").slice(0, 2).join("-")
  sessions.set(prefix, (sessions.get(prefix) ?? 0) + Number(row.model_attempts ?? 0))
}

const report = {
  day,
  namespace,
  usage: { used, limit, remaining: Math.max(0, limit - used) },
  sourceCounts: count(logs.map(source)),
  fallbackReasonCounts: count(logs.filter((row) => row.fallback_reason).map((row) => String(row.fallback_reason))),
  fallbackWindows,
  providerErrorCounts: count(logs.filter((row) => row.fallback_reason === "model_error").map((row) => String(row.provider_error_code ?? "unknown"))),
  aiLatencyMs: {
    average: aiLatencies.length ? Math.round(aiLatencies.reduce((total, value) => total + value, 0) / aiLatencies.length) : null,
    p95: aiLatencies.length ? aiLatencies[Math.ceil(aiLatencies.length * 0.95) - 1] : null,
    max: aiLatencies.at(-1) ?? null,
  },
  tokens: {
    in: tokensIn,
    out: sum("tokens_out"),
    cached: tokensCached,
    cacheRatio: tokensIn ? Number((tokensCached / tokensIn).toFixed(4)) : 0,
  },
  retrievalMethodCounts: count(logs.map((row) => String(row.retrieval_method ?? "none"))),
  audit: { modelAttempts, allowedEvents, difference: modelAttempts - allowedEvents },
  topSessionPrefixes: [...sessions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([prefix, attempts]) => ({ prefix, attempts })),
}

console.log(JSON.stringify(report, null, 2))
if (report.audit.difference !== 0) process.exitCode = 1
