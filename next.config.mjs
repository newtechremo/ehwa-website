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
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
