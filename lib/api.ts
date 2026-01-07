/**
 * API 유틸리티
 * - localhost와 외부 호스팅 모두에서 작동하도록 설계
 * - 상대 경로를 사용하여 현재 호스트에 자동으로 맞춤
 */

// API 기본 URL 가져오기
// 환경 변수가 설정되어 있으면 사용, 아니면 상대 경로 사용
export function getApiBaseUrl(): string {
  // 클라이언트 사이드: 상대 경로 사용 (자동으로 현재 호스트 사용)
  if (typeof window !== 'undefined') {
    // 환경 변수가 설정되어 있으면 사용
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    // 상대 경로 사용 (현재 호스트 자동 적용)
    return ''
  }

  // 서버 사이드: 환경 변수 또는 기본값 사용
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // 기본값: 상대 경로
  return ''
}

// API 엔드포인트 생성
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl()
  // endpoint가 이미 /로 시작하면 그대로 사용
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${path}`
}

// Fetch 래퍼 함수 (에러 핸들링 포함)
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = getApiUrl(endpoint)

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// GET 요청
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' })
}

// POST 요청
export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// PUT 요청
export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// DELETE 요청
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' })
}
