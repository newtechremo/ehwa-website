# Admin 페이지 (CMS) 상세 분석

## 1. 개요

### 1.1 프로젝트 정보
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **UI 라이브러리**: shadcn/ui + Tailwind CSS
- **에디터**: Tiptap (리치 텍스트 에디터)
- **데이터 저장**: LocalStorage (브라우저 로컬)

### 1.2 목적
이대목동병원 장애인 이용편의 지원센터 웹사이트의 **콘텐츠 관리 시스템(CMS)**

### 1.3 주요 기능
1. 관리자 로그인/로그아웃
2. 사업소식 게시글 CRUD
3. 주요 소식 3개 슬롯 설정
4. 이미지/파일 업로드 (Base64 저장)

---

## 2. 기술 스택 상세

### 2.1 Core 기술
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.0.0"
}
```

### 2.2 UI 라이브러리
```json
{
  "@radix-ui/react-*": "^1.1.0",  // shadcn/ui 기반
  "tailwindcss": "^3.4.0",
  "tailwindcss-animate": "^1.0.7",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.0"
}
```

### 2.3 에디터
```json
{
  "@tiptap/react": "^2.10.0",
  "@tiptap/starter-kit": "^2.10.0",
  "@tiptap/extension-image": "^2.10.0",
  "@tiptap/extension-placeholder": "^2.10.0"
}
```

### 2.4 아이콘
```json
{
  "lucide-react": "^0.460.0"
}
```

---

## 3. 프로젝트 구조

### 3.1 디렉토리 구조
```
app/
├── layout.tsx                # 루트 레이아웃
├── globals.css              # 전역 스타일
├── page.tsx                 # 로그인 페이지 (/)
│
└── admin/
    ├── layout.tsx           # 관리자 레이아웃 (사이드바)
    │
    ├── posts/
    │   ├── page.tsx         # 게시글 목록 (/admin/posts)
    │   ├── loading.tsx      # 로딩 상태
    │   │
    │   ├── write/
    │   │   └── page.tsx     # 게시글 작성 (/admin/posts/write)
    │   │
    │   └── [id]/
    │       └── page.tsx     # 게시글 상세/수정 (/admin/posts/[id])
    │
    └── featured/
        └── page.tsx         # 주요 소식 설정 (/admin/featured)

components/
├── ui/                      # shadcn/ui 컴포넌트
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── switch.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   └── ...
│
└── theme-provider.tsx       # 다크 모드 프로바이더

lib/
└── utils.ts                 # 유틸리티 함수 (cn)

hooks/
├── use-mobile.ts            # 모바일 감지 훅
└── use-toast.ts             # 토스트 훅
```

### 3.2 라우팅 구조
```
/                            → 로그인 페이지
/admin/posts                 → 게시글 목록
/admin/posts/write           → 게시글 작성
/admin/posts/[id]            → 게시글 상세/수정
/admin/featured              → 주요 소식 설정
```

---

## 4. 인증 시스템

### 4.1 로그인 페이지 (`app/page.tsx`)

#### A. 컴포넌트 구조
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    // 하드코딩된 인증
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("isAuthenticated", "true")
      router.push("/admin/posts")
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold text-center leading-tight">
            이대목동병원 장애인 이용편의 지원센터
          </CardTitle>
          <CardDescription className="text-center">관리자 로그인</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            테스트 계정: admin / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### B. 인증 방식
| 항목 | 값 |
|------|-----|
| 저장 위치 | `localStorage.isAuthenticated` |
| 인증 ID | `admin` (하드코딩) |
| 인증 PW | `admin123` (하드코딩) |
| 세션 유지 | 브라우저 종료 시까지 (localStorage) |

**보안 주의사항**:
- 실제 프로덕션에서는 **JWT 토큰** 또는 **세션 쿠키** 사용 필요
- 패스워드는 **해시화**되어야 함
- **HTTPS** 필수

---

## 5. 관리자 레이아웃

### 5.1 레이아웃 구조 (`app/admin/layout.tsx`)

```typescript
"use client"

