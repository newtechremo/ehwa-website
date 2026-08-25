import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"

/**
 * 관리자 인증.
 *
 * 기존 구조는 클라이언트에서 아이디/비밀번호를 비교하고 localStorage에 플래그만 남겼기 때문에,
 * 서버 API는 사실상 무인증이었다(외부에서 POST /api/posts 로 게시글 조작 가능).
 * 여기서는 서버가 비밀번호를 검증하고 HMAC 서명된 세션 토큰을 httpOnly 쿠키로 발급한다.
 *
 * 필요한 환경변수
 *   ADMIN_USERNAME        기본값 "admin"
 *   ADMIN_PASSWORD_HASH   scrypt:<salt>:<hash>  (생성: npm run admin:hash -- '새비밀번호')
 *   ADMIN_SESSION_SECRET  세션 서명 키 (32바이트 이상 랜덤)
 */

export const SESSION_COOKIE = "ehwa_admin_session"
const SESSION_TTL_SEC = 60 * 60 * 8 // 8시간

// ───────── 비밀번호 ─────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  // 구분자로 ':' 를 쓴다. '$' 는 Next.js(@next/env)·셸·docker-compose 등이
  // 변수 확장으로 해석해 값이 조용히 잘려나간다.
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  // ':' 형식이 표준. '$' 형식은 초기 버전 호환용으로만 받는다.
  const parts = stored.includes(":") ? stored.split(":") : stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  const [, salt, expected] = parts
  let actual: Buffer
  try {
    actual = scryptSync(password, salt, 64)
  } catch {
    return false
  }
  const expectedBuf = Buffer.from(expected, "hex")
  if (expectedBuf.length !== actual.length) return false
  return timingSafeEqual(actual, expectedBuf)
}

// ───────── 세션 토큰 ─────────

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url")
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function getSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET
  return s && s.length >= 16 ? s : null
}

export function createSessionToken(username: string): string | null {
  const secret = getSecret()
  if (!secret) return null
  const payload = b64url(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC }))
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const secret = getSecret()
  if (!secret) return false

  const idx = token.lastIndexOf(".")
  if (idx <= 0) return false
  const payload = token.slice(0, idx)
  const sig = token.slice(idx + 1)

  const expected = sign(payload, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

// ───────── 요청 가드 ─────────

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie")
  if (!header) return undefined
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === name) return decodeURIComponent(v.join("="))
  }
  return undefined
}

export function isAuthenticated(request: Request): boolean {
  return verifySessionToken(readCookie(request, SESSION_COOKIE))
}

/** 인증 설정이 아예 없는 배포에서 쓰기 API가 열리는 것을 막는다 */
export function isAuthConfigured(): boolean {
  return Boolean(getSecret() && process.env.ADMIN_PASSWORD_HASH)
}

export const SESSION_MAX_AGE = SESSION_TTL_SEC

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || "admin"
}
