"use client"

import { useEffect } from "react"
import { X, Calendar, Eye, Paperclip } from "lucide-react"
import { Post, getCategoryColor, formatDate } from "@/lib/posts"

interface PostModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
}

export function PostModal({ post, isOpen, onClose }: PostModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen || !post) return null

  return (
    <div
      className={`modal-overlay ${isOpen ? "active" : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-wrap" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-[#eee] bg-[#fdfdfd]">
          <span
            className="inline-block px-2.5 py-1 rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: getCategoryColor(post.category) }}
          >
            {post.category}
          </span>
          <button
            className="text-2xl text-[#999] p-1 -mt-1 -mr-2 hover:text-[#333] transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          <h3 id="modal-title" className="text-2xl font-extrabold text-[#222] mb-4 leading-tight">
            {post.title}
          </h3>

          <div className="flex gap-4 text-[#888] text-sm mb-8 border-b border-[#f0f0f0] pb-5">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(post.publishedAt)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount}</span>
            </span>
          </div>

          {/* 대표 이미지 */}
          {post.thumbnailImage && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={post.thumbnailImage}
                alt={post.title}
                className="w-full h-auto max-h-[400px] object-cover"
              />
            </div>
          )}

          {/* 본문 내용 */}
          <div
            className="text-[#444] text-lg leading-relaxed mb-10 prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 첨부파일 박스 */}
          {post.attachment && post.attachment.name && (
            <div className="bg-[#f5f9f7] border border-[#d1e2d9] rounded-lg p-4 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Paperclip className="h-5 w-5 text-[#004c28]" />
                <span className="text-[#333] font-medium">{post.attachment.name}</span>
              </div>
              {post.attachment.data && (
                <a
                  href={post.attachment.data}
                  download={post.attachment.name}
                  className="px-4 py-2 bg-[#004c28] text-white text-sm font-bold rounded-lg hover:bg-[#00381e] transition-colors"
                >
                  다운로드
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
