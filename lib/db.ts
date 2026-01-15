import Database from "better-sqlite3"
import path from "path"

// 데이터베이스 파일 경로
const dbPath = path.join(process.cwd(), "data", "ehwa.db")

// 싱글톤 데이터베이스 인스턴스
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma("journal_mode = WAL")
    initializeDb(db)
  }
  return db
}

// 데이터베이스 초기화
function initializeDb(db: Database.Database) {
  // posts 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      thumbnailImage TEXT,
      category TEXT NOT NULL CHECK(category IN ('공지', '행사', '뉴스')),
      status INTEGER NOT NULL DEFAULT 1,
      viewCount INTEGER NOT NULL DEFAULT 0,
      publishedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // attachments 테이블 (1:N 관계)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      isLegacy INTEGER NOT NULL DEFAULT 0,
      legacyData TEXT,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
    )
  `)

  // featured_slots 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS featured_slots (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      slot1Id INTEGER,
      slot2Id INTEGER,
      slot3Id INTEGER,
      FOREIGN KEY (slot1Id) REFERENCES posts(id) ON DELETE SET NULL,
      FOREIGN KEY (slot2Id) REFERENCES posts(id) ON DELETE SET NULL,
      FOREIGN KEY (slot3Id) REFERENCES posts(id) ON DELETE SET NULL
    )
  `)

  // featured_slots 초기 레코드 생성
  db.exec(`
    INSERT OR IGNORE INTO featured_slots (id, slot1Id, slot2Id, slot3Id)
    VALUES (1, NULL, NULL, NULL)
  `)

  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_publishedAt ON posts(publishedAt);
    CREATE INDEX IF NOT EXISTS idx_attachments_postId ON attachments(postId);
  `)
}

// Post 타입 정의
export type PostRow = {
  id: number
  title: string
  content: string
  thumbnailImage: string | null
  category: "공지" | "행사" | "뉴스"
  status: number
  viewCount: number
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export type AttachmentRow = {
  id: number
  postId: number
  name: string
  path: string
  size: number
  isLegacy: number
  legacyData: string | null
}

export type FeaturedSlotsRow = {
  id: number
  slot1Id: number | null
  slot2Id: number | null
  slot3Id: number | null
}

// ============ Posts CRUD ============

// 모든 게시글 조회
export function getAllPosts(): PostRow[] {
  const db = getDb()
  return db.prepare("SELECT * FROM posts ORDER BY publishedAt DESC").all() as PostRow[]
}

// 활성 게시글만 조회
export function getActivePosts(): PostRow[] {
  const db = getDb()
  return db.prepare("SELECT * FROM posts WHERE status = 1 ORDER BY publishedAt DESC").all() as PostRow[]
}

// 단일 게시글 조회
export function getPostById(id: number): PostRow | null {
  const db = getDb()
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as PostRow | null
}

// 게시글 생성
export function createPost(post: Omit<PostRow, "id"> & { id?: number }): number {
  const db = getDb()
  const id = post.id || Date.now()
  const stmt = db.prepare(`
    INSERT INTO posts (id, title, content, thumbnailImage, category, status, viewCount, publishedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    post.title,
    post.content,
    post.thumbnailImage || null,
    post.category,
    post.status,
    post.viewCount,
    post.publishedAt,
    post.createdAt,
    post.updatedAt
  )
  return id
}

// 게시글 수정
export function updatePost(id: number, post: Partial<PostRow>): boolean {
  const db = getDb()
  const existing = getPostById(id)
  if (!existing) return false

  const updated = { ...existing, ...post, updatedAt: new Date().toISOString() }
  const stmt = db.prepare(`
    UPDATE posts SET
      title = ?, content = ?, thumbnailImage = ?, category = ?,
      status = ?, viewCount = ?, publishedAt = ?, updatedAt = ?
    WHERE id = ?
  `)
  stmt.run(
    updated.title,
    updated.content,
    updated.thumbnailImage,
    updated.category,
    updated.status,
    updated.viewCount,
    updated.publishedAt,
    updated.updatedAt,
    id
  )
  return true
}

// 게시글 삭제
export function deletePost(id: number): boolean {
  const db = getDb()
  const result = db.prepare("DELETE FROM posts WHERE id = ?").run(id)
  return result.changes > 0
}

// 조회수 증가
export function incrementViewCount(id: number): void {
  const db = getDb()
  db.prepare("UPDATE posts SET viewCount = viewCount + 1 WHERE id = ?").run(id)
}

// ============ Attachments CRUD ============

// 게시글의 첨부파일 조회
export function getAttachmentsByPostId(postId: number): AttachmentRow[] {
  const db = getDb()
  return db.prepare("SELECT * FROM attachments WHERE postId = ?").all(postId) as AttachmentRow[]
}

// 첨부파일 추가
export function addAttachment(attachment: Omit<AttachmentRow, "id">): number {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO attachments (postId, name, path, size, isLegacy, legacyData)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    attachment.postId,
    attachment.name,
    attachment.path,
    attachment.size,
    attachment.isLegacy,
    attachment.legacyData
  )
  return Number(result.lastInsertRowid)
}

// 게시글의 모든 첨부파일 삭제
export function deleteAttachmentsByPostId(postId: number): void {
  const db = getDb()
  db.prepare("DELETE FROM attachments WHERE postId = ?").run(postId)
}

// ============ Featured Slots CRUD ============

// 주요 소식 슬롯 조회
export function getFeaturedSlots(): FeaturedSlotsRow {
  const db = getDb()
  return db.prepare("SELECT * FROM featured_slots WHERE id = 1").get() as FeaturedSlotsRow
}

// 주요 소식 슬롯 업데이트
export function updateFeaturedSlots(slots: Omit<FeaturedSlotsRow, "id">): void {
  const db = getDb()
  db.prepare(`
    UPDATE featured_slots SET slot1Id = ?, slot2Id = ?, slot3Id = ? WHERE id = 1
  `).run(slots.slot1Id, slots.slot2Id, slots.slot3Id)
}

// ============ 헬퍼 함수 ============

// PostRow를 클라이언트용 Post 타입으로 변환
export function toClientPost(row: PostRow, attachments: AttachmentRow[] = []) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    thumbnailImage: row.thumbnailImage || "",
    category: row.category,
    status: row.status === 1,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    attachments: attachments.map(att => ({
      name: att.name,
      path: att.path,
      size: att.size,
    })),
    // 단일 attachment는 첫 번째 첨부파일로 설정 (레거시 호환)
    attachment: attachments.length > 0 ? {
      name: attachments[0].name,
      path: attachments[0].path,
      size: attachments[0].size,
    } : null,
  }
}

// 전체 게시글을 클라이언트 형식으로 변환
export function getAllPostsWithAttachments() {
  const posts = getAllPosts()
  return posts.map(post => {
    const attachments = getAttachmentsByPostId(post.id)
    return toClientPost(post, attachments)
  })
}

// 활성 게시글을 클라이언트 형식으로 변환
export function getActivePostsWithAttachments() {
  const posts = getActivePosts()
  return posts.map(post => {
    const attachments = getAttachmentsByPostId(post.id)
    return toClientPost(post, attachments)
  })
}

// 단일 게시글을 클라이언트 형식으로 변환
export function getPostWithAttachments(id: number) {
  const post = getPostById(id)
  if (!post) return null
  const attachments = getAttachmentsByPostId(id)
  return toClientPost(post, attachments)
}
