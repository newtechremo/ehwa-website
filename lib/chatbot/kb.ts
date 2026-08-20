import { createClient } from "@supabase/supabase-js"

/**
 * KB 지식문서 검색.
 *
 * AI Instruction의 대원칙이 "KB 우선 — 일치하는 문서의 '답변 가이드'를 그대로 사용"이다.
 * 59개 문서가 각각 예상 질문을 약 10개씩(총 187개) 갖고 있으므로,
 * 상당수 질문은 LLM 없이 검색만으로 정확히 답할 수 있다.
 * LLM은 이 검색이 실패한 경우에만 사용한다(비용·지연·환각 모두 줄어든다).
 */

export type KbDoc = {
  id: number
  doc_key: string
  seq: number
  category: string
  topic: string
  questions: string[]
  answer: string
}

let cache: { at: number; docs: KbDoc[] } | null = null
const TTL_MS = 5 * 60 * 1000

export async function loadKb(): Promise<KbDoc[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.docs

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db
    .from("kb_documents")
    .select("id, doc_key, seq, category, topic, questions, answer")
    .eq("published", true)
    .order("seq")

  if (error || !data) return cache?.docs ?? []
  cache = { at: Date.now(), docs: data as KbDoc[] }
  return cache.docs
}

export function normalize(input: string): string {
  return input.toLowerCase().replace(/[^0-9a-z가-힣]/g, "").trim()
}

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

export type KbHit = { doc: KbDoc; score: number; matched: string }

/** 조사·어미를 떼어 검색용 토큰을 만든다 (형태소 분석기 없이 근사) */
const SUFFIXES = [
  "입니까","인가요","한가요","되나요","하나요","할까요","은가요","나요","까요","어요","에요","예요",
  "에서","으로","에게","한테","까지","부터","이랑","라도","이나","마다","조차","보다",
  "은","는","이","가","을","를","에","의","도","만","와","과","로","랑","께",
]

/**
 * 의문사·일반 동사 등 변별력 없는 낱말.
 * "외래 예약은 어떻게 하나요" 와 "어떻게 신청하나요" 는 의문형이 같다는 이유만으로
 * 문자 2-gram 유사도가 0.67까지 나온다(실측). 비교 전에 걸러낸다.
 */
const STOPWORDS = new Set([
  "어떻게","어떤","무엇","뭐가","뭔가","어디","어디서","언제","누가","누구","왜","얼마",
  "알려","알려주세","알려주","가능","되나","하나","인가","있나","없나","이나","저나",
  "문의","궁금","해주","해줘","주세","주시","합니","습니","해도","해야","할까","이야",
  "병원","서비스","이용","신청","안내","방법","확인","가요","이대목동",
])

export function tokenize(text: string): string[] {
  const out: string[] = []
  for (const raw of text.toLowerCase().split(/[^0-9a-z가-힣]+/)) {
    if (!raw) continue
    let t = raw
    for (const suf of SUFFIXES) {
      if (t.length > suf.length + 1 && t.endsWith(suf)) {
        t = t.slice(0, -suf.length)
        break
      }
    }
    if (t.length >= 2) out.push(t)
  }
  return out
}

/**
 * IDF 가중 토큰 커버리지.
 *
 * 단순 커버리지는 "예약", "어떻게", "병원" 같은 일반어까지 똑같이 세기 때문에
 * 엉뚱한 문서가 높은 점수를 받는다(실측: "외래 예약" → 편의지원 신청 절차 0.65).
 * 문서 빈도가 낮은 단어(외래·휠체어·응급실 등)에 가중치를 줘 변별력을 회복한다.
 */
function idfCoverage(queryTokens: string[], blob: string, idf: Map<string, number>): number {
  if (!queryTokens.length) return 0
  let total = 0
  let hit = 0
  for (const t of queryTokens) {
    const w = idf.get(t) ?? Math.log(60) // 코퍼스에 없는 단어는 최대 가중치
    total += w
    if (blob.includes(t)) hit += w
  }
  return total > 0 ? hit / total : 0
}

