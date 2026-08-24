// 챗봇 도메인 타입.
// Phase C에서 content.ts → Supabase 테이블로 이관할 때 컬럼과 1:1로 대응된다.

export type ActionType = "tel" | "kakao" | "walla" | "email" | "link"

export type ChatAction = {
  id: string
  type: ActionType
  label: string
  /** tel: 전화번호 / kakao·walla·link: URL / email: 주소 */
  value: string
  hint?: string
}

export type ChatButton = {
  label: string
  /** 노드 전이 */
  goTo?: string
  /** 액션 카드 노출 (goTo와 배타) */
  actionId?: string
}

export type ChatNode = {
  id: string
  message: string
  actionIds?: string[]
  buttons: ChatButton[]
}

export type ChatFaq = {
  id: string
  category: string
  /** [0]이 대표 질문, 나머지는 유사 질문 */
  questions: string[]
  /** 매칭 가중치를 높일 핵심어 */
  keywords?: string[]
  answer: string
  actionIds?: string[]
}

/** KB 밖 주제를 AI 이전 단계에서 차단하는 규칙 */
export type ChatPolicy = {
  id: string
  label: string
  keywords: string[]
  answer: string
  actionIds?: string[]
}

export type MessageSource = "welcome" | "node" | "faq" | "policy" | "fallback" | "ai" | "kb"

export type ChatMessage = {
  id: string
  role: "bot" | "user"
  text: string
  source?: MessageSource
  actions?: ChatAction[]
  buttons?: ChatButton[]
}

/** 서버 로그 분류 (chatbot_logs.kind) */
export type LogKind = "button" | "faq_hit" | "policy_block" | "ai_answer" | "fallback"
