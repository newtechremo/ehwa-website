import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// App Router: 라우트 설정
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60
export const fetchCache = "force-no-store"

// 본문 크기 제한 (100MB) - Next.js 14.2+ App Router
export const bodySizeLimit = "100mb"

const dataFilePath = path.join(process.cwd(), "data", "posts.json")

// 기본 게시글 데이터
const defaultPosts = [
  {
    id: 1704067200000,
    title: "2024년 신년 건강검진 프로그램 안내",
    content:
      "새해를 맞이하여 이대목동병원에서는 특별 건강검진 프로그램을 운영합니다. 국가건강검진 항목은 물론, 추가 선택검사를 통해 보다 정확한 건강상태를 확인하실 수 있습니다. 예약 문의: 02-2650-5114",
    thumbnailImage: "",
    category: "공지",
    status: true,
    viewCount: 342,
    publishedAt: "2024-01-01T09:00:00",
    createdAt: "2024-01-01T09:00:00",
    updatedAt: "2024-01-01T09:00:00",
  },
  {
    id: 1704153600000,
    title: "암센터 개원 10주년 기념 건강강좌 개최",
    content:
      "이대목동병원 암센터 개원 10주년을 기념하여 시민 건강강좌를 개최합니다. 일시: 2024년 2월 15일(목) 오후 2시, 장소: 본관 6층 대강당. 주제: 암 예방과 조기진단의 중요성. 참가비 무료, 선착순 100명.",
    thumbnailImage: "",
    category: "행사",
    status: true,
    viewCount: 218,
    publishedAt: "2024-01-02T14:00:00",
    createdAt: "2024-01-02T14:00:00",
    updatedAt: "2024-01-02T14:00:00",
  },
  {
    id: 1704240000000,
    title: "이대목동병원, 의료서비스 혁신상 수상",
    content:
      "이대목동병원이 보건복지부가 주최한 2023 의료서비스 혁신 경진대회에서 최우수상을 수상했습니다. 환자 중심의 스마트 의료 시스템 구축과 AI 기반 진단 보조 시스템 도입이 높은 평가를 받았습니다.",
    thumbnailImage: "",
    category: "뉴스",
    status: true,
    viewCount: 527,
    publishedAt: "2024-01-03T10:30:00",
    createdAt: "2024-01-03T10:30:00",
    updatedAt: "2024-01-03T10:30:00",
  },
]

type Post = {
  id: number
  title: string
  content: string
  thumbnailImage?: string
  category: "공지" | "행사" | "뉴스"
  status: boolean
  viewCount: number
  publishedAt: string
  createdAt: string
  updatedAt: string
  attachment?: { name: string; data: string; size: number } | null
  attachments?: { name: string; data: string; size: number }[] | null
}

// 데이터 파일 읽기
function readPostsData(): Post[] {
  try {
    if (!fs.existsSync(dataFilePath)) {
      // 파일이 없으면 생성
      fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultPosts, null, 2))
      return defaultPosts
    }
    const data = fs.readFileSync(dataFilePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading posts data:", error)
    return defaultPosts
  }
}

// 데이터 파일 쓰기
function writePostsData(data: Post[]) {
  try {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error("Error writing posts data:", error)
    return false
  }
}

// GET: 게시글 목록 조회
export async function GET() {
  const data = readPostsData()
  return NextResponse.json(data)
}

// POST: 게시글 저장 (전체 덮어쓰기)
export async function POST(request: Request) {
  try {
    // 본문을 텍스트로 읽어서 직접 파싱 (크기 제한 우회)
    const text = await request.text()
    const body = JSON.parse(text)

    // 배열이면 전체 덮어쓰기, 객체면 추가/수정
    if (Array.isArray(body)) {
      const success = writePostsData(body)
      if (success) {
        return NextResponse.json({ success: true, count: body.length })
      } else {
        return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 })
      }
    } else {
      // 단일 게시글 추가/수정
      const posts = readPostsData()
      const existingIndex = posts.findIndex((p) => p.id === body.id)

      if (existingIndex >= 0) {
        posts[existingIndex] = body
      } else {
        posts.unshift(body)
      }

      const success = writePostsData(posts)
      if (success) {
        return NextResponse.json({ success: true, post: body })
      } else {
        return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("Error saving posts data:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}

// DELETE: 게시글 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 })
    }

    const posts = readPostsData()
    const filteredPosts = posts.filter((p) => p.id !== Number(id))

    if (filteredPosts.length === posts.length) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    const success = writePostsData(filteredPosts)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
