import { NextResponse } from "next/server"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAdminUsername,
  isAuthConfigured,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const preferredRegion = "icn1"

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "서버에 관리자 인증이 설정되지 않았습니다." },
      { status: 503 },
    )
  }

  let username = ""
  let password = ""
  try {
    const body = await request.json()
    username = String(body?.username ?? "")
    password = String(body?.password ?? "")
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 })
  }

  const ok =
    username === getAdminUsername() &&
    verifyPassword(password, process.env.ADMIN_PASSWORD_HASH as string)

  if (!ok) {
    // 아이디·비밀번호 중 무엇이 틀렸는지 구분해서 알려주지 않는다
    return NextResponse.json(
      { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    )
  }

  const token = createSessionToken(username)
  if (!token) {
    return NextResponse.json({ success: false, error: "세션 발급 실패" }, { status: 500 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE))
  return res
}
