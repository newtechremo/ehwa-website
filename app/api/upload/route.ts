import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "public", "uploads", "attachments")

// 디렉토리 존재 확인 및 생성
function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
}

// 고유 파일명 생성
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "_") // 특수문자 제거
    .substring(0, 50) // 파일명 길이 제한
  return `${timestamp}_${random}_${baseName}${ext}`
}

// POST: 파일 업로드
export async function POST(request: Request) {
  try {
    ensureUploadDir()

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
    }

    const uploadedFiles: { name: string; path: string; size: number }[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uniqueFilename = generateUniqueFilename(file.name)
      const filePath = path.join(uploadDir, uniqueFilename)

      // 파일 저장
      fs.writeFileSync(filePath, buffer)

      uploadedFiles.push({
        name: file.name, // 원본 파일명
        path: `/uploads/attachments/${uniqueFilename}`, // 웹 접근 경로
        size: file.size,
      })
    }

    return NextResponse.json({ success: true, files: uploadedFiles })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}

// DELETE: 파일 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ success: false, error: "Path required" }, { status: 400 })
    }

    // 보안: uploads/attachments 디렉토리 내 파일만 삭제 허용
    if (!filePath.startsWith("/uploads/attachments/")) {
      return NextResponse.json({ success: false, error: "Invalid path" }, { status: 400 })
    }

    const fullPath = path.join(process.cwd(), "public", filePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 })
  }
}
