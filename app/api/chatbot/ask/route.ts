import { NextResponse, after } from "next/server"
import { generateText } from "ai"
import { randomUUID } from "node:crypto"
import {
  FALLBACK_ACTION_IDS,
  FALLBACK_ANSWER,
  FALLBACK_ANSWER_TEMPORARY,
  getActions,
} from "@/lib/chatbot/content"
import { routeFreeText } from "@/lib/chatbot/engine"
import { KB_DIRECT_THRESHOLD, loadKb, rankKb } from "@/lib/chatbot/kb"
import { logChat } from "@/lib/chatbot/log"
import { providerErrorCode, resolveModel } from "@/lib/chatbot/model"
import { checkRateLimit, clientKey, consumeDailyBudget } from "@/lib/chatbot/ratelimit"
import { retrieveContext } from "@/lib/chatbot/retrieval"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const preferredRegion = "icn1"
export const maxDuration = 30

const MAX_INPUT = 500
const MAX_OUTPUT_TOKENS = 700
/** 직전 대화만 참고한다. 길어지면 비용·지연이 늘고 오래된 맥락이 답변을 흐린다 */
const MAX_HISTORY_TURNS = 4
const MAX_HISTORY_CHARS = 300

type Turn = { role: "user" | "assistant"; text: string }

function readHistory(body: unknown): Turn[] {
  const raw = (body as { history?: unknown })?.history
  if (!Array.isArray(raw)) return []
  const turns: Turn[] = []
  for (const t of raw.slice(-MAX_HISTORY_TURNS)) {
    const role = (t as Turn)?.role
    const text = String((t as Turn)?.text ?? "").trim()
    if ((role === "user" || role === "assistant") && text) {
      turns.push({ role, text: text.slice(0, MAX_HISTORY_CHARS) })
    }
  }
  return turns
}

/**
 * 자유질문 처리.
 *
 * 순서가 곧 안전정책이다.
 *   ① 정책·검토대기 차단 (코드)        — LLM 이전에 무조건 우선
 *   ② FAQ 매칭 (코드)
 *   ③ KB 검색 직답 (코드)              — AI Instruction의 "KB 우선" 원칙 구현
 *   ④ LLM 라우팅+생성 (근거 문서 필수)  — ①~③이 모두 실패했을 때만
 *   ⑤ Fallback (담당자 연결)
 *
 * ④는 rate limit·일일 서킷브레이커 뒤에 있고, 한도를 넘거나 모델이 없으면
 * 조용히 ⑤로 강등된다. 즉 AI가 죽어도 챗봇은 계속 동작한다.
 *
 * 모든 분기는 "이용자에게 실제로 내보낸 답변"을 로그에 남긴다. 근거 문서 ID만
 * 남기면 매번 새로 생성되는 AI 답변을 복원할 수 없어 사후 확인이 불가능하다.
 */
