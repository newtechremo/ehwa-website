"use client"

import type React from "react"

declare global {
  interface Window {
    ChannelIO?: (command: string, ...args: unknown[]) => void
  }
}

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

  // 로그인 페이지는 레이아웃 적용 안함
  const isLoginPage = pathname === "/admin/login"

  // 관리자 페이지에서 채널톡 숨기기
  useEffect(() => {
    const hideChannelTalk = () => {
      if (typeof window !== "undefined" && window.ChannelIO) {
        window.ChannelIO("hideChannelButton")
      }
    }
    hideChannelTalk()
    // ChannelIO가 늦게 로드될 수 있으므로 재시도
    const timer = setTimeout(hideChannelTalk, 1000)
    return () => {
      clearTimeout(timer)
      // 관리자 페이지를 벗어날 때 다시 표시
      if (typeof window !== "undefined" && window.ChannelIO) {
        window.ChannelIO("showChannelButton")
      }
    }
  }, [])

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false)
      return
    }

    const authStatus = localStorage.getItem("isAuthenticated")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    } else {
      router.push("/admin/login")
    }
    setIsLoading(false)
  }, [router, isLoginPage])

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

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    router.push("/admin/login")
  }

  // 로그인 페이지는 레이아웃 없이 렌더링
  if (isLoginPage) {
    return <>{children}</>
  }

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
          <h1 className="text-lg font-semibold text-foreground leading-tight">이대목동병원 장애인 이용편의 지원센터</h1>
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
                  item.active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t">
          <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleLogout}>
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
