/**
 * 원본 Excel(FAQ 44건) → lib/chatbot/faqs.generated.ts 생성
 *
 * 원본: docs/chatbot-assets/faq_upload_template_ko-260105-.xlsx (채널톡 업로드본)
 * 시트 'FAQs(Fix Me)': id | language | question1~11 | answer | publishState
 *
 * 실행: npm run build:faq
 * 원본을 손으로 옮기지 않고 스크립트로 생성해, 원본이 갱신되면 재실행만 하면 되게 한다.
 */
import { readFileSync, writeFileSync } from "fs"
import * as XLSX from "xlsx"

const SRC = "docs/chatbot-assets/faq_upload_template_ko-260105-.xlsx"
const OUT = "lib/chatbot/faqs.generated.ts"

const wb = XLSX.read(readFileSync(SRC), { type: "buffer" })
const ws = wb.Sheets["FAQs(Fix Me)"]
if (!ws) throw new Error("시트 'FAQs(Fix Me)' 를 찾을 수 없습니다")

type Row = Record<string, unknown>
const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" })

/** 채널톡 답변은 최상위 h1으로 시작한다. 말풍선에서는 제목이 군더더기라 제거한다. */
function cleanAnswer(raw: string): string {
  let s = String(raw).replace(/\r\n/g, "\n").trim()
  s = s.replace(/^#\s+.*\n+/, "")
  s = s.replace(/^##+\s*/gm, "")          // 소제목 마크업 제거 (굵게는 유지)
  s = s.replace(/^\*\s+/gm, "• ")          // 불릿 통일
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

function q(v: unknown): string {
  return String(v ?? "").trim()
}

const faqs = rows
  .filter((r) => q(r.id) !== "" && q(r.answer) !== "")
  .map((r) => {
    const questions: string[] = []
    for (let i = 1; i <= 11; i += 1) {
      const v = q(r[`question${i}`])
      if (v) questions.push(v)
    }
    return {
      id: `faq-${q(r.id).padStart(2, "0")}`,
      questions,
      answer: cleanAnswer(q(r.answer)),
      publishState: q(r.publishState) || "published",
    }
  })
  .filter((f) => f.questions.length > 0)

const body = `// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 원본: ${SRC}
// 재생성: npm run build:faq
import type { ChatFaq } from "./types"

/** 채널톡 FAQ 업로드본 ${faqs.length}건 */
export const GENERATED_FAQS: ChatFaq[] = ${JSON.stringify(
  faqs.map((f) => ({ id: f.id, category: "FAQ", questions: f.questions, answer: f.answer })),
  null,
  2,
)}
`

writeFileSync(OUT, body, "utf8")
console.log(`  FAQ ${faqs.length}건 → ${OUT}`)
console.log(`  유사질문 총 ${faqs.reduce((n, f) => n + f.questions.length, 0)}개`)