import { FileText, Star, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 인증 체크
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    } else {
      router.push("/")  // 로그인 페이지로 리다이렉트
    }
    setIsLoading(false)
  }, [router])

  // 메뉴 아이템 정의
  const menuItems = [
    {
      title: "사업 소식",
      icon: FileText,
      href: "/admin/posts",
      active: pathname?.startsWith("/admin/posts"),
    },
    {
      title: "주요 소식 설정",
      icon: Star,
      href: "/admin/featured",
      active: pathname === "/admin/featured",
    },
  ]

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    router.push("/")
  }

  // 로딩 중이거나 인증되지 않았을 때
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-lg font-semibold text-foreground leading-tight">
            이대목동병원 장애인 이용편의 지원센터
          </h1>
          <p className="text-sm text-muted-foreground mt-1">관리자 페이지</p>
        </div>

        <nav className="px-3 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>로그아웃</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

### 5.2 레이아웃 특징
- **사이드바 고정**: 좌측 사이드바 (width: 256px)
- **메뉴 활성화**: 현재 경로 기반 자동 하이라이트
- **인증 가드**: 인증되지 않은 사용자 자동 리다이렉트
- **로그아웃 버튼**: 하단 고정

---

## 6. 데이터 모델

### 6.1 Post 타입 정의
```typescript
type Post = {
  id: number                        // 타임스탬프 기반 ID
  title: string                     // 제목
  content: string                   // HTML 본문
  thumbnailImage?: string           // 대표 이미지 (Base64)
  category: "공지" | "행사" | "뉴스" // 카테고리
  status: boolean                   // 노출 상태 (true: 노출, false: 비활성)
  viewCount: number                 // 조회수
  publishedAt: string               // 배포 일시 (ISO 8601)
  createdAt: string                 // 생성 일시 (ISO 8601)
  updatedAt: string                 // 수정 일시 (ISO 8601)
  attachment?: {                    // 첨부파일 (선택)
    name: string                    // 파일명
    data: string                    // Base64 데이터
    size: number                    // 파일 크기 (bytes)
  } | null
}
```

### 6.2 FeaturedSlots 타입 정의
```typescript
type FeaturedSlots = {
  slot1Id: number | null  // 주요 소식 슬롯 1
  slot2Id: number | null  // 주요 소식 슬롯 2
  slot3Id: number | null  // 주요 소식 슬롯 3
}
```

### 6.3 LocalStorage 키
| 키 | 타입 | 설명 |
|----|------|------|
| `isAuthenticated` | `"true" \| null` | 로그인 상태 |
| `news_posts` | `Post[]` (JSON) | 게시글 배열 |
| `featured_slots` | `FeaturedSlots` (JSON) | 주요 소식 슬롯 |

---

## 7. 게시글 목록 페이지

### 7.1 페이지 구조 (`app/admin/posts/page.tsx`)

#### A. 상태 관리
```typescript
const [posts, setPosts] = useState<Post[]>([])
const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
const [categoryFilter, setCategoryFilter] = useState("전체")
const [statusFilter, setStatusFilter] = useState("전체")
const [searchQuery, setSearchQuery] = useState("")
```

#### B. 데이터 로드 (useEffect)
```typescript
useEffect(() => {
  const stored = localStorage.getItem("news_posts")
  if (stored) {
    const parsedPosts = JSON.parse(stored)
    setPosts(parsedPosts)
    setFilteredPosts(parsedPosts)
  } else {
    // 초기 데이터 설정
    localStorage.setItem("news_posts", JSON.stringify(initialPosts))
    setPosts(initialPosts)
    setFilteredPosts(initialPosts)
  }
}, [])
```

#### C. 필터링 로직
```typescript
useEffect(() => {
  let filtered = posts

  // 카테고리 필터
  if (categoryFilter !== "전체") {
    filtered = filtered.filter((post) => post.category === categoryFilter)
  }

  // 상태 필터
  if (statusFilter === "노출") {
    filtered = filtered.filter((post) => post.status === true)
  } else if (statusFilter === "비활성") {
    filtered = filtered.filter((post) => post.status === false)
  }

  // 검색 필터
  if (searchQuery) {
    filtered = filtered.filter((post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  setFilteredPosts(filtered)
}, [categoryFilter, statusFilter, searchQuery, posts])
```

#### D. 상태 토글 함수
```typescript
const toggleStatus = (id: number) => {
  const updatedPosts = posts.map((post) =>
    post.id === id ? { ...post, status: !post.status } : post
  )
  setPosts(updatedPosts)
  localStorage.setItem("news_posts", JSON.stringify(updatedPosts))
}
```

### 7.2 UI 구성

#### A. 헤더 영역
```tsx
<div className="flex items-center justify-between mb-2">
  <div>
    <h1 className="text-3xl font-bold text-foreground">
      사업소식 게시글 관리
    </h1>
    <p className="text-muted-foreground mt-1">
      공지 · 행사 · 뉴스 게시글을 관리합니다.
    </p>
  </div>
  <Link href="/admin/posts/write">
    <Button className="gap-2">
      <Plus className="h-4 w-4" />글 작성하기
    </Button>
  </Link>
</div>
```

#### B. 필터 영역
```tsx
<div className="flex gap-4 mb-6 mt-6">
  {/* 카테고리 선택 */}
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

  {/* 상태 선택 */}
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

  {/* 검색 */}
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
```

#### C. 테이블 영역
```tsx
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
    {filteredPosts.map((post, index) => (
      <TableRow key={post.id}>
        <TableCell className="font-medium">
          {filteredPosts.length - index}
        </TableCell>
        <TableCell>
          <Switch
            checked={post.status}
            onCheckedChange={() => toggleStatus(post.id)}
          />
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={getCategoryColor(post.category)}>
            {post.category}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">{post.title}</TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(post.publishedAt).toLocaleString("ko-KR")}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {post.viewCount}
        </TableCell>
        <TableCell>
          <Link href={`/admin/posts/${post.id}`}>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 7.3 카테고리 색상 함수
```typescript
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
```

---

## 8. 게시글 작성 페이지

### 8.1 페이지 구조 (`app/admin/posts/write/page.tsx`)

#### A. 상태 관리
```typescript
const [title, setTitle] = useState("")
const [thumbnailImage, setThumbnailImage] = useState<string>("")
const [category, setCategory] = useState<"공지" | "행사" | "뉴스">("공지")
const [status, setStatus] = useState(true)
const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16))
const [attachment, setAttachment] = useState<{
  name: string
  data: string
  size: number
} | null>(null)
```

#### B. Tiptap 에디터 설정
```typescript
const editor = useEditor({
  extensions: [
    StarterKit,                    // 기본 마크다운 기능
    Image.configure({              // 이미지 삽입
      inline: true,
      allowBase64: true,
    }),
    Placeholder.configure({        // 플레이스홀더
      placeholder: "게시글 내용을 입력하세요...",
    }),
  ],
  content: "",
  editorProps: {
    attributes: {
      class: "prose prose-sm max-w-none min-h-[500px] p-4 focus:outline-none border rounded-md bg-background",
    },
  },
})
```

### 8.2 이미지 업로드

#### A. 대표 이미지 업로드
```typescript
const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailImage(reader.result as string)  // Base64로 저장
    }
    reader.readAsDataURL(file)
  }
}
```

**UI 구현**:
```tsx
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
        onClick={() => setThumbnailImage("")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <label htmlFor="thumbnail" className="flex flex-col items-center justify-center py-8 cursor-pointer">
      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">클릭하여 대표 이미지 업로드</p>
      <p className="text-xs text-muted-foreground mt-1">주요 소식 카드에 표시될 이미지입니다</p>
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
```

#### B. 본문 이미지 삽입
```typescript
const addImageToEditor = () => {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        editor
          ?.chain()
          .focus()
          .setImage({ src: reader.result as string })  // Tiptap에 이미지 삽입
          .run()
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}
```

### 8.3 첨부파일 업로드
```typescript
const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    const maxSize = 20 * 1024 * 1024  // 20MB
    if (file.size > maxSize) {
      alert("첨부파일은 최대 20MB까지 업로드 가능합니다.")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setAttachment({
        name: file.name,
        data: reader.result as string,
        size: file.size,
      })
    }
    reader.readAsDataURL(file)
  }
}
```

### 8.4 게시글 저장
```typescript
const handleSave = () => {
  const content = editor?.getHTML() || ""

  // 유효성 검사
  if (!title.trim() || !content.trim()) {
    alert("제목과 내용을 입력해주세요.")
    return
  }

  // 기존 게시글 로드
  const stored = localStorage.getItem("news_posts")
  const posts = stored ? JSON.parse(stored) : []

  // 새 게시글 생성
  const newPost = {
    id: Date.now(),                           // 타임스탬프 ID
    title,
    content,
    thumbnailImage,
    category,
    status,
    viewCount: 0,
    publishedAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachment: attachment || null,
  }

  // 배열 맨 앞에 추가 (최신순)
  posts.unshift(newPost)
  localStorage.setItem("news_posts", JSON.stringify(posts))

  // 목록 페이지로 이동
  router.push("/admin/posts")
}
```

### 8.5 UI 레이아웃

#### A. 2단 그리드
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* 좌측: 제목, 이미지, 첨부파일, 본문 */}
  <div className="lg:col-span-2 space-y-6">
    {/* 제목 */}
    <div className="space-y-2">
      <Label htmlFor="title">제목 *</Label>
      <Input
        id="title"
        placeholder="게시글 제목을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </div>

    {/* 대표 이미지 */}
    {/* ... */}

    {/* 첨부파일 */}
    {/* ... */}

    {/* 본문 에디터 */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>내용 *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addImageToEditor}
        >
          <Upload className="h-3 w-3" />
          본문 이미지 추가
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  </div>

  {/* 우측: 게시 설정 */}
  <div className="space-y-4">
    <div className="border rounded-lg p-5 bg-card space-y-5">
      <h3 className="font-semibold text-foreground">게시 설정</h3>

      {/* 게시 상태 */}
      <div className="space-y-2">
        <Label htmlFor="status">게시 상태</Label>
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {status ? "노출" : "비활성"}
          </span>
          <Switch id="status" checked={status} onCheckedChange={setStatus} />
        </div>
      </div>

      {/* 카테고리 */}
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

      {/* 배포 일시 */}
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
```

#### B. 하단 액션 버튼
```tsx
<div className="flex justify-end gap-3 mt-8 pt-6 border-t">
  <Link href="/admin/posts">
    <Button variant="outline" size="lg">취소</Button>
  </Link>
  <Button onClick={handleSave} size="lg">게시글 저장</Button>
</div>
```

---

## 9. 게시글 상세/수정 페이지

### 9.1 페이지 구조 (`app/admin/posts/[id]/page.tsx`)

#### A. 게시글 로드
```typescript
const params = useParams()
const postId = Number(params.id)
const [post, setPost] = useState<Post | null>(null)

useEffect(() => {
  const stored = localStorage.getItem("news_posts")
  if (stored) {
    const posts: Post[] = JSON.parse(stored)
    const foundPost = posts.find((p) => p.id === postId)
    if (foundPost) {
      setPost(foundPost)
      setTitle(foundPost.title)
      setThumbnailImage(foundPost.thumbnailImage || "")
      editor?.commands.setContent(foundPost.content)
      setCategory(foundPost.category)
      setStatus(foundPost.status)
      setPublishedAt(new Date(foundPost.publishedAt).toISOString().slice(0, 16))
      setAttachment(foundPost.attachment || null)

      // 조회수 증가
      const updatedPosts = posts.map((p) =>
        p.id === postId ? { ...p, viewCount: p.viewCount + 1 } : p
      )
      localStorage.setItem("news_posts", JSON.stringify(updatedPosts))
    }
  }
}, [postId, editor])
```

#### B. 게시글 수정
```typescript
const handleSave = () => {
  const content = editor?.getHTML() || ""

  const stored = localStorage.getItem("news_posts")
  if (stored) {
    const posts: Post[] = JSON.parse(stored)
    const updatedPosts = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            title,
            content,
            thumbnailImage,
            category,
            status,
            publishedAt,
            updatedAt: new Date().toISOString(),
            attachment: attachment || null,
          }
        : p
    )
    localStorage.setItem("news_posts", JSON.stringify(updatedPosts))
    router.push("/admin/posts")
  }
}
```

#### C. 게시글 삭제
```typescript
const handleDelete = () => {
  if (confirm("정말 삭제하시겠습니까?")) {
    const stored = localStorage.getItem("news_posts")
    if (stored) {
      const posts: Post[] = JSON.parse(stored)
      const filteredPosts = posts.filter((p) => p.id !== postId)
      localStorage.setItem("news_posts", JSON.stringify(filteredPosts))
      router.push("/admin/posts")
    }
  }
}
```

### 9.2 첨부파일 다운로드
```typescript
const handleDownloadAttachment = () => {
  if (attachment) {
    const link = document.createElement("a")
    link.href = attachment.data       // Base64 데이터
    link.download = attachment.name   // 파일명
    link.click()
  }
}
```

**UI 구현**:
```tsx
{attachment && (
  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
    <div className="flex items-center gap-3">
      <File className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {(attachment.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" onClick={handleDownloadAttachment}>
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setAttachment(null)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
)}
```

### 9.3 하단 액션 버튼
```tsx
<div className="flex justify-between mt-6">
  {/* 좌측: 삭제 버튼 */}
  <Button variant="destructive" onClick={handleDelete} className="gap-2">
    <Trash2 className="h-4 w-4" />
    삭제
  </Button>

  {/* 우측: 목록, 저장 버튼 */}
  <div className="flex gap-3">
    <Link href="/admin/posts">
      <Button variant="outline">목록으로</Button>
    </Link>
    <Button onClick={handleSave}>수정 내용 저장</Button>
  </div>
</div>
```

---

## 10. 주요 소식 설정 페이지

### 10.1 페이지 구조 (`app/admin/featured/page.tsx`)

#### A. 상태 관리
```typescript
const [posts, setPosts] = useState<Post[]>([])
const [slots, setSlots] = useState<FeaturedSlots>({
  slot1Id: null,
  slot2Id: null,
  slot3Id: null,
})
```

#### B. 데이터 로드
```typescript
useEffect(() => {
  // 게시글 로드 (status: true만)
  const stored = localStorage.getItem("news_posts")
  if (stored) {
    const parsedPosts: Post[] = JSON.parse(stored)
    setPosts(parsedPosts.filter((p) => p.status))
  }

  // 슬롯 설정 로드
  const storedSlots = localStorage.getItem("featured_slots")
  if (storedSlots) {
    setSlots(JSON.parse(storedSlots))
  }
}, [])
```

#### C. 슬롯 선택 핸들러
```typescript
const handleSlotSelect = (slotKey: keyof FeaturedSlots, postId: number | null) => {
  setSlots((prev) => ({
    ...prev,
    [slotKey]: postId,
  }))
}
```

#### D. 저장 핸들러 (중복 검증)
```typescript
const handleSave = () => {
  // 중복 검증
  const slotValues = [slots.slot1Id, slots.slot2Id, slots.slot3Id].filter(
    (id) => id !== null
  )
  const uniqueSlots = new Set(slotValues)
  if (slotValues.length !== uniqueSlots.size) {
    alert("같은 게시글을 중복으로 선택할 수 없습니다.")
    return
  }

  localStorage.setItem("featured_slots", JSON.stringify(slots))
  alert("저장되었습니다.")
}
```

### 10.2 UI 구성

