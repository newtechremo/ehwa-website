import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** 관리자 화면이 진입 시 세션 유효성을 서버에 확인한다 */
export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAuthenticated(request) })
}
