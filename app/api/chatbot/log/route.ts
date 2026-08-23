import { NextResponse } from "next/server"
import {
  FALLBACK_ANSWER,
  FAQS,
  POLICIES,
  REVIEW_TOPICS,
  getNode,
} from "@/lib/chatbot/content"
import { logChat } from "@/lib/chatbot/log"
import { checkRateLimit, clientKey } from "@/lib/chatbot/ratelimit"
import type { LogKind } from "@/lib/chatbot/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * 클라이언트에서만 발생하는 대화 이벤트를 기록한다.
 *
 * 자유질문은 /api/chatbot/ask 가 답변 본문·근거까지 직접 남기므로 여기로 오지 않는다.
 * 여기로 오는 것은 두 가지뿐이다.
 *   - 버튼 클릭: 서버를 거치지 않으므로 클라이언트가 유일한 기록자다
 *   - ask 호출 실패: 클라이언트 엔진(정책·FAQ)이 대신 답한 경우
 *
 * 답변 본문은 클라이언트가 보낸 값을 쓰지 않고 refId 로 서버가 직접 찾는다.
 * 로그는 사후 확인용 근거이므로, 조작 가능한 입력을 그대로 적재하면 근거가 되지 못한다.
 */
/**
 * 클라이언트가 직접 기록할 수 있는 종류. ai_answer 는 서버(ask 라우트)만 남긴다 —
 * 클라이언트가 보내면 근거 없는 AI 답변 행이 생겨 통계를 오염시킨다.
 */
const CLIENT_KINDS = new Set<LogKind>(["button", "faq_hit", "policy_block", "fallback"])
const MAX_INPUT = 500

function resolveAnswer(kind: LogKind, refId: string | null): string | null {
  if (kind === "button") return refId ? (getNode(refId)?.message ?? null) : null
  if (kind === "faq_hit") return FAQS.find((f) => f.id === refId)?.answer ?? null
  if (kind === "policy_block") {
    return [...POLICIES, ...REVIEW_TOPICS].find((p) => p.id === refId)?.answer ?? null
  }
  if (kind === "fallback") return FALLBACK_ANSWER
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const kind = String(body?.kind ?? "") as LogKind
    if (!CLIENT_KINDS.has(kind)) {
      return NextResponse.json({ ok: false, error: "invalid kind" }, { status: 400 })
    }

    const sessionId = String(body?.sessionId ?? "").slice(0, 64) || "unknown"

    // 무인증 공개 POST 가 호출마다 DB 에 1행을 쓴다. 제한이 없으면 스크립트 한 줄로
    // 테이블을 무한히 채울 수 있다. ask 와 같은 세션·IP 단위 창을 쓴다.
    // 버튼 클릭은 AI 질문보다 훨씬 잦다(하위 흐름 탐색 시 분당 10회 이상). 30회로 둔다.
    const rl = checkRateLimit(`log|${clientKey(request, sessionId)}`, 30)
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
    }
    const refId = typeof body?.refId === "string" ? body.refId.slice(0, 64) : null
    const userInput =
      typeof body?.userInput === "string" ? body.userInput.slice(0, MAX_INPUT) : undefined

    await logChat({
      sessionId,
      kind,
      userInput,
      answer: resolveAnswer(kind, refId),
      // 서버가 응답하지 못해 클라이언트 엔진이 대신 답한 경우를 구분해 둔다.
      // 이 값이 늘면 답변 품질이 아니라 가용성 문제다.
      fallbackReason: body?.offline === true ? "server_unreachable" : null,
      refId,
      provider: "client",
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    // 로그 실패가 대화를 막으면 안 된다
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
