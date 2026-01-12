"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ChevronRight, ChevronLeft, Search } from "lucide-react"
import Link from "next/link"

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
}

const initialPosts: Post[] = [
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

export default function PostsListPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [categoryFilter, setCategoryFilter] = useState("전체")
  const [statusFilter, setStatusFilter] = useState("전체")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetch("/api/posts")
        if (response.ok) {
          const data = await response.json()
          setPosts(data)
          setFilteredPosts(data)
        }
      } catch (error) {
        console.error("Failed to load posts:", error)
      }
    }
    loadPosts()
  }, [])

  useEffect(() => {
    let filtered = posts

    if (categoryFilter !== "전체") {
      filtered = filtered.filter((post) => post.category === categoryFilter)
    }

    if (statusFilter === "노출") {
      filtered = filtered.filter((post) => post.status === true)
    } else if (statusFilter === "비활성") {
      filtered = filtered.filter((post) => post.status === false)
    }

    if (searchQuery) {
      filtered = filtered.filter((post) => post.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    setFilteredPosts(filtered)
    setCurrentPage(1) // 필터 변경 시 첫 페이지로 이동
  }, [categoryFilter, statusFilter, searchQuery, posts])

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex)

  const toggleStatus = async (id: number) => {
    const post = posts.find((p) => p.id === id)
    if (!post) return

    const updatedPost = { ...post, status: !post.status }
    const updatedPosts = posts.map((p) => (p.id === id ? updatedPost : p))
    setPosts(updatedPosts)

    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPost),
      })
    } catch (error) {
      console.error("Failed to update post status:", error)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "공지":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "행사":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "뉴스":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">알림/소식 게시글 관리</h1>
            <p className="text-muted-foreground mt-1">공지 · 행사 · 뉴스 게시글을 관리합니다.</p>
          </div>
          <Link href="/admin/posts/write">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />글 작성하기
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 mt-6">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="공지">공지</SelectItem>
              <SelectItem value="행사">행사</SelectItem>
              <SelectItem value="뉴스">뉴스</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="노출">노출</SelectItem>
              <SelectItem value="비활성">비활성</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="제목 검색"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">No</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[120px]">카테고리</TableHead>
                <TableHead>제목</TableHead>
                <TableHead className="w-[180px]">배포일</TableHead>
                <TableHead className="w-[100px]">조회수</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    게시글이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPosts.map((post, index) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{filteredPosts.length - startIndex - index}</TableCell>
                    <TableCell>
                      <Switch checked={post.status} onCheckedChange={() => toggleStatus(post.id)} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(post.category)}>
                        {post.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/admin/posts/${post.id}`} className="hover:text-primary hover:underline cursor-pointer">
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(post.publishedAt).toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{post.viewCount}</TableCell>
                    <TableCell>
                      <Link href={`/admin/posts/${post.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              총 {filteredPosts.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredPosts.length)}개 표시
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
