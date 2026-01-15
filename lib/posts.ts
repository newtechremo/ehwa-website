// 게시글 타입 정의 (Admin과 메인 페이지에서 공유)
export type Post = {
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
  attachment?: {
    name: string
    data: string
    size: number
  } | null
  attachments?: {
    name: string
    data: string
    size: number
  }[] | null
}

export type FeaturedSlots = {
  slot1Id: number | null
  slot2Id: number | null
  slot3Id: number | null
}

// 초기 게시글 데이터
export const initialPosts: Post[] = [
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

// 게시글 전체 조회
export function getPosts(): Post[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem("news_posts")
  if (stored) {
    return JSON.parse(stored)
  }
  // 초기 데이터 설정
  localStorage.setItem("news_posts", JSON.stringify(initialPosts))
  return initialPosts
}

// 활성화된 게시글만 조회 (status: true)
export function getActivePosts(): Post[] {
  return getPosts().filter((post) => post.status === true)
}

// 주요 소식 슬롯 조회
export function getFeaturedSlots(): FeaturedSlots {
  if (typeof window === "undefined") return { slot1Id: null, slot2Id: null, slot3Id: null }
  const stored = localStorage.getItem("featured_slots")
  return stored ? JSON.parse(stored) : { slot1Id: null, slot2Id: null, slot3Id: null }
}

// 주요 소식 게시글 조회
export function getFeaturedPosts(): Post[] {
  const posts = getActivePosts()
  const slots = getFeaturedSlots()
  const slotIds = [slots.slot1Id, slots.slot2Id, slots.slot3Id].filter(Boolean) as number[]

  return slotIds.map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => p !== undefined)
}

// 단일 게시글 조회
export function getPostById(id: number): Post | null {
  const posts = getPosts()
  return posts.find((p) => p.id === id) || null
}

// 카테고리 색상 (CSS 클래스)
export function getCategoryColorClass(category: string): string {
  switch (category) {
    case "공지":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20"
    case "행사":
      return "bg-green-500/10 text-green-600 border-green-500/20"
    case "뉴스":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

// 카테고리 배경색 (HEX)
export function getCategoryColor(category: string): string {
  switch (category) {
    case "공지":
      return "#3b82f6"
    case "행사":
      return "#22c55e"
    case "뉴스":
      return "#f97316"
    default:
      return "#6b7280"
  }
}

// 날짜 포맷팅 함수 (publishedAt을 YYYY.MM.DD 형식으로)
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}
