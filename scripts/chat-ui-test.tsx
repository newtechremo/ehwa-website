import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { ChatRich } from "../components/chat/ChatRich"
import { isolateModalBackground } from "../lib/chatbot/modal"

function render(text: string, showLinkPreview = true) {
  return renderToStaticMarkup(
    <ChatRich {...({ text, showLinkPreview } as Parameters<typeof ChatRich>[0])} />,
  )
}

const applyUrl = "https://walla.my/a/barrierfree_v"
const applyHtml = render(`온라인 신청서: ${applyUrl}`)
assert.match(applyHtml, new RegExp(`href="${applyUrl}"`), "일반 URL이 클릭 가능한 링크여야 한다")
assert.match(applyHtml, /class="chat-link-preview/, "일반 URL 아래에 링크 미리보기 카드가 있어야 한다")
assert.match(applyHtml, /온라인 신청서/, "신청 링크 카드는 용도를 설명해야 한다")
assert.match(applyHtml, /walla\.my/, "링크 카드는 목적지 도메인을 보여줘야 한다")

const twoLinksHtml = render(`${applyUrl}\nhttps://pf.kakao.com/_LKhxkn/chat`)
assert.equal(
  twoLinksHtml.match(/class="chat-link-preview/g)?.length,
  1,
  "메시지 하나에는 미리보기 카드 하나만 보여야 한다",
)

assert.doesNotMatch(
  render(`온라인 신청서: ${applyUrl}`, false),
  /class="chat-link-preview/,
  "사용자 메시지처럼 미리보기를 끈 경우 카드를 만들지 않아야 한다",
)

assert.doesNotMatch(
  render("무엇을 도와드릴까요?"),
  /class="chat-link-preview/,
  "URL이 없는 메시지에는 미리보기 카드를 만들지 않아야 한다",
)

type FakeElement = {
  inert: boolean
  contains: (element: unknown) => boolean
  ownerDocument?: unknown
}
const page = { inert: false, contains: () => false }
const alreadyInert = { inert: true, contains: () => false }
const widget: FakeElement = { inert: false, contains: (element) => element === widget }
const body = {
  children: [page, alreadyInert, widget],
  style: { overflow: "auto", position: "relative", top: "1px", width: "90%" },
}
const documentElement = { style: { overflow: "scroll", scrollBehavior: "smooth" } }
const restoredScroll: number[] = []
const restoreModes: string[] = []
widget.ownerDocument = {
  body,
  documentElement,
  defaultView: {
    scrollY: 500,
    scrollTo: (_x: number, y: number) => {
      restoredScroll.push(y)
      restoreModes.push(documentElement.style.scrollBehavior)
    },
  },
}

const restoreBackground = isolateModalBackground(widget as unknown as HTMLElement)
assert.equal(page.inert, true, "모달이 열리면 배경을 키보드·스크린리더 탐색에서 제외해야 한다")
assert.equal(alreadyInert.inert, true, "기존 inert 상태를 유지해야 한다")
assert.equal(widget.inert, false, "챗봇 자체는 inert 처리하면 안 된다")
assert.equal(body.style.overflow, "hidden", "모달이 열리면 body 스크롤을 잠가야 한다")
assert.equal(documentElement.style.overflow, "hidden", "모바일 브라우저에서도 문서 스크롤을 잠가야 한다")
assert.equal(body.style.position, "fixed", "모바일 루트 스크롤도 움직이지 않게 body를 고정해야 한다")
assert.equal(body.style.top, "-500px", "고정 중에도 기존 스크롤 위치 화면을 유지해야 한다")
assert.equal(body.style.width, "100%", "body 고정으로 레이아웃 너비가 줄면 안 된다")

restoreBackground()
assert.equal(page.inert, false, "모달이 닫히면 배경 inert 상태를 복원해야 한다")
assert.equal(alreadyInert.inert, true, "닫을 때 기존 inert 상태를 덮어쓰면 안 된다")
assert.equal(body.style.overflow, "auto", "닫을 때 기존 body overflow를 복원해야 한다")
assert.equal(documentElement.style.overflow, "scroll", "닫을 때 기존 문서 overflow를 복원해야 한다")
assert.equal(body.style.position, "relative", "닫을 때 기존 body position을 복원해야 한다")
assert.equal(body.style.top, "1px", "닫을 때 기존 body top을 복원해야 한다")
assert.equal(body.style.width, "90%", "닫을 때 기존 body width를 복원해야 한다")
assert.deepEqual(restoredScroll, [500], "닫을 때 사용자가 보던 스크롤 위치로 돌아가야 한다")
assert.deepEqual(restoreModes, ["auto"], "전역 smooth 설정과 무관하게 위치를 즉시 복원해야 한다")
assert.equal(documentElement.style.scrollBehavior, "smooth", "복원 뒤 기존 scroll behavior를 유지해야 한다")

console.log("chat UI tests passed")
