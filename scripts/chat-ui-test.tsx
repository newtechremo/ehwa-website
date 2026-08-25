import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { ChatRich } from "../components/chat/ChatRich"

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

console.log("chat UI tests passed")
