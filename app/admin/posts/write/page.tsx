"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, X, File } from "lucide-react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"

console.log("[v0] PostWritePage component is loading")

// 이미지 압축 함수
const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement("img")
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img

        // 최대 너비를 초과하면 비율 유지하며 리사이즈
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // JPEG로 압축 (품질 조절)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => reject(new Error("Image load failed"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("File read failed"))
    reader.readAsDataURL(file)
  })
}

export default function PostWritePage() {
  console.log("[v0] PostWritePage: Component rendering")

  const router = useRouter()
  const [title, setTitle] = useState("")
  const [thumbnailImage, setThumbnailImage] = useState<string>("")
  const [category, setCategory] = useState<"공지" | "행사" | "뉴스">("공지")
  const [status, setStatus] = useState(true)
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16))
  const [attachments, setAttachments] = useState<{ name: string; data: string; size: number }[]>([])
  const [bodyImageCount, setBodyImageCount] = useState(0)
  const [totalImageSize, setTotalImageSize] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 용량 제한 상수 (대표이미지 + 첨부파일 + 본문이미지 합계 100MB)
  const MAX_TOTAL_SIZE = 100 * 1024 * 1024 // 100MB (모든 파일 합계)
  const MAX_BODY_IMAGE_COUNT = 5 // 본문 이미지 최대 5장

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "게시글 내용을 입력하세요...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[500px] p-4 focus:outline-none border rounded-md bg-background",
      },
    },
  })

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      // 이미지 압축
      const compressedImage = await compressImage(file, 1200, 0.7)
      const compressedSize = Math.ceil(compressedImage.length * 0.75)

      // 기존 대표 이미지 크기 계산 (교체 시)
      const previousThumbnailSize = thumbnailImage ? Math.ceil(thumbnailImage.length * 0.75) : 0
      const newTotalSize = totalImageSize - previousThumbnailSize + compressedSize

      // 첨부파일 용량도 포함하여 체크
      const attachmentSize = attachments.reduce((sum, att) => sum + att.size, 0)
      if (newTotalSize + attachmentSize > MAX_TOTAL_SIZE) {
        alert(`총 용량이 100MB를 초과합니다.\n현재 이미지 용량: ${(totalImageSize / 1024 / 1024).toFixed(2)}MB\n첨부파일 용량: ${(attachmentSize / 1024 / 1024).toFixed(2)}MB\n압축 후 이미지: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`)
        return
      }

      setThumbnailImage(compressedImage)
      setTotalImageSize(newTotalSize)
    } catch (error) {
      alert("이미지 처리 중 오류가 발생했습니다.")
      console.error(error)
    } finally {
      setIsCompressing(false)
    }
  }

  // 첨부파일 다중 업로드 처리
  const processAttachmentFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    // 현재 총 용량 계산
    const currentAttachmentSize = attachments.reduce((sum, att) => sum + att.size, 0)
    const currentTotalSize = totalImageSize + currentAttachmentSize
    let additionalSize = 0

    fileArray.forEach((file) => {
      const newTotal = currentTotalSize + additionalSize + file.size
      if (newTotal > MAX_TOTAL_SIZE) {
        errors.push(`"${file.name}"을(를) 추가하면 총 용량이 100MB를 초과합니다.`)
      } else {
        validFiles.push(file)
        additionalSize += file.size
      }
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (validFiles.length === 0) return

    // 모든 파일을 순차적으로 읽기
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            data: reader.result as string,
            size: file.size,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }, [attachments, totalImageSize])

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processAttachmentFiles(files)
    }
    // input 초기화 (같은 파일 재선택 가능)
    if (e.target) {
      e.target.value = ""
    }
  }

  // 첨부파일 삭제
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Drag & Drop 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processAttachmentFiles(files)
    }
  }

  const addImageToEditor = async () => {
    // 본문 이미지 개수 체크
    if (bodyImageCount >= MAX_BODY_IMAGE_COUNT) {
      alert(`본문 이미지는 최대 ${MAX_BODY_IMAGE_COUNT}장까지만 추가할 수 있습니다.`)
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsCompressing(true)
      try {
        // 이미지 압축
        const compressedImage = await compressImage(file, 1200, 0.7)
        const compressedSize = Math.ceil(compressedImage.length * 0.75)

        // 용량 체크 (첨부파일 포함)
        const attachmentSize = attachments.reduce((sum, att) => sum + att.size, 0)
        const newTotalSize = totalImageSize + compressedSize
        if (newTotalSize + attachmentSize > MAX_TOTAL_SIZE) {
          const remainingSize = MAX_TOTAL_SIZE - totalImageSize - attachmentSize
          alert(`총 용량이 100MB를 초과합니다.\n현재 이미지 용량: ${(totalImageSize / 1024 / 1024).toFixed(2)}MB\n첨부파일 용량: ${(attachmentSize / 1024 / 1024).toFixed(2)}MB\n압축 후 이미지: ${(compressedSize / 1024 / 1024).toFixed(2)}MB\n남은 용량: ${(remainingSize / 1024 / 1024).toFixed(2)}MB`)
          return
        }

        editor?.chain().focus().setImage({ src: compressedImage }).run()
        setBodyImageCount((prev) => prev + 1)
        setTotalImageSize(newTotalSize)
      } catch (error) {
        alert("이미지 처리 중 오류가 발생했습니다.")
        console.error(error)
      } finally {
        setIsCompressing(false)
      }
    }
    input.click()
  }

  const handleSave = async () => {
    const content = editor?.getHTML() || ""

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.")
      return
    }

    const newPost = {
      id: Date.now(),
      title,
      content,
      thumbnailImage,
      category,
      status,
      viewCount: 0,
      publishedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : null,
      attachment: attachments.length > 0 ? attachments[0] : null,
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      })

      if (response.ok) {
        router.push("/admin/posts")
      } else {
        alert("저장에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to save post:", error)
      alert("저장 중 오류가 발생했습니다.")
    }
  }

  // 총 첨부파일 용량 계산
  const totalAttachmentSize = attachments.reduce((sum, att) => sum + att.size, 0)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">게시글 작성</h1>
            <p className="text-sm text-muted-foreground mt-1">새로운 사업 소식을 작성합니다</p>
          </div>
          <Link href="/admin/posts">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Button>
          </Link>
        </div>

        {isCompressing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">이미지 압축 중...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                placeholder="게시글 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">대표 이미지</Label>
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                {thumbnailImage ? (
                  <div className="relative">
                    <img
                      src={thumbnailImage || "/placeholder.svg"}
                      alt="대표 이미지"
                      className="w-full h-64 object-cover rounded-md"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        const thumbnailSize = thumbnailImage ? Math.ceil(thumbnailImage.length * 0.75) : 0
                        setTotalImageSize((prev) => Math.max(0, prev - thumbnailSize))
                        setThumbnailImage("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="thumbnail" className="flex flex-col items-center justify-center py-8 cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">클릭하여 대표 이미지 업로드</p>
                    <p className="text-xs text-muted-foreground mt-1">이미지는 자동 압축됩니다</p>
                    <input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="attachment">첨부파일</Label>
                {attachments.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {attachments.length}개 파일 ({(totalAttachmentSize / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* 기존 첨부파일 목록 */}
                {attachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {attachments.map((att, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{att.name}</p>
                            <p className="text-xs text-muted-foreground">{(att.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAttachment(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 파일 추가 영역 */}
                <label
                  htmlFor="attachment"
                  className="flex flex-col items-center justify-center py-6 cursor-pointer"
                >
                  <Upload className={`h-8 w-8 mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm ${isDragging ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {isDragging ? "여기에 파일을 놓으세요" : "클릭하거나 파일을 드래그하여 업로드"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    대표이미지 + 첨부파일 + 본문이미지 합계 최대 100MB
                  </p>
                  <input
                    ref={fileInputRef}
                    id="attachment"
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleAttachmentUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-orange-600">
                ⚠️ 총 용량 100MB 제한. 대용량 파일은 저장 실패할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>내용 *</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    본문 이미지: {bodyImageCount}/{MAX_BODY_IMAGE_COUNT}장 |
                    총 용량: {((totalImageSize + totalAttachmentSize) / 1024 / 1024).toFixed(2)}/100MB
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addImageToEditor}
                    className="gap-2 bg-transparent"
                    disabled={bodyImageCount >= MAX_BODY_IMAGE_COUNT || (totalImageSize + totalAttachmentSize) >= MAX_TOTAL_SIZE || isCompressing}
                  >
                    <Upload className="h-3 w-3" />
                    본문 이미지 추가
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <EditorContent editor={editor} />
              </div>
              <p className="text-xs text-muted-foreground">
                본문에 이미지를 추가하려면 위 버튼을 클릭하세요 (최대 5장, 자동 압축)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-5 bg-card space-y-5">
              <h3 className="font-semibold text-foreground">게시 설정</h3>

              <div className="space-y-2">
                <Label htmlFor="status">게시 상태</Label>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">{status ? "노출" : "비활성"}</span>
                  <Switch id="status" checked={status} onCheckedChange={setStatus} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="공지">공지</SelectItem>
                    <SelectItem value="행사">행사</SelectItem>
                    <SelectItem value="뉴스">뉴스</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishedAt">배포 일시</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <Link href="/admin/posts">
            <Button variant="outline" size="lg">
              취소
            </Button>
          </Link>
          <Button onClick={handleSave} size="lg" disabled={isCompressing}>
            게시글 저장
          </Button>
        </div>
      </div>
    </div>
  )
}
