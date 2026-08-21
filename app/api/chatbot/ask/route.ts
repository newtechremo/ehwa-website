import { NextResponse } from "next/server"
import { generateText } from "ai"
import {
  FALLBACK_ACTION_IDS,
  FALLBACK_ANSWER,
  getActions,
} from "@/lib/chatbot/content"
import { routeFreeText } from "@/lib/chatbot/engine"
import { KB_DIRECT_THRESHOLD, loadKb, rankKb } from "@/lib/chatbot/kb"
import { logChat } from "@/lib/chatbot/log"
import { resolveModel } from "@/lib/chatbot/model"
import { checkRateLimit, clientKey, consumeDailyBudget } from "@/lib/chatbot/ratelimit"

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
 */
export async function POST(request: Request) {
  let question = ""
  let sessionId = "unknown"
  let history: Turn[] = []
  try {
    const body = await request.json()
    question = String(body?.question ?? "").trim().slice(0, MAX_INPUT)
    sessionId = String(body?.sessionId ?? "unknown").slice(0, 64)
    history = readHistory(body)
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
  if (!choice) {
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

  // KB 전문을 한 번에 넣는다.
  //
  // 2단계(라우터로 후보 선별 → 생성)를 먼저 시도했으나 구조적 한계가 있었다.
  // 라우터에게 제목·예상질문만 보여주면 본문에만 있는 정보를 못 찾는다.
  // 실측: "엘리베이터 어디 있어요" → NONE. 실제로는 45·57·59 문서 본문에 있다.
  // 코퍼스가 59문서 약 21,500토큰뿐이라 전문을 매 요청에 넣어도
  // 모델 컨텍스트의 2%이고 질문당 약 $0.0065다. 선별 단계를 없애면
  // "검색이 못 찾아서 답을 못 하는" 실패 유형 자체가 사라진다.
  const candidates = docs.map((doc) => ({ doc }))
  // 문서 번호로 라벨링한다. 근거 표기를 긴 한글 문서키로 요구하면 모델이
  // 정확히 되풀이하지 못해 검증에서 탈락하는 일이 잦다(실측: no_citation 다발).
  const context = docs
    .map((d) => `<문서 ${d.seq}> ${d.topic}\n${d.answer}`)
    .join("\n\n---\n\n")

  const system = [
    "당신은 이대목동병원 장애인 이용편의 지원사업의 안내 챗봇입니다.",
    "따뜻하고 친근한 해요체로, 짧고 명확하게 답하세요.",
    "",
    "절대 규칙:",
    "1. 아래 [참고 문서]에 있는 내용만으로 답하세요. 문서에 없으면 추측하지 마세요.",
    "2. 의학적 진단·처방·치료 판단은 절대 하지 마세요.",
    "3. 전화번호·운영시간·주소·비용은 문서에 적힌 값을 그대로 쓰고 절대 지어내지 마세요.",
    "4. 답변 마지막 줄에 반드시 근거 문서 번호를 `[출처: 12]` 형식으로 표기하세요. 여러 개면 `[출처: 12, 34]`.",
    "5. 참고 문서로 답할 수 없으면 사과나 설명 없이 정확히 `UNANSWERABLE` 한 단어만 출력하세요.",
    "   '정보가 없습니다' 같은 문장을 직접 쓰지 마세요. 안내는 시스템이 대신합니다.",
    "6. 질문이 편의지원·병원 이용과 무관하면(날씨·요리·투자 등) 역시 `UNANSWERABLE` 만 출력하세요.",
    "",
    "[참고 문서]",
    context,
  ].join("\n")

  let text = ""
  try {
    const res = await generateText({
      model: choice.model,
      system,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.text }) as const),
        { role: "user" as const, content: question },
      ],
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

  // 모델이 UNANSWERABLE 대신 거절 문장을 쓰는 경우가 있다(실측: "정보가 없어
  // 답변드릴 수 없습니다"). 그대로 내보내면 담당자 연결 카드가 빠져 이용자가
  // 다음 행동을 못 한다. 거절로 판정해 표준 fallback으로 돌린다.
  const REFUSAL = /(정보(가|는)?\s*(없|가지고 있지 않))|((답변|안내)(을|를)?\s*(드릴|해 드릴)?\s*수\s*없)|(확인(이|해)?\s*어렵)/
  if (REFUSAL.test(text)) {
    void logChat({ sessionId, kind: "fallback", userInput: question })
    return fallback("model_refused")
  }

  const seqs = new Set<number>()
  for (const m of text.matchAll(/\[?\s*출처\s*[::]\s*([0-9,\s]+)\]?/g)) {
    for (const n of m[1].split(",")) {
      const v = Number(n.trim())
      if (Number.isInteger(v)) seqs.add(v)
    }
  }
  const cited = docs.filter((d) => seqs.has(d.seq)).map((d) => d.doc_key)
  if (cited.length === 0) {
    void logChat({ sessionId, kind: "fallback", userInput: question })
    return fallback("no_citation")
  }

  // 모델이 [출처: X] / 출처: [X] / 출처: X 등으로 다양하게 쓰므로 모두 걷어낸다.
  // 남은 홀괄호까지 정리하지 않으면 말풍선 끝에 "]" 같은 찌꺼기가 보인다(실측).
  const answer = text
    .replace(/\[?\s*출처\s*[::][^\]\n]*\]?/g, "")
    .replace(/^\s*[\]\[)(]\s*$/gm, "")
    .replace(/[\]\[]\s*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
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
