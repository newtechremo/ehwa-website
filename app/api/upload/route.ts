import { NextResponse } from "next/server"
import path from "path"
import { ATTACHMENT_BUCKET, uploadAttachmentFile, deleteAttachmentFile } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const preferredRegion = "icn1" // 서울 — Supabase Storage(서울)와 동일 리전
export const maxDuration = 60

// 고유 스토리지 키 생성 (ASCII 안전 — 표시용 원본명은 attachment.name에 별도 보관)
function generateKey(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "")
  return `${timestamp}_${random}${ext}`
}

// POST: 파일 업로드 → Supabase Storage
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
    }

    const uploadedFiles: { name: string; path: string; size: number }[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const key = generateKey(file.name)
      const publicUrl = await uploadAttachmentFile(key, buffer, file.type || "application/octet-stream")

      uploadedFiles.push({
        name: file.name, // 원본 파일명 (표시/다운로드용)
        path: publicUrl, // Supabase Storage 공개 URL
        size: file.size,
      })
    }

    return NextResponse.json({ success: true, files: uploadedFiles })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}

// DELETE: Storage 파일 삭제 (path = Storage 공개 URL)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ success: false, error: "Path required" }, { status: 400 })
    }

    // 보안: 해당 버킷 경로만 허용. URL에서 key 추출
    const marker = `/${ATTACHMENT_BUCKET}/`
    const idx = filePath.indexOf(marker)
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "Invalid path" }, { status: 400 })
    }
    const key = decodeURIComponent(filePath.substring(idx + marker.length))

    await deleteAttachmentFile(key)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 })
  }
}
