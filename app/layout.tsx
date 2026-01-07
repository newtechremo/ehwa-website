import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "이대목동병원 장애인 이용편의 지원센터",
  description: "더 편안한 진료를 위해 동행하겠습니다. 이동이나 의사소통에 도움이 필요하시다면 언제든 신청해주세요.",
  generator: "v0.app",
  keywords: ["장애인", "의료지원", "이대목동병원", "장애인편의", "수어통역", "동행서비스"],
  icons: {
    icon: [
      {
        url: "/favicon-v2.ico",
        sizes: "32x32",
      },
      {
        url: "/icon-v2-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-v2-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icon-v2.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon-v2.png",
    shortcut: "/favicon-v2.ico",
  },
  openGraph: {
    title: "이대목동병원 장애인 이용편의 지원센터",
    description: "더 편안한 진료를 위해 동행하겠습니다",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 검색엔진 비노출 설정 */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />

        {/* Pretendard 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css"
        />

        {/* FontAwesome CDN */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`font-sans antialiased`} style={{ fontFamily: "'Pretendard', sans-serif" }}>
        {children}
        <Analytics />

        {/* 채널톡 챗봇 - 우측 하단 플로팅 버튼 */}
        <Script
          id="channel-talk-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){var w=window;if(w.ChannelIO){return w.console.error("ChannelIO script included twice.");}var ch=function(){ch.c(arguments);};ch.q=[];ch.c=function(args){ch.q.push(args);};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return;}w.ChannelIOInitialized=true;var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";var x=document.getElementsByTagName("script")[0];if(x.parentNode){x.parentNode.insertBefore(s,x);}}if(document.readyState==="complete"){l();}else{w.addEventListener("DOMContentLoaded",l);w.addEventListener("load",l);}})();
              ChannelIO('boot', {
                "pluginKey": "a5de3b65-d01e-4207-9bec-01f3bd28c4a7"
              });
            `,
          }}
        />
      </body>
    </html>
  )
}
