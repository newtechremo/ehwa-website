import { createClient } from "@supabase/supabase-js"
import { usageNamespace } from "./runtime"
import type { LogKind } from "./types"

/**
 * 서버측 대화 로그.
 *
 * 클라이언트 로그만으로는 "어떤 KB 문서를 근거로 답했는가"를 남길 수 없다.
 * 인수인계 문서 11장 체크리스트의 "답변과 함께 사용한 근거 문서가 로그에 기록된다"
 * 요건을 충족하려면 답변을 만든 서버가 직접 기록해야 한다.
 *
 * answer 를 함께 남기는 이유: AI 답변은 매번 새로 생성되므로 근거 문서 ID만으로는
 * 이용자가 실제로 본 문장을 복원할 수 없다. 병원 서비스에서 안내 내용에 대한
 * 문의가 들어오면 확인할 근거가 필요하다(채널톡은 대화 전문을 남긴다).
 *
 * 로그 실패가 대화를 막으면 안 되므로 모든 예외를 삼킨다.
 */
const MAX_INPUT = 500
/** 답변은 질문보다 길다. maxOutputTokens 700 기준 한국어 약 1,500자를 넘지 않는다 */
const MAX_ANSWER = 4000

export function maskPII(text: string): string {
  return text
    .replace(/\d{6}\s*[-–]\s*\d{7}/g, "[주민번호]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[카드번호]")
    .replace(/01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[휴대전화]")
    .replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[이메일]")
}

export type ChatLogEntry = {
  requestId?: string | null
  sessionId: string
  kind: LogKind
  userInput?: string
  /** 이용자에게 실제로 내보낸 답변 본문 */
  answer?: string | null
  /** fallback 으로 떨어진 사유 (unanswerable / no_citation / model_error 등) */
  fallbackReason?: string | null
  refId?: string | null
  sourceDocIds?: string[]
  provider?: string | null
  model?: string | null
  latencyMs?: number | null
  tokensIn?: number | null
  tokensOut?: number | null
  tokensCached?: number | null
  retrievalMethod?: string | null
  embeddingAttempts?: number | null
  generationAttempts?: number | null
  modelAttempts?: number | null
  embeddingErrorCode?: string | null
  providerErrorCode?: string | null
}

function int(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null
}

export async function logChat(entry: ChatLogEntry): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    await db.from("chatbot_logs").insert({
      request_id: entry.requestId ?? null,
      env: usageNamespace(),
      session_id: entry.sessionId.slice(0, 64) || "unknown",
      kind: entry.kind,
      user_input: entry.userInput ? maskPII(entry.userInput.slice(0, MAX_INPUT)) : null,
      // 답변에도 마스킹을 건다. 이용자가 남긴 연락처를 모델이 되풀이할 수 있다.
      answer: entry.answer ? maskPII(entry.answer.slice(0, MAX_ANSWER)) : null,
      fallback_reason: entry.fallbackReason ?? null,
      ref_id: entry.refId ? String(entry.refId).slice(0, 64) : null,
      source_doc_ids: entry.sourceDocIds?.length ? entry.sourceDocIds : null,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      latency_ms: int(entry.latencyMs),
      tokens_in: int(entry.tokensIn),
      tokens_out: int(entry.tokensOut),
      tokens_cached: int(entry.tokensCached),
      retrieval_method: entry.retrievalMethod ?? null,
      embedding_attempts: int(entry.embeddingAttempts),
      generation_attempts: int(entry.generationAttempts),
      model_attempts: int(entry.modelAttempts),
      embedding_error_code: entry.embeddingErrorCode?.slice(0, 64) ?? null,
      provider_error_code: entry.providerErrorCode?.slice(0, 64) ?? null,
    })
  } catch {
    /* 로그 실패는 무시 */
  }
}
