"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon } from "lucide-react"

type Post = {
  id: number
  title: string
  content: string
  thumbnailImage?: string // Added thumbnailImage field
  category: "공지" | "행사" | "뉴스"
  status: boolean
  viewCount: number
  publishedAt: string
}

type FeaturedSlots = {
  slot1Id: number | null
  slot2Id: number | null
  slot3Id: number | null
}

export default function FeaturedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [slots, setSlots] = useState<FeaturedSlots>({
    slot1Id: null,
    slot2Id: null,
    slot3Id: null,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load posts from server API
        const postsResponse = await fetch("/api/posts")
        if (postsResponse.ok) {
          const allPosts: Post[] = await postsResponse.json()
          setPosts(allPosts.filter((p) => p.status))
        }

        // Load featured slots from API
        const slotsResponse = await fetch("/api/featured")
        if (slotsResponse.ok) {
          const data = await slotsResponse.json()
          setSlots(data)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }
    loadData()
  }, [])

  const handleSlotSelect = (slotKey: keyof FeaturedSlots, postId: number | null) => {
    setSlots((prev) => ({
      ...prev,
      [slotKey]: postId,
    }))
  }

  const handleSave = async () => {
    // Validate: check for duplicates
    const slotValues = [slots.slot1Id, slots.slot2Id, slots.slot3Id].filter((id) => id !== null)
    const uniqueSlots = new Set(slotValues)
    if (slotValues.length !== uniqueSlots.size) {
      alert("같은 게시글을 중복으로 선택할 수 없습니다.")
      return
    }

    // 서버 API로 저장
    try {
      const response = await fetch("/api/featured", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slots),
      })

      if (response.ok) {
        alert("저장되었습니다.")
      } else {
        alert("저장에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to save featured slots:", error)
      alert("저장에 실패했습니다.")
    }
  }

  const getSlotPost = (slotId: number | null) => {
    if (!slotId) return null
    return posts.find((p) => p.id === slotId)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "공지":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      case "행사":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "뉴스":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">주요 소식 설정</h1>
        <p className="text-muted-foreground mb-8">홈페이지 주요 소식 영역에 표시할 게시글 3개를 선택하세요.</p>

        {/* Card Grid - Similar to homepage preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {([1, 2, 3] as const).map((slotNum) => {
            const slotKey = `slot${slotNum}Id` as keyof FeaturedSlots
            const post = getSlotPost(slots[slotKey])

            return (
              <Card key={slotNum} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {post?.thumbnailImage ? (
                    <img
                      src={post.thumbnailImage || "/placeholder.svg"}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : post ? (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
                    </div>
                  ) : (
                    <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
                  )}
                </div>

                <CardContent className="p-4">
                  {post ? (
                    <>
                      {/* Category Badge */}
                      <Badge variant="outline" className={`${getCategoryColor(post.category)} mb-3`}>
                        {post.category}
                      </Badge>

                      {/* Title */}
                      <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2">{post.title}</h3>

                      {/* Date */}
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
                      </p>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">게시글을 선택하세요</p>
                    </div>
                  )}

                  {/* Slot Selection */}
                  <div className="mt-4 pt-4 border-t">
                    <Select
                      value={slots[slotKey]?.toString() || "0"}
                      onValueChange={(value) => handleSlotSelect(slotKey, value ? Number(value) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`${slotNum}번 슬롯 게시글 선택`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">선택 안 함</SelectItem>
                        {posts.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            [{p.category}] {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            변경 사항 저장
          </Button>
        </div>
      </div>
    </div>
  )
}
