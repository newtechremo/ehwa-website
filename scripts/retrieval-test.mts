import assert from "node:assert/strict"
import { selectLocationAnswer, type KbDoc } from "../lib/chatbot/kb"
import { buildContext, buildGenerationQuestion, buildRetrievalQuery, rrf, type Candidate } from "../lib/chatbot/retrieval"

const item = (seq: number, content = `문서 ${seq}`): Candidate => ({
  docId: seq,
  docKey: `${seq}_doc`,
  seq,
  content,
})

const merged = rrf([
  [item(55), item(19), item(6)],
  [item(6, "같은 문서의 다른 chunk"), item(6, "중복 chunk"), item(24), item(25)],
])
assert.equal(merged[0].seq, 6)
assert.equal(merged[0].content, "문서 6\n\n같은 문서의 다른 chunk")
assert.equal(new Set(merged.map((candidate) => candidate.docId)).size, merged.length)
assert.equal(merged.length, 5)

const context = buildContext([item(1, "가".repeat(7_000)), item(2, "나".repeat(7_000))])
assert.ok(context.length <= 12_000)
assert.match(context, /<문서 1>/)
assert.doesNotMatch(context, /<문서 2>/)

const history = [
  { role: "user" as const, text: "채혈실이 어디에 있어요?" },
  { role: "assistant" as const, text: "현재 위치를 알려주세요." },
]
assert.equal(buildRetrievalQuery("정문", history), "채혈실이 어디에 있어요?\n정문")
assert.equal(buildRetrievalQuery("응 지도 알려줘", history), "채혈실이 어디에 있어요?\n응 지도 알려줘")
const confirmationHistory = [
  { role: "user" as const, text: "나는 지금 본관 1층에 있어" },
  { role: "assistant" as const, text: "가까운 화장실은 정형외과 앞이에요.\n병원 내부 길찾기 지도가 필요하신가요?" },
]
assert.equal(
  buildRetrievalQuery("응응", confirmationHistory),
  "나는 지금 본관 1층에 있어\n병원 내부 길찾기 지도가 필요하신가요?",
)
const multiHopHistory = [
  { role: "user" as const, text: "청소년과 위치 알려줘" },
  { role: "assistant" as const, text: "소아청소년과는 별관 B동 2층이에요." },
  { role: "user" as const, text: "응급실 앞" },
  { role: "assistant" as const, text: "추가로 도움이 필요하신가요?" },
]
assert.equal(
  buildRetrievalQuery("응응 엘베 위주로", multiHopHistory),
  "청소년과 위치 알려줘\n응급실 앞\n응응 엘베 위주로\n본관 별관 연결통로",
)
assert.equal(
  buildRetrievalQuery("응급실 앞", multiHopHistory.slice(0, 2)),
  "청소년과 위치 알려줘\n응급실 앞\n본관 별관 연결통로",
)
assert.equal(
  buildRetrievalQuery("엘베요", [
    { role: "user", text: "소화기내과는 어떻게 가요?" },
    { role: "user", text: "주차장에 있어요" },
  ]),
  "소화기내과는 어떻게 가요?\n주차장에 있어요\n엘베요",
)
assert.equal(
  buildGenerationQuestion("별관B동 8층이에요", [
    { role: "user", text: "소화기내과 어떻게 가요?" },
    { role: "assistant", text: "현재 위치를 알려주세요." },
  ]),
  "직전 목적지 또는 요청: 소화기내과 어떻게 가요?\n직전 안내의 마지막 질문: 현재 위치를 알려주세요.\n현재 위치 또는 후속 요청: 별관B동 8층이에요\n관련 이동 근거: 문서의 본관-별관 연결통로 경로를 반대 방향에도 적용할 수 있습니다.\n위 정보를 하나의 요청으로 이어서 답해 주세요.",
)
assert.equal(
  buildRetrievalQuery("별관B동 8층이에요", [
    { role: "user", text: "소화기내과 어떻게 가요?" },
    { role: "assistant", text: "현재 위치를 알려주세요." },
  ]),
  "소화기내과 어떻게 가요?\n별관B동 8층이에요\n본관 별관 연결통로",
)
assert.equal(buildGenerationQuestion("지원가능한 장애유형은?", history), "지원가능한 장애유형은?")
assert.equal(buildRetrievalQuery("고마워 소화기내과 위치 알려줘", history), "소화기내과 위치 알려줘")
assert.equal(buildRetrievalQuery("지원가능한 장애유형은 뭐뭐있어?", history), "지원가능한 장애유형은 뭐뭐있어?")
assert.equal(
  buildRetrievalQuery("나는 지금 본관 1층에 있어", [{ role: "user", text: "장애인 화장실은 어디에 있나요?" }]),
  "장애인 화장실은 어디에 있나요?\n나는 지금 본관 1층에 있어",
)
assert.equal(
  buildRetrievalQuery("지금 1층이에요", [{ role: "user", text: "장애인 화장실은 어디에 있어?" }]),
  "장애인 화장실은 어디에 있어?\n지금 1층이에요",
)
assert.equal(
  buildRetrievalQuery("나는 본관 2층에 있어", [
    { role: "user", text: "신청서 작성" },
    { role: "user", text: "장애인 화장실 알려줘" },
  ]),
  "장애인 화장실 알려줘\n나는 본관 2층에 있어",
)

