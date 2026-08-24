import { createClient } from "@supabase/supabase-js"
import { embed } from "ai"
import { rankKb, type KbDoc } from "./kb"
import { providerErrorCode, resolveEmbeddingModel } from "./model"
import { consumeDailyBudget } from "./ratelimit"

export type Candidate = {
  docId: number
  docKey: string
  seq: number
  content: string
}

export type RetrievedContext = {
  status: "ok" | "budget_exhausted" | "budget_unavailable"
  method: "hybrid" | "lexical"
  chunks: Candidate[]
  docIds: string[]
  context: string
  embeddingAttempts: number
  embeddingErrorCode?: string
}

type RetrievalTurn = { role: "user" | "assistant"; text: string }

/** 짧은 후속 발화에만 직전 사용자 질문을 붙여 검색 근거가 사라지지 않게 한다. */
export function buildRetrievalQuery(question: string, history: RetrievalTurn[]): string {
  const cleaned = question.trim().replace(/^(?:고마워|감사해|감사합니다)[!,.?\s]*/, "") || question.trim()
  const followUp = /^(?:응+|네+|아니(?:요)?)(?:\s|$)/.test(cleaned) ||
    /지도/.test(cleaned) ||
    /^(?:엘리베이터|엘베)(?:요)?(?:\s|$)/.test(cleaned) ||
    /^(?:정문|후문|주차장|응급실)(?:\s|$|에|앞)/.test(cleaned) ||
    /^(?:본관|별관).*(?:층|에\s*(?:있|왔))/.test(cleaned) ||
    /(?:지금|현재|나는).*?(?:본관|별관|\d+\s*층)/.test(cleaned)
  if (!followUp) return cleaned
  const multiHop = /^(?:응+|네+|아니(?:요)?)(?:\s|$)/.test(cleaned) || /^(?:엘리베이터|엘베)/.test(cleaned)
  const previous = history.filter((turn) => turn.role === "user").slice(multiHop ? -2 : -1).map((turn) => turn.text.trim())
  const historyText = [...history.map((turn) => turn.text), cleaned].join(" ")
  const crossBuilding = /별관/.test(historyText) && previous.length > 0
  if (/^(?:응+|네+)(?:요)?[!,.?]*$/.test(cleaned)) {
    const prompt = history.findLast((turn) => turn.role === "assistant")?.text.trim().split(/\n+/).at(-1)?.trim()
    return [...previous, prompt, crossBuilding ? "본관 별관 연결통로" : ""].filter(Boolean).join("\n") || cleaned
  }
  return [...previous, cleaned, crossBuilding ? "본관 별관 연결통로" : ""].filter(Boolean).join("\n")
}

/** 생성 모델에는 짧은 후속 발화의 역할을 명시해 목적지와 현재 위치를 뒤바꾸지 않게 한다. */
export function buildGenerationQuestion(question: string, history: RetrievalTurn[], retrievalQuery = buildRetrievalQuery(question, history)): string {
  if (!retrievalQuery.includes("\n")) return retrievalQuery
  const users = history.filter((turn) => turn.role === "user").slice(-2).map((turn) => turn.text.trim())
  const prompt = history.findLast((turn) => turn.role === "assistant")?.text.trim().split(/\n+/).at(-1)?.trim()
  return [
    users[0] ? `직전 목적지 또는 요청: ${users[0]}` : "",
    users[1] ? `현재 위치 또는 중간 정보: ${users[1]}` : "",
    prompt ? `직전 안내의 마지막 질문: ${prompt}` : "",
    `현재 위치 또는 후속 요청: ${question.trim()}`,
    retrievalQuery.includes("본관 별관 연결통로")
      ? "관련 이동 근거: 문서의 본관-별관 연결통로 경로를 반대 방향에도 적용할 수 있습니다."
      : "",
    "위 정보를 하나의 요청으로 이어서 답해 주세요.",
  ].filter(Boolean).join("\n")
}

export function rrf(lists: Candidate[][], limit = 8): Candidate[] {
  const merged = new Map<number, { score: number; item: Candidate }>()
  for (const list of lists) {
    const seen = new Set<number>()
    list.forEach((item, index) => {
      if (seen.has(item.docId)) return
      seen.add(item.docId)
      const previous = merged.get(item.docId)
      merged.set(item.docId, {
        // 짧은 답변의 URL·핵심값과 semantic 상세 청크가 서로 덮어쓰지 않게 둘 다 보존한다.
        item: previous && previous.item.content !== item.content
          ? { ...item, content: `${previous.item.content}\n\n${item.content}` }
          : item,
        score: (previous?.score ?? 0) + 1 / (60 + index + 1),
      })
    })
  }
  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item)
}

export function buildContext(items: Candidate[], maxChars = 12_000): string {
  let context = ""
  for (const item of items) {
    const next = `<문서 ${item.seq}>\n${item.content}\n\n`
    if (context.length + next.length > maxChars) break
    context += next
  }
  return context.trim()
}

function lexicalCandidates(question: string, docs: KbDoc[]): Candidate[] {
  return rankKb(question, docs, 12).map(({ doc }) => ({
    docId: doc.id,
    docKey: doc.doc_key,
    seq: doc.seq,
    content: doc.short_answer ?? doc.answer.slice(0, 1800),
  }))
}

function result(method: "hybrid" | "lexical", chunks: Candidate[], embeddingAttempts: number, embeddingErrorCode?: string): RetrievedContext {
  return {
    status: "ok",
    method,
    chunks,
    docIds: chunks.map((chunk) => chunk.docKey),
    context: buildContext(chunks),
    embeddingAttempts,
    ...(embeddingErrorCode ? { embeddingErrorCode } : {}),
  }
}

export async function retrieveContext(question: string, sessionId: string, docs: KbDoc[]): Promise<RetrievedContext> {
  const lexical = lexicalCandidates(question, docs)
  const model = resolveEmbeddingModel()
  if (!model) return result("lexical", lexical.slice(0, 8), 0)

  const budget = await consumeDailyBudget(sessionId, "embedding")
  if (budget.status !== "allowed") {
    return {
      status: budget.status === "exhausted" ? "budget_exhausted" : "budget_unavailable",
      method: "lexical",
      chunks: [],
      docIds: [],
      context: "",
      embeddingAttempts: 0,
    }
  }

  try {
    const { embedding } = await embed({
      model,
      value: question,
      maxRetries: 0,
      providerOptions: { google: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" } },
    })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return result("lexical", lexical.slice(0, 8), 1, "database_unavailable")
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await db.rpc("match_kb_chunks", { p_embedding: embedding, p_limit: 12 })
    if (error || !data) {
      console.error("match_kb_chunks rpc 실패:", error?.message)
      return result("lexical", lexical.slice(0, 8), 1, "retrieval_rpc_error")
    }
    const semantic = (data as Array<{ document_id: number; doc_key: string; seq: number; content: string }>).map((row) => ({
      docId: row.document_id,
      docKey: row.doc_key,
      seq: row.seq,
      content: row.content,
    }))
    return result("hybrid", rrf([lexical, semantic]), 1)
  } catch (error) {
    return result("lexical", lexical.slice(0, 8), 1, providerErrorCode(error))
  }
}
