"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { BOT_NAME, BOT_ORG, ROOT_NODE_ID } from "@/lib/chatbot/content"
import { routeFreeText, routeNode, userMessage } from "@/lib/chatbot/engine"
import type { ChatButton, ChatMessage, LogKind } from "@/lib/chatbot/types"
import { ChatActionCard } from "./ChatActionCard"
import { ChatRich } from "./ChatRich"

const MAX_INPUT = 500
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getSessionId(): string {
  try {
    const KEY = "ehwa_chat_session"
    let v = sessionStorage.getItem(KEY)
    if (!v) {
      v = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(KEY, v)
    }
    return v
  } catch {
    return "s_anonymous"
  }
}

/** 로그는 실패해도 대화를 막지 않는다 (fire-and-forget) */
function log(kind: LogKind, opts: { input?: string; refId?: string }) {
  try {
    void fetch("/api/chatbot/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        kind,
        userInput: opts.input,
        refId: opts.refId,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* noop */
  }
}

export function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 관리자 화면에서는 노출하지 않는다 (채널톡 hideChannelButton과 동일 동작)
  const hidden = pathname?.startsWith("/admin") ?? false

  // 최초 오픈 시 웰컴 노드 주입
  useEffect(() => {
    if (open && messages.length === 0) {
      const r = routeNode(ROOT_NODE_ID)
      if (r) setMessages([r.message])
    }
  }, [open, messages.length])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, open])

  // 포커스 이동 + ESC 닫기 + 포커스 트랩
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    panel?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
        launcherRef.current?.focus()
        return
      }
      if (e.key !== "Tab" || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [open])

  const push = useCallback((msg: ChatMessage | ChatMessage[]) => {
    setMessages((prev) => prev.concat(msg))
  }, [])

  const handleButton = useCallback(
    (btn: ChatButton) => {
      push(userMessage(btn.label))
      if (!btn.goTo) return
      const r = routeNode(btn.goTo)
      if (!r) return
      log("button", { refId: r.refId })
      setPending(true)
      // 즉시 렌더하면 스크린리더가 사용자 발화와 봇 답변을 한 번에 읽어 혼동된다
      window.setTimeout(() => {
        push(r.message)
        setPending(false)
      }, 220)
    },
    [push],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || pending) return
      setInput("")
      push(userMessage(text))
      const r = routeFreeText(text)
      log(r.logKind, { input: text, refId: r.refId })
      setPending(true)
      window.setTimeout(() => {
        push(r.message)
        setPending(false)
        inputRef.current?.focus()
      }, 260)
    },
    [input, pending, push],
  )

  if (hidden || process.env.NEXT_PUBLIC_CHATBOT_ENABLED !== "true") return null

  return (
    <div className="chat-widget-root fixed bottom-0 right-0 z-[1900]">
      {/* 런처 */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ehwa-chat-panel"
        aria-label={open ? "상담 챗봇 닫기" : `${BOT_NAME}에게 문의하기`}
        className="chat-launcher fixed bottom-[1.125rem] right-[0.875rem] flex min-h-[3.5rem] min-w-[3.5rem] items-center gap-2 rounded-full border-2 border-white bg-[#004c28] px-4 py-3 text-[0.9375rem] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28] lg:bottom-6 lg:right-6"
      >
        <span aria-hidden="true" className="text-[1.25rem] leading-none">
          {open ? "✕" : "💬"}
        </span>
        {!open ? <span className="hidden sm:inline">무엇이든 물어보세요</span> : null}
      </button>

      {/* 패널 */}
      {open ? (
        <div
          id="ehwa-chat-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ehwa-chat-title"
          tabIndex={-1}
          className="chat-panel fixed inset-0 flex flex-col border-[#004c28] bg-white sm:inset-auto sm:bottom-[5.5rem] sm:right-4 sm:h-[min(37.5rem,80vh)] sm:w-[23.75rem] sm:rounded-2xl sm:border-2 sm:shadow-[0_12px_40px_rgba(0,0,0,0.25)] lg:right-6"
        >
          <header className="chat-header flex items-center justify-between gap-2 rounded-t-2xl bg-[#004c28] px-4 py-3 text-white">
            <div className="min-w-0">
              <p id="ehwa-chat-title" className="truncate text-[1rem] font-bold">
                {BOT_NAME}
              </p>
              <p className="truncate text-[0.8125rem] opacity-90">{BOT_ORG}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                launcherRef.current?.focus()
              }}
              aria-label="상담 챗봇 닫기"
              className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg text-[1.25rem] hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </header>

          <div
            className="chat-log flex-1 space-y-3 overflow-y-auto bg-[#f5f7f6] px-3 py-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="대화 내용"
          >
            {messages.map((m, idx) => (
              <div key={m.id}>
                <div className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "chat-bubble-user max-w-[85%] rounded-2xl rounded-br-sm bg-[#004c28] px-3 py-2 text-[0.9375rem] leading-relaxed text-white"
                        : "chat-bubble-bot max-w-[92%] rounded-2xl rounded-bl-sm border border-[#dfe5e2] bg-white px-3 py-2 text-[0.9375rem] leading-relaxed text-[#1a1a1a]"
                    }
                  >
                    {m.role === "bot" ? <span className="sr-only">{BOT_NAME}: </span> : <span className="sr-only">나: </span>}
                    <ChatRich text={m.text} />
                  </div>
                </div>

                {m.actions?.length ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {m.actions.map((a) => (
                      <ChatActionCard key={a.id} action={a} />
                    ))}
                  </div>
                ) : null}

                {m.buttons?.length && idx === messages.length - 1 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.buttons.map((b) => (
                      <button
                        key={`${m.id}-${b.label}`}
                        type="button"
                        onClick={() => handleButton(b)}
                        className="chat-quick-reply min-h-[2.75rem] rounded-full border-2 border-[#004c28] bg-white px-3 py-2 text-[0.875rem] font-bold text-[#004c28] transition-colors hover:bg-[#eaf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28]"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? (
              <p className="chat-pending text-[0.875rem] text-[#4a4a4a]">답변을 준비하고 있어요…</p>
            ) : null}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-bar flex items-center gap-2 border-t border-[#dfe5e2] bg-white px-3 py-3">
            <label htmlFor="ehwa-chat-input" className="sr-only">
              질문 입력
            </label>
            <input
              id="ehwa-chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
              maxLength={MAX_INPUT}
              autoComplete="off"
              placeholder="궁금한 점을 입력해 주세요"
              className="min-h-[2.75rem] flex-1 rounded-full border-2 border-[#dfe5e2] px-4 text-[0.9375rem] text-[#1a1a1a] focus-visible:border-[#004c28] focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-full bg-[#004c28] px-4 text-[0.9375rem] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28]"
            >
              보내기
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