const idfCache = new WeakMap<object, Map<string, number>>()
function buildIdf(docs: KbDoc[]): Map<string, number> {
  const cached = idfCache.get(docs)
  if (cached) return cached

  const df = new Map<string, number>()
  for (const doc of docs) {
    const seen = new Set(tokenize([doc.topic, ...doc.questions, doc.answer.slice(0, 2500)].join(" ")))
    seen.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1))
  }
  const N = docs.length || 1
  const idf = new Map<string, number>()
  df.forEach((n, t) => idf.set(t, Math.log((N + 1) / (n + 0.5))))
  idfCache.set(docs, idf)
  return idf
}

/** 의문형·일반어를 제거한 내용어만 이어붙인 비교용 문자열 */
export function contentKey(text: string): string {
  return tokenize(text)
    .filter((t) => !STOPWORDS.has(t))
    .join("")
}

const blobCache = new WeakMap<KbDoc, string>()
function searchBlob(doc: KbDoc): string {
  let b = blobCache.get(doc)
  if (b === undefined) {
    b = normalize([doc.topic, doc.category, ...doc.questions, doc.answer.slice(0, 2500)].join(" "))
    blobCache.set(doc, b)
  }
  return b
}

/** 질문과 가장 가까운 문서들을 점수순으로 반환 */
export function rankKb(input: string, docs: KbDoc[], limit = 5): KbHit[] {
  const norm = normalize(input)
  if (!norm) return []
  const qTokens = tokenize(input)
  const idf = buildIdf(docs)
  const qKey = contentKey(input)

  const hits: KbHit[] = []
  for (const doc of docs) {
    // ① 예상 질문과의 문자 2-gram 유사도 (정확 표현에 강함)
    let best = 0
    let matched = ""
    for (const q of doc.questions) {
      const nq = normalize(q)
      if (!nq) continue
      // 원문 그대로의 일치는 강한 신호로 유지하되,
      // 유사도 자체는 내용어 기준으로 계산해 의문형 편향을 없앤다.
      let sc = similarity(qKey, contentKey(q))
      if (norm.length >= 5 && (norm.includes(nq) || nq.includes(norm))) sc = Math.max(sc, 0.88)
      if (sc > best) {
        best = sc
        matched = q
      }
    }

    // ② 주제명 유사도
    const topicScore = similarity(qKey, contentKey(doc.topic)) * 0.7
    if (topicScore > best) {
      best = topicScore
      matched = doc.topic
    }

    // ③ 본문 토큰 커버리지 — 표현이 달라도 핵심어가 문서에 있으면 잡아낸다.
    //    ①②를 대체하지 않고 더해 주는 보조 신호다.
    const cov = idfCoverage(qTokens, searchBlob(doc), idf)
    const score = Math.min(1, best + cov * 0.45)

    if (score > 0) hits.push({ doc, score, matched: matched || doc.topic })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

/**
 * 이 점수 이상이면 LLM 없이 '답변 가이드'를 그대로 내보낸다.
 *
 * 0.62로 보수적으로 잡았다. 근거:
 *  - 원본 예상질문과 거의 일치하는 질의는 0.70 이상이 나온다(골든셋 297건 전부).
 *  - 표현이 크게 다른 질의는 0.1~0.6에 흩어지고, 이 구간에서는 정답과 오답이 겹친다
 *    (실측: 오답 "외래 예약"→신청절차 0.53 vs 정답 "엘리베이터 위치" 0.53).
 *  - 따라서 이 구간은 직답하지 않고 LLM 판단에 넘긴다. LLM이 없으면 담당자 연결로
 *    떨어진다 — 틀린 답을 내보내는 것보다 안전하다.
 */
export const KB_DIRECT_THRESHOLD = 0.62
/** 이 점수 미만이면 LLM에게 넘길 후보로도 쓰지 않는다 */
export const KB_CANDIDATE_THRESHOLD = 0.18
