"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { BACK_NODE_ID, BOT_NAME, BOT_ORG, INPUT_PLACEHOLDER, ROOT_NODE_ID } from "@/lib/chatbot/content"
import { routeFreeText, routeNode, userMessage } from "@/lib/chatbot/engine"
import type { ChatButton, ChatMessage, LogKind } from "@/lib/chatbot/types"
import { ChatActionCard } from "./ChatActionCard"
import { ChatRich } from "./ChatRich"

const MAX_INPUT = 500
/** 자유질문 답변 하단 — 실제 채널톡과 동일하게 종료형 버튼만 노출 */
const BACK_BUTTONS: ChatButton[] = [
  { label: "처음으로", goTo: "root" },
  { label: "질문하기", goTo: "ask" },
]
const FALLBACK_TEXT = "답변을 가져오지 못했어요. 편의지원팀으로 문의해 주세요."

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

const CHAT_REQUEST_TIMEOUT_MS = 15_000

/** 로그는 실패해도 대화를 막지 않는다 (fire-and-forget) */
function log(kind: LogKind, opts: { input?: string; refId?: string; offline?: boolean }) {
  try {
    void fetch("/api/chatbot/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        kind,
        userInput: opts.input,
        refId: opts.refId,
        offline: opts.offline ?? false,
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
  // "이전 단계로" 는 방문 이력을 되짚는다 (원본 정책: 모든 답변에 이전 단계 버튼)
  const [nodeHistory, setNodeHistory] = useState<string[]>([])

  const panelRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 관리자 화면에서는 노출하지 않는다 (채널톡 hideChannelButton과 동일 동작)
  const hidden = pathname?.startsWith("/admin") ?? false

  // 최초 오픈 시 웰컴 노드 주입.
  // effect 안에서 setState 하면 열림 → 렌더 → 웰컴 주입 → 재렌더로 두 번 그린다.
  // 열기 이벤트에서 바로 넣으면 한 번에 그려지고 스크린리더도 한 번만 읽는다.
  const openPanel = useCallback(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      const r = routeNode(ROOT_NODE_ID)
      return r ? [r.message] : prev
    })
    setNodeHistory((prev) => (prev.length > 0 ? prev : [ROOT_NODE_ID]))
    setOpen(true)
  }, [])

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
      if (!btn.goTo) return
      push(userMessage(btn.label))

      let target = btn.goTo
      if (target === BACK_NODE_ID) {
        // 직전 노드로. 이력이 비면 처음으로 돌아간다.
        const prev = nodeHistory[nodeHistory.length - 2] ?? ROOT_NODE_ID
        setNodeHistory((h) => (h.length > 1 ? h.slice(0, -1) : [ROOT_NODE_ID]))
        target = prev
      } else {
        setNodeHistory((h) => (h[h.length - 1] === target ? h : h.concat(target)))
      }

      const r = routeNode(target)
      if (!r) return
      log("button", { refId: r.refId })
      setPending(true)
      // 즉시 렌더하면 스크린리더가 사용자 발화와 봇 답변을 한 번에 읽어 혼동된다
      window.setTimeout(() => {
        push(r.message)
        setPending(false)
      }, 220)
    },
    [push, nodeHistory],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || pending) return
      setInput("")
      push(userMessage(text))
      setPending(true)

      // 서버가 정책 → FAQ → KB 검색 → AI → fallback 순으로 판단한다.
      // 서버가 응답하지 못하면 클라이언트 엔진(정책·FAQ)만으로 즉시 대응한다.
      try {
        // 직전 대화만 보낸다. 길게 보내면 비용·지연이 늘고 오래된 맥락이 답변을 흐린다.
        // 버튼으로 출력된 안내문은 맥락으로 쓰지 않고, 사람이 쓴 질문과 답변만 보낸다.
        const history = messages
          .filter((m) => m.role === "user" || m.source === "ai" || m.source === "faq")
          .slice(-4)
          .map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            text: m.text.slice(0, 300),
          }))

        const res = await fetch("/api/chatbot/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text, sessionId: getSessionId(), history }),
          // 서버 maxDuration 30초보다 짧게 끊는다. 그 이상 기다리게 두면 이용자는
          // 멈춘 것으로 보고 창을 닫는다. 초과·단절·비정상 JSON 은 아래 catch 의
          // 로컬 엔진(정책·FAQ·담당자 연결)으로 강등해 무한 대기를 만들지 않는다.
          signal: AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS),
        })
        const data = await res.json()
        // 429 는 유효한 answer(잠시 후 재시도 안내)를 주므로 그대로 보여준다.
        // 400/500 의 오류 JSON 이나 answer 가 없는 응답은 로컬 fallback 으로 보낸다.
        if (typeof data?.answer !== "string" || !data.answer.trim()) {
          throw new Error(`invalid chatbot response: ${res.status}`)
        }
        push({
          id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "bot",
          text: data?.answer || FALLBACK_TEXT,
          source: data?.source === "ai" ? "ai" : data?.source === "kb" ? "node" : "fallback",
          actions: data?.actions ?? undefined,
          buttons: BACK_BUTTONS,
        })
        // 서버 로깅 없음: /api/chatbot/ask 가 답변 본문·근거까지 직접 남긴다.
        // 여기서 또 남기면 질문 1건에 로그가 2행 쌓여 통계가 2배로 부풀려진다(실측).
      } catch {
        const r = routeFreeText(text)
        push(r.message)
        log(r.logKind, { input: text, refId: r.refId, offline: true })
      } finally {
        setPending(false)
        inputRef.current?.focus()
      }
    },
    [input, pending, push, messages],
  )

  if (hidden || process.env.NEXT_PUBLIC_CHATBOT_ENABLED !== "true") return null

  return (
    <div className="chat-widget-root fixed bottom-0 right-0 z-[2100]">
      {/* 런처 */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-controls="ehwa-chat-panel"
        aria-label={open ? "상담 챗봇 닫기" : `${BOT_NAME}에게 문의하기`}
        className="chat-launcher fixed bottom-[1.125rem] right-[0.875rem] flex min-h-[3.5rem] min-w-[3.5rem] items-center gap-2 rounded-full border-2 border-white bg-[#004c28] px-4 py-3 text-[0.9375rem] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28] lg:bottom-6 lg:right-6"
      >
        {open ? (
          <span aria-hidden="true" className="text-[1.25rem] leading-none">
            ✕
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/chatbot-launcher.png"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-full object-contain"
          />
        )}
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
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/chatbot-avatar.svg"
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5"
              />
              <div className="min-w-0">
              <p id="ehwa-chat-title" className="truncate text-[1rem] font-bold">
                {BOT_NAME}
              </p>
              <p className="truncate text-[0.8125rem] opacity-90">{BOT_ORG}</p>
              </div>
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
              placeholder={INPUT_PLACEHOLDER}
              className="min-h-[2.75rem] w-0 flex-1 rounded-full border-2 border-[#dfe5e2] px-4 text-[0.9375rem] text-[#1a1a1a] focus-visible:border-[#004c28] focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              className="flex min-h-[2.75rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#004c28] px-4 text-[0.9375rem] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004c28]"
            >
              보내기
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