export async function POST(request: Request) {
  const startedAt = Date.now()
  const requestId = randomUUID()
  let retrievalMethod = "none"
  let embeddingAttempts = 0
  let generationAttempts = 0
  let embeddingErrorCode: string | undefined = undefined
  let generationErrorCode: string | undefined
  let question = ""
  let sessionId = "unknown"
  let history: Turn[] = []
  try {
    const body = await request.json()
    question = String(body?.question ?? "").trim().slice(0, MAX_INPUT)
    sessionId = String(body?.sessionId ?? "unknown").slice(0, 64)
    history = readHistory(body)
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다.", requestId }, { status: 400 })
  }
  if (!question) return NextResponse.json({ error: "질문이 비어 있습니다.", requestId }, { status: 400 })

  const trace = () => ({
    requestId,
    retrievalMethod,
    embeddingAttempts,
    generationAttempts,
    modelAttempts: embeddingAttempts + generationAttempts,
    embeddingErrorCode,
    providerErrorCode: generationErrorCode,
  })
  const responseMeta = () => process.env.VERCEL_ENV === "production"
    ? { requestId }
    : { requestId, diagnostics: trace() }

  /**
   * fallback 응답 생성 + 로깅을 한 곳에 묶는다.
   * 이전에는 분기마다 logChat 을 따로 불러서 일부 경로(daily_limit, empty_after_strip)가
   * 로그 없이 빠져나갔다. 응답과 로그를 분리하면 반드시 다시 어긋난다.
   *
   * 로깅은 after() 로 감싼다. `void logChat(...)` fire-and-forget 은 서버리스에서
   * 응답 반환 직후 함수가 정지되면 인서트가 유실된다(실측: Preview 질문 5건 중
   * 로그 4행). after() 는 응답 완료 후에도 콜백 완료를 플랫폼이 보장한다.
   */
  // "몰라서 거절"과 "일시적으로 AI 를 못 써서 강등"은 이용자에게 다른 문구로 보인다.
  const TEMPORARY_REASONS = new Set(["daily_limit", "budget_unavailable", "model_error", "ai_unavailable"])
  const fallback = (reason: string, detail?: string) => {
    const answer = TEMPORARY_REASONS.has(reason) ? FALLBACK_ANSWER_TEMPORARY : FALLBACK_ANSWER
    after(() => logChat({
      sessionId,
      kind: "fallback",
      userInput: question,
      answer,
      fallbackReason: reason,
      latencyMs: Date.now() - startedAt,
      ...trace(),
    }))
    return NextResponse.json({
      source: "fallback",
      reason,
      ...(detail ? { detail } : {}),
      answer,
      actions: getActions(FALLBACK_ACTION_IDS) ?? null,
      refId: null,
      docIds: [],
      ...responseMeta(),
    })
  }

  // ①② 정책 차단 / FAQ — 기존 엔진과 동일한 판단을 재사용한다
  const routed = routeFreeText(question)
  if (routed.logKind !== "fallback") {
    after(() => logChat({
      sessionId,
      kind: routed.logKind,
      userInput: question,
      answer: routed.message.text,
      refId: routed.refId,
      latencyMs: Date.now() - startedAt,
      ...trace(),
    }))
    return NextResponse.json({
      source: routed.message.source,
      answer: routed.message.text,
      actions: routed.message.actions ?? null,
      refId: routed.refId ?? null,
      docIds: [],
      ...responseMeta(),
    })
  }

  // ③ KB 직답
  const docs = await loadKb()
  const hits = rankKb(question, docs, 5)
  const best = hits[0]

  // 직답은 예상질문과 직접 닮은 경우(qScore)만. 종합 점수는 커버리지 가산 때문에
  // 일반어 질의("진료 예약", "신청")에서 엉뚱한 문서를 임계 위로 밀어올렸다(실측).
  if (best && best.qScore >= KB_DIRECT_THRESHOLD) {
    const answer = best.doc.short_answer ?? best.doc.answer
    after(() => logChat({
      sessionId, kind: "ai_answer", userInput: question,
      answer,
      refId: best.doc.doc_key, sourceDocIds: [best.doc.doc_key],
      provider: "kb-direct",
      latencyMs: Date.now() - startedAt,
      ...trace(),
    }))
    return NextResponse.json({
      source: "kb",
      answer,
      actions: null,
      refId: best.doc.doc_key,
      docIds: [best.doc.doc_key],
      score: Number(best.score.toFixed(3)),
      ...responseMeta(),
    })
  }

  // ④ LLM — 여기서부터만 비용이 발생한다
  const choice = resolveModel()
  if (!choice) return fallback("ai_unavailable")

  const rl = checkRateLimit(clientKey(request, sessionId))
  if (!rl.ok) {
    return NextResponse.json(
      { source: "rate_limited", answer: "질문이 너무 빨라요. 잠시 후 다시 시도해 주세요.", retryAfterSec: rl.retryAfterSec, ...responseMeta() },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    )
  }

  const retrieved = await retrieveContext(question, sessionId, docs)
  retrievalMethod = retrieved.method
  embeddingAttempts = retrieved.embeddingAttempts
  embeddingErrorCode = retrieved.embeddingErrorCode
  if (retrieved.status === "budget_exhausted") return fallback("daily_limit")
  if (retrieved.status === "budget_unavailable") return fallback("budget_unavailable")
  if (!retrieved.context) return fallback("unanswerable")
  const context = retrieved.context

  const budget = await consumeDailyBudget(sessionId, "generation")
  if (budget.status === "exhausted") return fallback("daily_limit")
  if (budget.status === "unavailable") return fallback("budget_unavailable")

  const system = [
    "당신은 이대목동병원 장애인 이용편의 지원사업의 안내 챗봇 '편의지원 매니저'입니다.",
    "따뜻하고 친근한 해요체로, 짧고 명확하게 답하세요.",
    "설명이 길어지면 불렛(-)으로 끊어서 읽기 쉽게 정리하세요.",
    // 실제 채널톡은 답변 끝에 관련된 다음 안내를 제안한다(AI Instruction의 Response Style).
    "답변 끝에는 참고 문서 범위 안에서 이어서 도울 수 있는 것을 한 문장으로 제안하세요.",
    "다만 제안할 것이 마땅치 않으면 억지로 붙이지 마세요.",
    // 실대화 관측: 이용자가 위치만 말하는 후속 발화("지금 1층이에요")가 잦다.
    "이용자가 자기 위치만 말하면(예: '지금 1층이에요', '본관 앞이에요') 직전 대화의 주제를",
    "그 위치 기준으로 이어서 안내하세요. 직전 답변을 그대로 반복하지 말고 달라지는 부분만 알려주세요.",
    "",
    "절대 규칙:",
    "1. 아래 [참고 문서]에 있는 내용만으로 답하세요. 문서에 없으면 추측하지 마세요.",
    // 실사용 실측(2026-08-24): "지원되는 교통 서비스는?" 이 거절됐다. KB 는 전부
    // '이동·동행'이라는 낱말을 쓰는데 이용자는 '교통'이라고 묻는다. 낱말이 아니라
    // 뜻으로 문서를 찾되, 새로운 사실을 만드는 것은 여전히 금지다.
    "   단, 이용자의 낱말이 문서와 달라도 뜻이 같으면 그 문서로 답하세요.",
    "   (예: '교통/차편 지원' ≈ 이동·동행 지원, '통역' ≈ 수어·의사소통 지원)",
    "   이때 문서에 적힌 범위 제한(예: 병원 건물 내부 한정)도 함께 안내하세요.",
    "2. 의학적 진단·처방·치료 판단은 절대 하지 마세요.",
    "3. 전화번호·운영시간·주소·비용은 문서에 적힌 값을 그대로 쓰고 절대 지어내지 마세요.",
    "4. 참고 문서로 답할 수 없으면 사과나 설명 없이 정확히 `UNANSWERABLE` 한 단어만 출력하세요.",
    "   '정보가 없습니다' 같은 문장을 직접 쓰지 마세요. 안내는 시스템이 대신합니다.",
    "5. 질문이 편의지원·병원 이용과 무관하면(날씨·요리·투자 등) 역시 `UNANSWERABLE` 만 출력하세요.",
    "",
    "[참고 문서]",
    context,
  ].join("\n")

  let text = ""
  let usage: {
    tokensIn?: number | null
    tokensOut?: number | null
    tokensCached?: number | null
  } = {}

  try {
    generationAttempts = 1
    const res = await generateText({
      model: choice.model,
      system,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.text }) as const),
        { role: "user" as const, content: question },
      ],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      temperature: 0,
    })
    text = (res.text ?? "").trim()
    usage = {
      tokensIn: res.usage?.inputTokens ?? 0,
      tokensOut: res.usage?.outputTokens ?? 0,
      tokensCached: res.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
    }
  } catch (error) {
    generationErrorCode = providerErrorCode(error)
    console.error("chatbot ask - model error:", generationErrorCode)
    return fallback("model_error", process.env.VERCEL_ENV === "production" ? undefined : generationErrorCode)
  }

  if (!text || text.includes("UNANSWERABLE")) return fallback("unanswerable")

  // 모델이 UNANSWERABLE 대신 거절 문장을 쓰는 경우가 있다(실측: "정보가 없어
  // 답변드릴 수 없습니다"). 그대로 내보내면 담당자 연결 카드가 빠져 이용자가
  // 다음 행동을 못 한다. 거절로 판정해 표준 fallback으로 돌린다.
  const REFUSAL = /(정보(가|는)?\s*(없|가지고 있지 않))|((답변|안내)(을|를)?\s*(드릴|해 드릴)?\s*수\s*없)|(확인(이|해)?\s*어렵)/
  if (REFUSAL.test(text)) return fallback("model_refused")

  const cited = retrieved.docIds
  const answer = text.trim()
  if (!answer) return fallback("empty_after_strip")

  after(() => logChat({
    sessionId, kind: "ai_answer", userInput: question,
    answer,
    refId: cited[0], sourceDocIds: cited,
    provider: choice.provider, model: choice.id,
    latencyMs: Date.now() - startedAt,
    ...usage,
    ...trace(),
  }))
  return NextResponse.json({
    source: "ai",
    answer,
    actions: null,
    refId: cited[0],
    docIds: cited,
    ...(process.env.VERCEL_ENV === "production" ? {} : {
      usage: { used: budget.used, limit: budget.limit, day: budget.day, namespace: budget.namespace },
    }),
    provider: choice.provider,
    ...responseMeta(),
  })
}
