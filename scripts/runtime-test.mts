import assert from "node:assert/strict"
import { shouldStoreChatContent } from "../lib/chatbot/log"
import { dayInSeoul, usageNamespace } from "../lib/chatbot/runtime"

assert.equal(dayInSeoul(new Date("2026-08-24T14:59:59Z")), "2026-08-24")
assert.equal(dayInSeoul(new Date("2026-08-24T15:00:00Z")), "2026-08-25")

assert.equal(shouldStoreChatContent({}), false)
assert.equal(shouldStoreChatContent({ CHATBOT_LOG_CONTENT: "false" }), false)
assert.equal(shouldStoreChatContent({ CHATBOT_LOG_CONTENT: "true" }), true)

delete process.env.CHATBOT_USAGE_NAMESPACE
delete process.env.VERCEL_ENV
assert.equal(usageNamespace(), "development")
process.env.VERCEL_ENV = "preview"
assert.equal(usageNamespace(), "preview")
process.env.CHATBOT_USAGE_NAMESPACE = "qa-local"
assert.equal(usageNamespace(), "qa-local")
process.env.CHATBOT_USAGE_NAMESPACE = "qa local"
assert.throws(() => usageNamespace(), /invalid CHATBOT_USAGE_NAMESPACE/)
console.log("chatbot-runtime: PASS")
