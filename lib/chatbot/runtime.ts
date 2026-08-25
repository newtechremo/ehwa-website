const NAME = /^[a-z0-9][a-z0-9:_-]{0,63}$/i

export function usageNamespace(): string {
  const value = process.env.CHATBOT_USAGE_NAMESPACE?.trim() || process.env.VERCEL_ENV || "development"
  if (!NAME.test(value)) throw new Error(`invalid CHATBOT_USAGE_NAMESPACE: ${value}`)
  return value
}

export function dayInSeoul(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
