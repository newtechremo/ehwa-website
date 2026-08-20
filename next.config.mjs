/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 본문 크기 제한 (25MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // 외부 접근 허용을 위한 설정
  async headers() {
    return [
      {
        // 모든 라우트에 CORS 헤더 적용
        source: '/:path*',
        headers: [
          // 읽기만 교차 출처 허용. 쓰기(POST/PUT/DELETE)는 관리자 세션 쿠키가 필요하며
          // 교차 출처에서 호출할 이유가 없어 허용 메서드에서 제외한다.
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
}

export default nextConfig
