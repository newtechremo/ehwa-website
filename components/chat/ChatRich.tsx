"use client"

import type { ReactNode } from "react"

/**
 * 챗봇 말풍선 렌더러.
 *
 * KB 원본 답변(채널톡에 넣던 자료)에는 굵게·불릿·링크·소제목이 섞여 있다.
 * 이 콘텐츠는 DB에서 오므로 dangerouslySetInnerHTML을 쓰지 않고 직접 파싱해
 * XSS 경로를 만들지 않는다. 지원 범위를 넘는 마크업은 그대로 글자로 보여준다.
 */
export function ChatRich({ text }: { text: string }) {
  const lines = text.split("\n")
  const out: ReactNode[] = []
  let bullets: string[] = []
  let tableHead: string[] = []

  const flushBullets = (key: string) => {
    if (!bullets.length) return
    out.push(
      <ul key={`ul-${key}`} className="my-1 list-disc space-y-0.5 pl-5">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    // 표: "| 셀 | 셀 |" — KB 원문에 1,700줄 가까이 있다.
    // 말풍선 폭에 표를 그리면 읽기 어려워 "머리글: 값" 목록으로 편다.
    const isTableRow = /^\s*\|.*\|\s*$/.test(line)
    if (isTableRow) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      // 구분행(---|---)은 버린다
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return
      if (!tableHead.length) {
        tableHead = cells
      } else {
        const pairs = cells
          .map((c, ci) => (c ? `${tableHead[ci] ? `**${tableHead[ci]}** ` : ""}${c}` : ""))
          .filter(Boolean)
        bullets.push(pairs.join(" · "))
      }
      return
    }
    if (tableHead.length) tableHead = []

    // 불릿: "* 내용", "- 내용", "• 내용", "1. 내용"
    const bullet = line.match(/^\s*(?:[*\-•]|\d+\.)\s+(.*)$/)
    if (bullet) {
      bullets.push(bullet[1])
      return
    }
    flushBullets(String(i))

    // 인용구 "> 내용" — 참고·주의 문구에 쓰인다
    const quote = line.match(/^\s*>\s?(.*)$/)
    if (quote) {
      out.push(
        <p key={i} className="chat-quote my-1 border-l-4 border-[#004c28]/40 pl-2 text-[0.9em]">
          {renderInline(quote[1])}
        </p>,
      )
      return
    }

    // 구분선
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push(<hr key={i} className="my-2 border-[#dfe5e2]" />)
      return
    }

    // 소제목: "# ~", "## ~" → 굵은 줄로
    const head = line.match(/^\s*#{1,4}\s+(.*)$/)
    if (head) {
      out.push(
        <p key={i} className="mt-2 font-bold first:mt-0">
          {renderInline(head[1])}
        </p>,
      )
      return
    }

    if (line.trim() === "") {
      out.push(<div key={i} className="h-2" aria-hidden="true" />)
      return
    }

    out.push(<p key={i}>{renderInline(line)}</p>)
  })
  flushBullets("end")

  return <>{out}</>
}

/** 링크는 http(s)만 허용한다 (javascript: 등 차단) */
function safeHref(url: string): string | null {
  try {
    const u = new URL(url, "https://barrierfree.eumc.ac.kr")
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

function renderInline(text: string): ReactNode[] {
  // [텍스트](URL) 과 **굵게** 를 한 번에 분해
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const href = safeHref(link[2])
      if (href) {
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline underline-offset-2"
          >
            {link[1]}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        )
      }
      return <span key={i}>{link[1]}</span>
    }
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}