const locationDoc = {
  id: 45, doc_key: "45_location", seq: 45, category: "병원 일반", topic: "진료과 위치 안내",
  questions: [], short_answer: "지도", answer: [
    "# 본관 2층 진료과 안내",
    "## 202 소화기내시경센터\n엘리베이터에서 내려 오른쪽 복도입니다.",
    "## 219 소화기내과\n엘리베이터에서 내려 왼쪽 복도입니다.",
    "## 정문 또는 주차장에서 본관 2층 소화기내과로 이동\n본관 1층 로비에서 엘리베이터를 타세요.",
    "## 응급실 앞에서 엘리베이터로 소아청소년과 이동\nMCC B관 연결통로를 이용하세요.",
    "## 3F (국제진료 및 건강검진)\n이화건강검진센터는 중앙 엘리베이터 양옆입니다.",
  ].join("\n\n"),
} satisfies KbDoc
assert.match(selectLocationAnswer(locationDoc, ["소화기내과 어디에 있어요?"]) ?? "", /본관 2층.*219 소화기내과/s)
assert.match(selectLocationAnswer(locationDoc, ["소화기내과 어디에있어요?"]) ?? "", /219 소화기내과/)
assert.match(selectLocationAnswer(locationDoc, ["고마워 소화기내과 위치 알려줘"]) ?? "", /219 소화기내과/)
assert.match(selectLocationAnswer(locationDoc, ["소화기내과 어떻게 가요?", "주차장에 있어요"]) ?? "", /정문 또는 주차장/)
assert.match(selectLocationAnswer(locationDoc, ["청소년과 위치 알려줘", "응급실 앞", "엘베 위주로"]) ?? "", /MCC B관 연결통로/)
assert.equal(selectLocationAnswer(locationDoc, ["장애인 화장실은 어디에 있나요?", "나는 지금 본관 1층에 있어"]), null)
assert.match(selectLocationAnswer(locationDoc, ["건강검진센터 어떻게 가요?", "본관 2층이에요"]) ?? "", /이화건강검진센터/)
const restroomDoc = {
  ...locationDoc,
  id: 43, doc_key: "43_restroom", seq: 43, topic: "장애인 화장실 위치",
  answer: "## 본관 1층 정형외과 앞 화장실\n\n## 본관 2층 접수대 옆 화장실",
} satisfies KbDoc
assert.match(selectLocationAnswer(restroomDoc, ["장애인화장실 알려줘", "나는 본관 2층에 있어"]) ?? "", /본관 2층 접수대 옆/)
assert.match(selectLocationAnswer(restroomDoc, ["장애인 화장실은 어디에 있나요?", "나는 지금 본관 1층에 있어"]) ?? "", /본관 1층 정형외과 앞/)
console.log("retrieval: PASS")
