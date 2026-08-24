import { readFileSync } from "node:fs"
import { dayInSeoul } from "../lib/chatbot/runtime"

const INPUT = "docs/chatbot-assets/channeltalk-export/qa-pairs.json"
const pairs = JSON.parse(readFileSync(INPUT, "utf8")) as Array<{ at: number | null }>
const daily = new Map<string, number>()
for (const pair of pairs) {
  if (typeof pair.at !== "number" || !Number.isFinite(pair.at)) continue
  const day = dayInSeoul(new Date(pair.at))
  daily.set(day, (daily.get(day) ?? 0) + 1)
}

const counts = [...daily.values()].sort((a, b) => a - b)
const percentile = (value: number) => counts[Math.max(0, Math.ceil(counts.length * value) - 1)] ?? 0
const p95Daily = percentile(0.95)
const p99Daily = percentile(0.99)
const volume = {
  days: counts.length,
  totalQuestions: counts.reduce((sum, count) => sum + count, 0),
  p95Daily,
  p99Daily,
  recommendedLimit: Math.max(100, Math.ceil(p99Daily * 4)),
}

if (process.argv.includes("--json")) console.log(JSON.stringify(volume))
else console.log(JSON.stringify(volume, null, 2))
