"use client"

import type { ChatAction } from "@/lib/chatbot/types"

function hrefFor(action: ChatAction): string {
  switch (action.type) {
    case "tel":
      return `tel:${action.value.replace(/[^0-9+]/g, "")}`
    case "email":
      return `mailto:${action.value}`
    default:
      return action.value
  }
}

const ICONS: Record<ChatAction["type"], string> = {
  tel: "📞",
  kakao: "💛",
  walla: "📝",
  email: "✉️",
  link: "🔗",
}

/** 전화·카카오·신청서 등 외부 연결 카드. 채널톡의 연결 버튼과 동일 역할 */
export function ChatActionCard({ action }: { action: ChatAction }) {
  const href = hrefFor(action)
  const external = action.type !== "tel" && action.type !== "email"

  return (
    <a
      className="chat-action-card flex min-h-[2.75rem] items-center gap-2 rounded-xl border-2 border-[#004c28] bg-white px-3 py-2 text-[0.9375rem] font-bold text-[#004c28] no-underline transition-colors hover:bg-[#eaf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28]"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <span aria-hidden="true">{ICONS[action.type]}</span>
      <span className="flex flex-col text-left">
        <span>{action.label}</span>
        {action.hint ? (
          <span className="chat-action-hint text-[0.8125rem] font-normal text-[#4a4a4a]">{action.hint}</span>
        ) : null}
      </span>
      {external ? <span className="sr-only">(새 창에서 열림)</span> : null}
    </a>
  )
}
