import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const dataFilePath = path.join(process.cwd(), "data", "featured.json")

// 기본 슬롯 데이터
const defaultSlots = {
  slot1Id: null,
  slot2Id: null,
  slot3Id: null,
}

// 데이터 파일 읽기
function readFeaturedData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      // 파일이 없으면 생성
      fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultSlots, null, 2))
      return defaultSlots
    }
    const data = fs.readFileSync(dataFilePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading featured data:", error)
    return defaultSlots
  }
}

// 데이터 파일 쓰기
function writeFeaturedData(data: typeof defaultSlots) {
  try {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error("Error writing featured data:", error)
    return false
  }
}

// GET: 주요 소식 슬롯 조회
export async function GET() {
  const data = readFeaturedData()
  return NextResponse.json(data)
}

// POST: 주요 소식 슬롯 저장
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slot1Id, slot2Id, slot3Id } = body

    const data = {
      slot1Id: slot1Id ?? null,
      slot2Id: slot2Id ?? null,
      slot3Id: slot3Id ?? null,
    }

    const success = writeFeaturedData(data)

    if (success) {
      return NextResponse.json({ success: true, data })
    } else {
      return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error saving featured data:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
