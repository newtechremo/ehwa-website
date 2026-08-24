import assert from "node:assert/strict"
import { evaluateAnswer } from "../lib/chatbot/answer-contract"

const contract = {
  required: [
    { id: "internal-pharmacy", all: ["약국", "동행"], any: ["원내", "병원 안", "병원 내부"] },
    { id: "kakao", exact: ["https://pf.kakao.com/_LKhxkn/chat"] },
  ],
  forbidden: [{ id: "external-only", all: ["외부 약국만"] }],
}

assert.deepEqual(
  evaluateAnswer("외부 약국까지는 어렵습니다. 약국 문의는 전화해 주세요.", contract).missing,
  ["internal-pharmacy", "kakao"],
)
assert.equal(
  evaluateAnswer("병원 안 원내 약국까지 동행합니다. https://pf.kakao.com/_LKhxkn/chat", contract).pass,
  true,
)
console.log("answer-contract: PASS")
