import { NextResponse } from "next/server"
import {
  getAllPostsWithAttachments,
  getPostWithAttachments,
  createPost,
  updatePost,
  deletePost,
  addAttachment,
  deleteAttachmentsByPostId,
  incrementViewCount,
} from "@/lib/db"

// App Router: 라우트 설정
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60
export const fetchCache = "force-no-store"

// GET: 게시글 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const incrementView = searchParams.get("incrementView")

    // 특정 게시글 조회 (첨부파일 포함)
    if (id) {
      // 조회수 증가 옵션
      if (incrementView === "true") {
        incrementViewCount(Number(id))
      }

      const post = getPostWithAttachments(Number(id))
      if (post) {
        return NextResponse.json(post)
      }
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // 목록 조회
    const posts = getAllPostsWithAttachments()
    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: 게시글 저장
export async function POST(request: Request) {
  try {
    const text = await request.text()
    const body = JSON.parse(text)

    // 배열이면 전체 덮어쓰기 (마이그레이션용)
    if (Array.isArray(body)) {
      let count = 0
      for (const post of body) {
        const postId = createPost({
          id: post.id,
          title: post.title,
          content: post.content,
          thumbnailImage: post.thumbnailImage || null,
          category: post.category,
          status: post.status ? 1 : 0,
          viewCount: post.viewCount || 0,
          publishedAt: post.publishedAt,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })

        // 첨부파일 추가
        const attachments = post.attachments || []
        if (post.attachment && !attachments.find((a: any) => a.name === post.attachment.name)) {
          attachments.push(post.attachment)
        }

        for (const att of attachments) {
          addAttachment({
            postId,
            name: att.name,
            path: att.path || "",
            size: att.size || 0,
            isLegacy: att.data ? 1 : 0,
            legacyData: att.data || null,
          })
        }
        count++
      }
      return NextResponse.json({ success: true, count })
    }

    // 단일 게시글 추가/수정
    const existingPost = body.id ? getPostWithAttachments(body.id) : null

    if (existingPost) {
      // 수정
      updatePost(body.id, {
        title: body.title,
        content: body.content,
        thumbnailImage: body.thumbnailImage || null,
        category: body.category,
        status: body.status ? 1 : 0,
        viewCount: body.viewCount || existingPost.viewCount,
        publishedAt: body.publishedAt,
      })

      // 첨부파일 갱신 (기존 삭제 후 새로 추가)
      deleteAttachmentsByPostId(body.id)
      const attachments = body.attachments || []
      for (const att of attachments) {
        addAttachment({
          postId: body.id,
          name: att.name,
          path: att.path || "",
          size: att.size || 0,
          isLegacy: 0,
          legacyData: null,
        })
      }

      const updatedPost = getPostWithAttachments(body.id)
      return NextResponse.json({ success: true, post: updatedPost })
    } else {
      // 신규 생성
      const postId = createPost({
        id: body.id || Date.now(),
        title: body.title,
        content: body.content,
        thumbnailImage: body.thumbnailImage || null,
        category: body.category,
        status: body.status ? 1 : 0,
        viewCount: body.viewCount || 0,
        publishedAt: body.publishedAt || new Date().toISOString(),
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // 첨부파일 추가
      const attachments = body.attachments || []
      for (const att of attachments) {
        addAttachment({
          postId,
          name: att.name,
          path: att.path || "",
          size: att.size || 0,
          isLegacy: 0,
          legacyData: null,
        })
      }

      const newPost = getPostWithAttachments(postId)
      return NextResponse.json({ success: true, post: newPost })
    }
  } catch (error) {
    console.error("Error saving post:", error)
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

    const success = deletePost(Number(id))
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
