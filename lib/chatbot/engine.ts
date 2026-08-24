import {
  FAQS,
  ROOT_NODE_ID,
  FALLBACK_ACTION_IDS,
  FALLBACK_ANSWER,
  POLICIES,
  REVIEW_TOPICS,
  getActions,
  getNode,
} from "./content"
import type { ChatFaq, ChatMessage, ChatPolicy, LogKind } from "./types"

export type EngineResult = {
  message: ChatMessage
  logKind: LogKind
  /** 로그에 남길 노드/FAQ/정책 ID */
  refId?: string
}

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 8)}`
}

export function userMessage(text: string): ChatMessage {
  return { id: nextId("u"), role: "user", text }
}

/** 한글 조사·기호·공백을 제거해 비교용 문자열로 정규화 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "")
    .trim()
}

/** 한국어는 형태소 분석 없이도 문자 2-gram 유사도가 잘 동작한다 */
function bigrams(s: string): Set<string> {
  const out = new Set<string>()
  if (s.length < 2) {
    if (s) out.add(s)
    return out
  }
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2))
  return out
}

function similarity(a: string, b: string): number {
  const A = bigrams(a)
  const B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  A.forEach((g) => {
    if (B.has(g)) inter += 1
  })
  return inter / (A.size + B.size - inter)
}

function matchesKeywords(rule: ChatPolicy, raw: string, norm: string): boolean {
  return rule.keywords.some((k) => {
    const nk = normalize(k)
    return nk.length > 0 && (norm.includes(nk) || raw.includes(k))
  })
}

/** 이용자가 실제 식별정보를 입력한 경우를 낱말이 아닌 형태로 탐지한다 */
const PII_PATTERNS = [
  /\d{6}\s*[-–]\s*\d{7}/,                        // 주민등록번호
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,  // 카드번호
]

export function containsPII(raw: string): boolean {
  return PII_PATTERNS.some((re) => re.test(raw))
}

const FAQ_THRESHOLD = 0.34
const FAQ_KEYWORD_BONUS = 0.18

/**
 * FAQ 유사도 비교에서만 제거하는 의문형 공통 표현.
 *
 * 실측: "제가 늦으면 어떻게 되나요?" 가 "연락 없이 안 가면 어떻게 되나요?"(노쇼 FAQ)에
 * 0.38로 매칭됐다. 내용어는 하나도 겹치지 않고 "어떻게 되나요" 어미만으로 임계값을
 * 넘긴 것이다. 의문사·종결 표현은 거의 모든 질문에 들어가므로 유사도에 기여하면 안 된다.
 *
 * 44개 한국어 FAQ용 휴리스틱이다. 부분 포함 판정과 키워드 보너스에는 적용하지 않으며
 * 클라이언트 번들이므로 서버용 kb.ts 의 토크나이저를 가져오지 않는다.
 * 실제 질문 QA에서 한계가 보이면 형태소 분석을 검토한다.
 */
const FAQ_NOISE =
  /(어떻게|어디서|어디|무엇|뭐|알려주세요|알려줘|도와주세요|도와줘|할수있나요|할수있어요|할수있어|할수있나|되나요|되나|하나요|하나|할까요|인가요|가요|나요|까요)/g

function faqKey(input: string): string {
  return normalize(input).replace(FAQ_NOISE, "")
}

/**
 * 잡음을 뺀 내용어가 이보다 짧은 FAQ 변형은 유사도 비교에 쓰지 않는다.
 * 실측: "예약은 어디서 해?" → 내용어 "예약은해"(4자). 이 네 글자를 품은 입력은 무엇이든
 * 0.5점을 받아 "진료 예약은 어떻게 해요?"(병원 예약, KB 46)가 편의지원 신청 FAQ 로 갔다.
 * 짧은 변형은 입력이 그 문장을 그대로 담고 있을 때(부분 포함 0.9)만 잡는다.
 */
const FAQ_MIN_KEY = 6

export function matchFaq(input: string): { faq: ChatFaq; score: number } | null {
  const raw = input.trim()
  const norm = normalize(raw)
  if (!norm) return null
  const key = faqKey(raw)

  let best: { faq: ChatFaq; score: number } | null = null

  for (const faq of FAQS) {
    let score = 0

    for (const q of faq.questions) {
      const nq = normalize(q)
      if (!nq) continue
      // 부분 포함 규칙 (2026-08-24 채널톡 실대화 재생에서 축소):
      //   변형 ⊂ 입력  → 입력이 더 구체적이므로 안전. 그대로 강한 신호(0.9).
      //   입력 ⊂ 변형  → 일반 질문이 더 구체적인 FAQ 로 끌려간다.
      //     실측: "무료인가요" ⊂ "서비스 이용하면 주차비 무료인가요?" → 비용 질문에 주차 안내.
      //     변형이 입력보다 4자 이내로만 길 때(사실상 같은 문장)만 인정한다.
      if (norm.length >= 4 && norm.includes(nq)) {
        score = Math.max(score, 0.9)
      } else if (norm.length >= 4 && nq.includes(norm) && nq.length <= norm.length + 4) {
        score = Math.max(score, 0.9)
      }
      // 유사도는 의문형 잡음을 뺀 내용어끼리 비교한다
      const fk = faqKey(q)
      if (fk.length >= FAQ_MIN_KEY) score = Math.max(score, similarity(key, fk))
    }

    const hits = (faq.keywords ?? []).filter((k) => {
      const nk = normalize(k)
      return nk.length > 1 && norm.includes(nk)
    }).length
    if (hits > 0) score += Math.min(hits, 2) * FAQ_KEYWORD_BONUS

    if (!best || score > best.score) best = { faq, score }
  }

  if (best && best.score >= FAQ_THRESHOLD) return best
  return null
}

function policyMessage(rule: ChatPolicy): ChatMessage {
  return {
    id: nextId("b"),
    role: "bot",
    text: rule.answer,
    source: "policy",
    actions: getActions(rule.actionIds),
    buttons: [
      { label: "처음으로", goTo: "root" },
      { label: "질문하기", goTo: "ask" },
    ],
  }
}

/**
 * 자유 입력 라우팅.
 * 순서가 곧 안전 정책이다: 검토대기 → 정책차단 → FAQ → (Phase B: AI) → Fallback
 * 앞의 두 단계는 어떤 경우에도 FAQ/AI보다 우선한다.
 */
/**
 * 대화 재시작·버튼 재노출 요청 (채널톡 실대화에서 관측된 메타 의도).
 * "처음부터 말하고 싶어요", "버튼질문 다시 알려줘" 가 담당자 연결로 떨어졌었다.
 * 실제 채널톡은 재안내로 응대했다. 내용 질문이 아니므로 KB/LLM 이전에 처리한다.
 */
// "다시 시작"은 넣지 않는다 — "서비스 다시 시작하고 싶어요"(재신청, KB 5)를 삼킨다.
const RESTART_INTENT = /(^처음부터|^처음으로|버튼.{0,6}(다시|보여|알려)|메뉴.{0,4}(다시|보여))/

export function routeFreeText(input: string): EngineResult {
  const raw = input.trim()
  const norm = normalize(raw)

  if (RESTART_INTENT.test(raw)) {
    const root = routeNode(ROOT_NODE_ID)
    if (root) return root
  }

  for (const rule of REVIEW_TOPICS) {
    if (matchesKeywords(rule, raw, norm)) {
      return { message: policyMessage(rule), logKind: "policy_block", refId: rule.id }
    }
  }

  for (const rule of POLICIES) {
    const hit =
      matchesKeywords(rule, raw, norm) || (rule.id === "policy-privacy" && containsPII(raw))
    if (hit) {
      return { message: policyMessage(rule), logKind: "policy_block", refId: rule.id }
    }
  }

  const faq = matchFaq(raw)
  if (faq) {
    return {
      message: {
        id: nextId("b"),
        role: "bot",
        text: faq.faq.answer,
        source: "faq",
        actions: getActions(faq.faq.actionIds),
        buttons: [
          { label: "처음으로", goTo: "root" },
          { label: "질문하기", goTo: "ask" },
        ],
      },
      logKind: "faq_hit",
      refId: faq.faq.id,
    }
  }

  // Phase B에서 이 자리에 AI 라우팅이 들어간다. 근거 문서를 못 찾으면 동일하게 아래로 떨어진다.
  return {
    message: {
      id: nextId("b"),
      role: "bot",
      text: FALLBACK_ANSWER,
      source: "fallback",
      actions: getActions(FALLBACK_ACTION_IDS),
      buttons: [
        { label: "처음으로", goTo: "root" },
        { label: "질문하기", goTo: "ask" },
      ],
    },
    logKind: "fallback",
  }
}

export function routeNode(nodeId: string): EngineResult | null {
  const node = getNode(nodeId)
  if (!node) return null
  return {
    message: {
      id: nextId("b"),
      role: "bot",
      text: node.message,
      source: node.id === "root" ? "welcome" : "node",
      actions: getActions(node.actionIds),
      buttons: node.buttons,
    },
    logKind: "button",
    refId: node.id,
  }
}
