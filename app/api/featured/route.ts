import { NextResponse } from "next/server"
import { isAuthConfigured, isAuthenticated } from "@/lib/auth"
import { getFeaturedSlots, updateFeaturedSlots } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const preferredRegion = "icn1" // 서울 — Supabase(서울)와 동일 리전

// GET: 주요 소식 슬롯 조회
/** 쓰기 요청은 관리자 세션이 있어야 한다 */
function denyIfUnauthorized(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "서버에 관리자 인증이 설정되지 않았습니다." },
      { status: 503 },
    )
  }
  if (!isAuthenticated(request)) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 })
  }
  return null
}

export async function GET() {
  try {
    const slots = await getFeaturedSlots()
    return NextResponse.json({
      slot1Id: slots.slot1Id,
      slot2Id: slots.slot2Id,
      slot3Id: slots.slot3Id,
    })
  } catch (error) {
    console.error("Error reading featured data:", error)
    return NextResponse.json({ slot1Id: null, slot2Id: null, slot3Id: null })
  }
}

// POST: 주요 소식 슬롯 저장
export async function POST(request: Request) {
  const denied = denyIfUnauthorized(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { slot1Id, slot2Id, slot3Id } = body

    await updateFeaturedSlots({
      slot1Id: slot1Id ?? null,
      slot2Id: slot2Id ?? null,
      slot3Id: slot3Id ?? null,
    })

    return NextResponse.json({
      success: true,
      data: { slot1Id: slot1Id ?? null, slot2Id: slot2Id ?? null, slot3Id: slot3Id ?? null },
    })
  } catch (error) {
    console.error("Error saving featured data:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
