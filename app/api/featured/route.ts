import { NextResponse } from "next/server"
import { getFeaturedSlots, updateFeaturedSlots } from "@/lib/db"

// GET: 주요 소식 슬롯 조회
export async function GET() {
  try {
    const slots = getFeaturedSlots()
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
  try {
    const body = await request.json()
    const { slot1Id, slot2Id, slot3Id } = body

    updateFeaturedSlots({
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
