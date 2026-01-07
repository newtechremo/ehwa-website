"use client"

import { useState, useEffect } from "react"
import { Post, getCategoryColor, formatDate } from "@/lib/posts"
import { PostModal } from "./PostModal"

export function BlogSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 게시글 및 주요 소식 불러오기
  useEffect(() => {
    const loadPosts = async () => {
      try {
        // 전체 게시글 로드 (서버 API에서)
        const postsResponse = await fetch("/api/posts")
        if (postsResponse.ok) {
          const allPosts: Post[] = await postsResponse.json()
          const activePosts = allPosts.filter((p) => p.status === true)
          setPosts(activePosts)

          // 주요 소식 슬롯도 서버 API에서 가져오기
          const slotsResponse = await fetch("/api/featured")
          if (slotsResponse.ok) {
            const slots = await slotsResponse.json()
            const slotIds = [slots.slot1Id, slots.slot2Id, slots.slot3Id].filter(Boolean) as number[]
            const featured = slotIds
              .map((id) => activePosts.find((p) => p.id === id))
              .filter((p): p is Post => p !== undefined)
            setFeaturedPosts(featured)
          }
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error)
      }
    }

    loadPosts()
  }, [])

  const openPost = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPost(null)
  }

  return (
    <>
      <section className="py-[60px] lg:py-[100px] bg-white">
        <div className="max-w-[1200px] mx-auto px-5">
          <h2 className="text-[1.625rem] lg:text-[2.25rem] font-extrabold text-[#1a1a1a] mb-[50px] tracking-tight">
            사업 소식
          </h2>

          {/* 주요 소식 (Featured Cards) */}
          {featuredPosts.length > 0 && (
            <>
              <h3 className="text-xl font-bold mb-4 text-[#222]">✨ 주요 소식</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-[60px]">
                {featuredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="feat-card border border-[#e0e0e0] rounded-2xl overflow-hidden bg-white flex flex-col cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"
                    onClick={() => openPost(post)}
                    role="button"
                    aria-label={`${post.title} 게시글 열기`}
                  >
                    <div className="w-full h-[220px] bg-[#eee] flex items-center justify-center text-[#888] overflow-hidden">
                      {post.thumbnailImage ? (
                        <img
                          src={post.thumbnailImage}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <i className="fa-regular fa-image text-5xl transition-transform hover:scale-110" aria-hidden="true"></i>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <span
                        className="self-start px-2.5 py-1.5 rounded-md text-sm font-bold mb-3 text-white"
                        style={{ backgroundColor: getCategoryColor(post.category) }}
                      >
                        {post.category}
                      </span>
                      <div className="text-xl font-bold mb-2.5 leading-snug text-[#222] line-clamp-2">
                        {post.title}
                      </div>
                      <div className="text-sm text-[#999] mt-auto">{formatDate(post.publishedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 전체 게시글 */}
          <h3 className="text-xl font-bold mb-4 text-[#222] mt-10">📋 전체 게시글</h3>

          {/* PC 테이블 */}
          <table className="w-full border-collapse border-spacing-0 border-t-2 border-[#333] hidden lg:table">
            <caption className="sr-only">사업소식 전체 목록</caption>
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "70%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="bg-[#f9f9f9] p-5 font-bold border-b border-[#ddd] text-[#333]">번호</th>
                <th className="bg-[#f9f9f9] p-5 font-bold border-b border-[#ddd] text-[#333]">제목</th>
                <th className="bg-[#f9f9f9] p-5 font-bold border-b border-[#ddd] text-[#333]">작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr
                  key={post.id}
                  className="cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                  onClick={() => openPost(post)}
                  role="button"
                  aria-label={`${post.title} 게시글 열기`}
                >
                  <td className="p-5 text-center border-b border-[#eee] text-[#555] text-lg">
                    {posts.length - index}
                  </td>
                  <td className="p-5 text-left border-b border-[#eee] font-semibold text-[#333] text-lg hover:text-[#004c28] hover:underline">
                    {post.title}
                  </td>
                  <td className="p-5 text-center border-b border-[#eee] text-[#555] text-lg">{formatDate(post.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 모바일 리스트 */}
          <div className="lg:hidden space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border border-[#eee] rounded-xl bg-white cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                onClick={() => openPost(post)}
                role="button"
                aria-label={`${post.title} 게시글 열기`}
              >
                <div className="font-semibold text-[#333] mb-2 line-clamp-2">{post.title}</div>
                <div className="text-sm text-[#888]">
                  {formatDate(post.publishedAt)}
                </div>
              </div>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-20 text-[#888]">
              <p className="text-lg">등록된 게시글이 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 포스트 모달 */}
      <PostModal post={selectedPost} isOpen={isModalOpen} onClose={closeModal} />
    </>
  )
}
