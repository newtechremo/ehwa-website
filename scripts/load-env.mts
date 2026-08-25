/**
 * 스크립트용 .env.local 로더.
 *
 * Next.js 런타임은 .env.local 을 자동으로 읽지만 tsx 로 직접 실행하는 스크립트는 읽지 않는다.
 * 그래서 `npm run kb:eval` 을 그냥 실행하면 "KB 문서: 0" 이 찍혔고, 실제로 비어 있다고
 * 오판하는 일이 있었다(2026-08-23 출시 계획 문서의 "로컬 kb_documents=0").
 *
 * Next 와 같은 로더(@next/env)를 쓴다. 이미 설정된 환경변수는 덮어쓰지 않으므로
 * 운영 대상 실행(`set -a; . prod.env` 뒤 `--prod`)도 그대로 동작한다.
 */
// @next/env 는 CommonJS 라 named import 가 안 된다(ESM 에서 SyntaxError).
import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })
