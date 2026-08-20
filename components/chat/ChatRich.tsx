"use client"

import type { ReactNode } from "react"

/**
 * 콘텐츠에서 쓰는 최소 마크다운(**굵게**, 줄바꿈)만 렌더한다.
 * dangerouslySetInnerHTML을 쓰지 않으므로 콘텐츠가 DB로 이관돼도 XSS 경로가 생기지 않는다.
 */
export function ChatRich({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {renderBold(line)}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  )
}

function renderBold(line: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}
