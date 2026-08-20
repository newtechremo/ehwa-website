import {
  FAQS,
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

export function matchFaq(input: string): { faq: ChatFaq; score: number } | null {
  const raw = input.trim()
  const norm = normalize(raw)
  if (!norm) return null

  let best: { faq: ChatFaq; score: number } | null = null

  for (const faq of FAQS) {
    let score = 0

    for (const q of faq.questions) {
      const nq = normalize(q)
      if (!nq) continue
      // 부분 포함은 강한 신호 (짧은 입력이 대표질문에 포함되는 경우 포함)
      if (norm.length >= 4 && (norm.includes(nq) || nq.includes(norm))) {
        score = Math.max(score, 0.9)
      }
      score = Math.max(score, similarity(norm, nq))
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
export function routeFreeText(input: string): EngineResult {
  const raw = input.trim()
  const norm = normalize(raw)

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
