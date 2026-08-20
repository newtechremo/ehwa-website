/**
 * KB 지식문서(59건) → Supabase kb_documents 적재
 *
 * 원본: docs/chatbot-assets/kb_md/NN_카테고리_세부주제.md
 * 형식: # [카테고리] 세부주제 / ## 예상 질문 (- "...") / ## 답변 가이드
 *
 * 실행: npm run kb:ingest            (.env.local 기준 = 로컬 Supabase)
 *       npm run kb:ingest -- --prod  (운영 Supabase, .env.tokens 필요)
 */
import { readFileSync, readdirSync } from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const DIR = "docs/chatbot-assets/kb_md"

type Doc = {
  doc_key: string
  seq: number
  category: string
  topic: string
  questions: string[]
  answer: string
  body: string
}

function parse(file: string): Doc | null {
  const raw = readFileSync(path.join(DIR, file), "utf8").replace(/\r\n/g, "\n")
  const base = file.replace(/\.md$/, "")

  const seqMatch = base.match(/^(\d+)_/)
  if (!seqMatch) return null // 00_AI_INSTRUCTION 등 번호 없는 지침 파일은 제외
  const seq = Number(seqMatch[1])
  if (seq === 0) return null

  // 제목: "# [카테고리] 세부주제"
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? base
  const cat = title.match(/^\[(.+?)\]\s*(.*)$/)
  const category = cat ? cat[1].trim() : "기타"
  const topic = cat ? cat[2].trim() : title

  // 예상 질문 섹션
  const qSection = raw.split(/^##\s*예상 질문\s*$/m)[1]?.split(/^##\s/m)[0] ?? ""
  const questions = [...qSection.matchAll(/^\s*[-*]\s*"?(.+?)"?\s*$/gm)]
    .map((m) => m[1].trim())
    // 원본 일부(병원 일반 13건)는 "- (예상 질문 없음)" 플레이스홀더만 있다.
    // 실제 질문이 아니므로 제외하고, 검색은 제목·본문 소제목으로 처리한다.
    .filter((q) => q && !/^\(?\s*예상\s*질문\s*없음\s*\)?$/.test(q))

  // 답변 가이드 섹션
  const aSection = raw.split(/^##\s*답변 가이드\s*$/m)[1] ?? ""
  const answer = aSection.replace(/^#\s+.*\n+/, "").trim()

  if (!answer) return null

  // 예상 질문이 없는 문서를 위해 답변의 소제목을 검색 보조어로 뽑는다
  if (questions.length === 0) {
    const heads = [...answer.matchAll(/^#{1,3}\s*(?:[①-⑳0-9.]+\s*)?(.+?)\s*$/gm)]
      .map((m) => m[1].replace(/[*_`]/g, "").trim())
      .filter((h) => h.length >= 2 && h.length <= 40)
    questions.push(topic, ...heads.slice(0, 12))
  }

  return { doc_key: base, seq, category, topic, questions, answer, body: raw.trim() }
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort()
const docs = files.map(parse).filter((d): d is Doc => d !== null)

console.log(`  파싱: ${docs.length}건 / md ${files.length}개`)
const noQ = docs.filter((d) => d.questions.length === 0)
if (noQ.length) console.log(`  ⚠ 예상질문 없는 문서 ${noQ.length}건: ${noQ.map((d) => d.seq).join(", ")}`)

const useProd = process.argv.includes("--prod")
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("  Supabase 환경변수가 없습니다 (.env.local 확인)")
  process.exit(1)
}
console.log(`  대상: ${useProd ? "운영" : "로컬"} ${url}`)

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { error } = await db.from("kb_documents").upsert(
  docs.map((d) => ({ ...d, published: true, updated_at: new Date().toISOString() })),
  { onConflict: "doc_key" },
)
if (error) {
  console.error("  적재 실패:", error.message)
  process.exit(1)
}

const { count } = await db.from("kb_documents").select("id", { count: "exact", head: true })
console.log(`  적재 완료 — kb_documents ${count}건`)

const byCat = docs.reduce<Record<string, number>>((a, d) => ((a[d.category] = (a[d.category] ?? 0) + 1), a), {})
console.log("  카테고리별:", Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join(" · "))
console.log(`  예상질문 총 ${docs.reduce((n, d) => n + d.questions.length, 0)}개`)