#### A. 3단 그리드 카드
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  {([1, 2, 3] as const).map((slotNum) => {
    const slotKey = `slot${slotNum}Id` as keyof FeaturedSlots
    const post = getSlotPost(slots[slotKey])

    return (
      <Card key={slotNum} className="overflow-hidden">
        {/* 대표 이미지 */}
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
              {/* 카테고리 배지 */}
              <Badge variant="outline" className={getCategoryColor(post.category)}>
                {post.category}
              </Badge>

              {/* 제목 */}
              <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2">
                {post.title}
              </h3>

              {/* 날짜 */}
              <p className="text-sm text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
              </p>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">게시글을 선택하세요</p>
            </div>
          )}

          {/* 슬롯 선택 드롭다운 */}
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
```

#### B. 저장 버튼
```tsx
<div className="flex justify-end">
  <Button onClick={handleSave} size="lg">
    변경 사항 저장
  </Button>
</div>
```

---

## 11. shadcn/ui 컴포넌트

### 11.1 사용된 컴포넌트 목록
| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| Button | `components/ui/button.tsx` | 버튼 |
| Input | `components/ui/input.tsx` | 텍스트 입력 |
| Label | `components/ui/label.tsx` | 폼 레이블 |
| Switch | `components/ui/switch.tsx` | 토글 스위치 |
| Select | `components/ui/select.tsx` | 드롭다운 선택 |
| Table | `components/ui/table.tsx` | 테이블 |
| Badge | `components/ui/badge.tsx` | 상태 배지 |
| Card | `components/ui/card.tsx` | 카드 레이아웃 |

### 11.2 예시: Button 컴포넌트
```typescript
import { ButtonHTMLAttributes, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**사용 예시**:
```tsx
<Button variant="default" size="lg">기본 버튼</Button>
<Button variant="outline">아웃라인 버튼</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
<Button variant="destructive">삭제 버튼</Button>
```

---

## 12. Tiptap 에디터

### 12.1 설정된 확장 기능
| 확장 | 기능 |
|------|------|
| `StarterKit` | 기본 마크다운 (굵게, 기울임, 목록, 제목 등) |
| `Image` | 이미지 삽입 (Base64 지원) |
| `Placeholder` | 빈 에디터 플레이스홀더 |

### 12.2 에디터 HTML 출력
```typescript
const content = editor?.getHTML()
```

**출력 예시**:
```html
<p>이것은 본문입니다.</p>
<h2>제목 2</h2>
<ul>
  <li>항목 1</li>
  <li>항목 2</li>
</ul>
<img src="data:image/png;base64,..." />
```

### 12.3 에디터 스타일
```typescript
editorProps: {
  attributes: {
    class: "prose prose-sm max-w-none min-h-[500px] p-4 focus:outline-none border rounded-md bg-background",
  },
}
```

- `prose`: Tailwind Typography 플러그인
- `prose-sm`: 작은 타이포그래피
- `max-w-none`: 최대 너비 제한 없음
- `min-h-[500px]`: 최소 높이 500px

---

## 13. 데이터 흐름도

```
사용자 입력
    │
    ├─ 로그인
    │   └─ localStorage.setItem("isAuthenticated", "true")
    │       └─ router.push("/admin/posts")
    │
    ├─ 게시글 작성
    │   ├─ 제목/본문 입력
    │   ├─ 이미지 업로드 (Base64 변환)
    │   ├─ 첨부파일 업로드 (Base64 변환)
    │   └─ handleSave()
    │       └─ localStorage.setItem("news_posts", JSON)
    │           └─ router.push("/admin/posts")
    │
    ├─ 게시글 수정
    │   ├─ URL 파라미터에서 ID 추출
    │   ├─ localStorage에서 게시글 로드
    │   ├─ 수정 후 handleSave()
    │   └─ localStorage 업데이트
    │       └─ router.push("/admin/posts")
    │
    ├─ 게시글 삭제
    │   └─ handleDelete()
    │       └─ localStorage에서 게시글 제거
    │           └─ router.push("/admin/posts")
    │
    ├─ 상태 토글
    │   └─ toggleStatus(id)
    │       └─ localStorage 업데이트 (즉시 반영)
    │
    └─ 주요 소식 설정
        ├─ 슬롯 선택 (Select 드롭다운)
        ├─ handleSave()
        │   ├─ 중복 검증
        │   └─ localStorage.setItem("featured_slots", JSON)
        └─ alert("저장되었습니다.")
```

---

## 14. LocalStorage 구조

### 14.1 `news_posts` 데이터 예시
```json
[
  {
    "id": 1704067200000,
    "title": "2024년 신년 건강검진 프로그램 안내",
    "content": "<p>새해를 맞이하여...</p>",
    "thumbnailImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "category": "공지",
    "status": true,
    "viewCount": 342,
    "publishedAt": "2024-01-01T09:00:00",
    "createdAt": "2024-01-01T09:00:00",
    "updatedAt": "2024-01-01T09:00:00",
    "attachment": {
      "name": "prechecklist.pdf",
      "data": "data:application/pdf;base64,JVBERi0xLjQK...",
      "size": 2457600
    }
  },
  {
    "id": 1704153600000,
    "title": "암센터 개원 10주년 기념 건강강좌 개최",
    "content": "<p>이대목동병원 암센터...</p>",
    "thumbnailImage": "",
    "category": "행사",
    "status": true,
    "viewCount": 218,
    "publishedAt": "2024-01-02T14:00:00",
    "createdAt": "2024-01-02T14:00:00",
    "updatedAt": "2024-01-02T14:00:00",
    "attachment": null
  }
]
```

### 14.2 `featured_slots` 데이터 예시
```json
{
  "slot1Id": 1704067200000,
  "slot2Id": 1704153600000,
  "slot3Id": 1704240000000
}
```

---

## 15. 한계점 및 개선 사항

### 15.1 현재 한계점
1. **LocalStorage 의존**:
   - 브라우저별 데이터 격리 (다른 PC에서 접근 불가)
   - 데이터 손실 위험 (브라우저 캐시 삭제 시)
   - 저장 용량 제한 (약 5~10MB)

2. **인증 시스템**:
   - 하드코딩된 계정 정보
   - 비밀번호 평문 저장
   - 세션 관리 없음

3. **이미지 저장**:
   - Base64 저장으로 용량 비효율
   - LocalStorage 용량 부족 가능

4. **동시 편집 불가**:
   - 여러 관리자가 동시 작업 불가
   - 충돌 해결 메커니즘 없음

5. **HTML 페이지와 분리**:
   - Admin에서 작성한 게시글이 HTML 페이지에 자동 반영 안됨

### 15.2 향후 개선 방향

#### A. 백엔드 API 도입
```
Admin (Next.js) → REST API → Database (PostgreSQL/MongoDB)
                       ↓
                  HTML 페이지 (SSR/SSG)
```

#### B. 인증 시스템 개선
- **JWT 토큰** 기반 인증
- **bcrypt** 패스워드 해싱
- **역할 기반 권한 관리** (RBAC)

#### C. 이미지 저장 개선
- **클라우드 스토리지** (AWS S3, Cloudinary)
- **이미지 리사이징** (Sharp, ImageMagick)
- **CDN** 배포

#### D. 실시간 협업
- **WebSocket** (Socket.io)
- **낙관적 UI 업데이트**
- **충돌 해결** (Operational Transformation)

#### E. 추가 기능
- **게시글 검색** (Elasticsearch)
- **페이지네이션**
- **다국어 지원** (i18n)
- **미디어 라이브러리**
- **버전 관리** (게시글 히스토리)
- **예약 발행**
- **태그 시스템**

---

## 16. API 설계 (향후 개발)

### 16.1 인증 API
```
POST   /api/auth/login        # 로그인
POST   /api/auth/logout       # 로그아웃
GET    /api/auth/me           # 현재 사용자 정보
```

### 16.2 게시글 API
```
GET    /api/posts             # 게시글 목록 (필터링, 검색)
GET    /api/posts/:id         # 게시글 상세
POST   /api/posts             # 게시글 작성
PUT    /api/posts/:id         # 게시글 수정
DELETE /api/posts/:id         # 게시글 삭제
PATCH  /api/posts/:id/status  # 상태 토글
```

### 16.3 주요 소식 API
```
GET    /api/featured          # 주요 소식 슬롯 조회
PUT    /api/featured          # 주요 소식 슬롯 저장
```

### 16.4 미디어 API
```
POST   /api/media/upload      # 이미지/파일 업로드
GET    /api/media/:id         # 미디어 조회
DELETE /api/media/:id         # 미디어 삭제
```

---

## 17. 보안 체크리스트

### 17.1 현재 보안 이슈
- [ ] 인증 정보 하드코딩
- [ ] 패스워드 평문 저장
- [ ] CSRF 보호 없음
- [ ] XSS 취약점 (HTML 콘텐츠 삽입)
- [ ] 파일 업로드 검증 부족

### 17.2 개선 필요 사항
- [ ] HTTPS 강제
- [ ] JWT 토큰 기반 인증
- [ ] 패스워드 해싱 (bcrypt)
- [ ] CSRF 토큰
- [ ] XSS 방지 (DOMPurify)
- [ ] 파일 타입/크기 검증
- [ ] Rate Limiting
- [ ] 입력 유효성 검사 (Zod)

---

## 18. 성능 최적화

### 18.1 현재 성능
- **초기 로드**: 빠름 (정적 컴포넌트)
- **데이터 로드**: 빠름 (LocalStorage)
- **이미지 로드**: 느림 (Base64, 인라인)

### 18.2 최적화 방향
1. **이미지 최적화**:
   - WebP 포맷 변환
   - 리사이징 (썸네일 생성)
   - Lazy Loading

2. **코드 스플리팅**:
   - Dynamic Import
   - Route-based Splitting

3. **캐싱**:
   - React Query (Server State)
   - SWR (Stale-While-Revalidate)

4. **가상화**:
   - 긴 리스트 가상화 (react-window)

---

이 문서는 Admin 페이지(CMS)의 모든 기능과 구조를 상세하게 분석한 내용입니다.
