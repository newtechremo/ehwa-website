import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { EmbeddingModel, LanguageModel } from "ai"

/**
 * 챗봇이 쓸 LLM을 결정한다.
 *
 * 제공자를 코드에 고정하지 않는다. 환경변수만 바꿔 갈아탈 수 있어야
 * "임시 키 → 정식 키 → AI Gateway" 전환이 배포 설정 변경으로 끝난다.
 *
 *   CHATBOT_MODEL                   모델 식별자 (예: "google/gemini-3.5-flash-lite")
 *   GOOGLE_GENERATIVE_AI_API_KEY    있으면 Google 직접 연결
 *   (없으면)                         Vercel AI Gateway 경유 — 배포 환경에서는 OIDC로 자동 인증
 */

export type ModelChoice = {
  model: LanguageModel
  /** 진단·로그용 */
  provider: "google-direct" | "ai-gateway"
  id: string
}

export function resolveModel(): ModelChoice | null {
  const id = process.env.CHATBOT_MODEL?.trim()
  if (!id) return null

  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (googleKey) {
    // AI Gateway 표기("google/xxx")와 Google 직접 표기("xxx")를 모두 받는다
    const name = id.replace(/^google\//, "")
    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    return { model: google(name), provider: "google-direct", id: name }
  }

  // 문자열을 그대로 넘기면 AI SDK가 Gateway로 라우팅한다
  return { model: id as unknown as LanguageModel, provider: "ai-gateway", id }
}

export function resolveEmbeddingModel(): EmbeddingModel | null {
  const id = process.env.CHATBOT_EMBEDDING_MODEL?.trim()
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!id || !apiKey) return null
  const google = createGoogleGenerativeAI({ apiKey })
  return google.embedding(id.replace(/^google\//, ""))
}

export function providerErrorCode(error: unknown): string {
  const value = error as { statusCode?: unknown; code?: unknown; name?: unknown }
  return String(value?.statusCode ?? value?.code ?? value?.name ?? "unknown").slice(0, 64)
}
