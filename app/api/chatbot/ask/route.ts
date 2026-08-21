import { NextResponse } from "next/server"
import { generateText } from "ai"
import {
  FALLBACK_ACTION_IDS,
  FALLBACK_ANSWER,
  getActions,
} from "@/lib/chatbot/content"
import { routeFreeText } from "@/lib/chatbot/engine"
import { KB_CANDIDATE_THRESHOLD, KB_DIRECT_THRESHOLD, loadKb, rankKb } from "@/lib/chatbot/kb"
import { logChat } from "@/lib/chatbot/log"
import { resolveModel } from "@/lib/chatbot/model"
import { checkRateLimit, clientKey, consumeDailyBudget } from "@/lib/chatbot/ratelimit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const preferredRegion = "icn1"
export const maxDuration = 30

const MAX_INPUT = 500
const MAX_OUTPUT_TOKENS = 700

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
 */
export async function POST(request: Request) {
  let question = ""
  let sessionId = "unknown"
  try {
    const body = await request.json()
    question = String(body?.question ?? "").trim().slice(0, MAX_INPUT)
    sessionId = String(body?.sessionId ?? "unknown").slice(0, 64)
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
  if (!question) return NextResponse.json({ error: "질문이 비어 있습니다." }, { status: 400 })

  // ①② 정책 차단 / FAQ — 기존 엔진과 동일한 판단을 재사용한다
  const routed = routeFreeText(question)
  if (routed.logKind !== "fallback") {
    void logChat({ sessionId, kind: routed.logKind, userInput: question, refId: routed.refId })
    return NextResponse.json({
      source: routed.message.source,
      answer: routed.message.text,
      actions: routed.message.actions ?? null,
      refId: routed.refId ?? null,
      docIds: [],
    })
  }

  // ③ KB 직답
  const docs = await loadKb()
  const hits = rankKb(question, docs, 5)
  const best = hits[0]

  if (best && best.score >= KB_DIRECT_THRESHOLD) {
    void logChat({
      sessionId, kind: "ai_answer", userInput: question,
      refId: best.doc.doc_key, sourceDocIds: [best.doc.doc_key],
    })
    return NextResponse.json({
      source: "kb",
      answer: best.doc.answer,
      actions: null,
      refId: best.doc.doc_key,
      docIds: [best.doc.doc_key],
      score: Number(best.score.toFixed(3)),
    })
  }

  // ④ LLM — 여기서부터만 비용이 발생한다
  const choice = resolveModel()
  const candidates = hits.filter((h) => h.score >= KB_CANDIDATE_THRESHOLD)

  if (!choice || candidates.length === 0) {
    void logChat({ sessionId, kind: "fallback", userInput: question })
    return fallback("ai_unavailable")
  }

  const rl = checkRateLimit(clientKey(request, sessionId))
  if (!rl.ok) {
    return NextResponse.json(
      { source: "rate_limited", answer: "질문이 너무 빨라요. 잠시 후 다시 시도해 주세요.", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    )
  }

  const budget = await consumeDailyBudget()
  if (!budget.ok) return fallback("daily_limit")

  const context = candidates
    .map((h) => `[${h.doc.doc_key}]\n제목: ${h.doc.topic}\n내용:\n${h.doc.answer}`)
    .join("\n\n---\n\n")

  const system = [
    "당신은 이대목동병원 장애인 이용편의 지원사업의 안내 챗봇입니다.",
    "따뜻하고 친근한 해요체로, 짧고 명확하게 답하세요.",
    "",
    "절대 규칙:",
    "1. 아래 [참고 문서]에 있는 내용만으로 답하세요. 문서에 없으면 추측하지 마세요.",
    "2. 의학적 진단·처방·치료 판단은 절대 하지 마세요.",
    "3. 전화번호·운영시간·주소·비용은 문서에 적힌 값을 그대로 쓰고 절대 지어내지 마세요.",
    "4. 답변 마지막 줄에 반드시 근거 문서 키를 `[출처: 문서키]` 형식으로 표기하세요.",
    "5. 참고 문서로 답할 수 없으면 답변 대신 정확히 `UNANSWERABLE` 만 출력하세요.",
    "",
    "[참고 문서]",
    context,
  ].join("\n")

  let text = ""
  try {
    const res = await generateText({
      model: choice.model,
      system,
      prompt: question,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    })
    text = (res.text ?? "").trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("chatbot ask - model error:", msg)
    // 운영에서는 내부 오류를 노출하지 않고, preview/로컬에서만 진단용으로 실어보낸다
    return fallback("model_error", process.env.VERCEL_ENV === "production" ? undefined : msg.slice(0, 300))
  }

  // ④-검증: 근거 문서를 대지 못한 답변은 사용자에게 내보내지 않는다
  if (!text || text.includes("UNANSWERABLE")) {
    void logChat({ sessionId, kind: "fallback", userInput: question })
    return fallback("unanswerable")
  }

  const cited = candidates.map((c) => c.doc.doc_key).filter((k) => text.includes(k))
  if (cited.length === 0) return fallback("no_citation")

  const answer = text.replace(/\[출처:[^\]]*\]/g, "").trim()
  if (!answer) return fallback("empty_after_strip")

  void logChat({
    sessionId, kind: "ai_answer", userInput: question, refId: cited[0], sourceDocIds: cited,
  })
  return NextResponse.json({
    source: "ai",
    answer,
    actions: null,
    refId: cited[0],
    docIds: cited,
    usage: { used: budget.used, limit: budget.limit },
    provider: choice.provider,
  })
}

function fallback(reason: string, detail?: string) {
  // 호출부에서 질문·세션을 알 수 없으므로 로그는 각 분기에서 남긴다
  return NextResponse.json({
    source: "fallback",
    reason,
    ...(detail ? { detail } : {}),
    answer: FALLBACK_ANSWER,
    actions: getActions(FALLBACK_ACTION_IDS) ?? null,
    refId: null,
    docIds: [],
  })
}
