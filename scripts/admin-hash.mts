import { hashPassword } from "../lib/auth"

// 사용법: npm run admin:hash -- '새비밀번호'
const pw = process.argv[2]
if (!pw) {
  console.error("사용법: npm run admin:hash -- '새비밀번호'")
  process.exit(1)
}
console.log("\nADMIN_PASSWORD_HASH=" + hashPassword(pw) + "\n")
console.log("이 값을 Vercel 환경변수(Production/Preview)와 .env.local 에 넣으세요.")
