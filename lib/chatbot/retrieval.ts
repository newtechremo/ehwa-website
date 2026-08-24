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

export function rrf(lists: Candidate[][], limit = 8): Candidate[] {
  const merged = new Map<number, { score: number; item: Candidate }>()
  for (const list of lists) {
    const seen = new Set<number>()
    list.forEach((item, index) => {
      if (seen.has(item.docId)) return
      seen.add(item.docId)
      const previous = merged.get(item.docId)
      merged.set(item.docId, {
        item: previous?.item ?? item,
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
