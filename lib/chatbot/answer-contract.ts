export type FactRule = {
  id: string
  all?: string[]
  any?: string[]
  exact?: string[]
}

export type AnswerContract = {
  required: FactRule[]
  forbidden?: FactRule[]
}

export type AnswerEvaluation = {
  pass: boolean
  missing: string[]
  forbiddenHits: string[]
}

const key = (value: string) => value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "")

function matches(answer: string, rule: FactRule): boolean {
  const normalized = key(answer)
  const all = !rule.all?.length || rule.all.every((value) => normalized.includes(key(value)))
  const any = !rule.any?.length || rule.any.some((value) => normalized.includes(key(value)))
  const exact = !rule.exact?.length || rule.exact.some((value) => answer.includes(value))
  return all && any && exact
}

export function evaluateAnswer(answer: string, contract: AnswerContract): AnswerEvaluation {
  const missing = contract.required.filter((rule) => !matches(answer, rule)).map((rule) => rule.id)
  const forbiddenHits = (contract.forbidden ?? []).filter((rule) => matches(answer, rule)).map((rule) => rule.id)
  return { pass: missing.length === 0 && forbiddenHits.length === 0, missing, forbiddenHits }
}
