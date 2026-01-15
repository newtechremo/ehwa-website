/**
 * JSON에서 SQLite로 마이그레이션 스크립트
 *
 * 사용법: node scripts/migrate-to-sqlite.js
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const postsJsonPath = path.join(__dirname, '..', 'data', 'posts.json')
const featuredJsonPath = path.join(__dirname, '..', 'data', 'featured.json')
const dbPath = path.join(__dirname, '..', 'data', 'ehwa.db')

console.log('=== JSON → SQLite 마이그레이션 시작 ===\n')

// 기존 DB 파일이 있으면 삭제
if (fs.existsSync(dbPath)) {
  console.log('기존 데이터베이스 파일 삭제 중...')
  fs.unlinkSync(dbPath)
}

// 데이터베이스 생성 및 초기화
console.log('데이터베이스 생성 중...')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// 테이블 생성
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

console.log('테이블 및 인덱스 생성 완료\n')

// posts.json 마이그레이션
if (fs.existsSync(postsJsonPath)) {
  console.log('posts.json 마이그레이션 시작...')
  const postsData = JSON.parse(fs.readFileSync(postsJsonPath, 'utf-8'))
  console.log(`총 ${postsData.length}개 게시글 발견\n`)

  const insertPost = db.prepare(`
    INSERT INTO posts (id, title, content, thumbnailImage, category, status, viewCount, publishedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertAttachment = db.prepare(`
    INSERT INTO attachments (postId, name, path, size, isLegacy, legacyData)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  let postCount = 0
  let attachmentCount = 0

  const insertAll = db.transaction(() => {
    for (const post of postsData) {
      // 게시글 삽입
      insertPost.run(
        post.id,
        post.title,
        post.content,
        post.thumbnailImage || null,
        post.category,
        post.status ? 1 : 0,
        post.viewCount || 0,
        post.publishedAt,
        post.createdAt,
        post.updatedAt
      )
      postCount++

      // 첨부파일 처리 (attachments 배열)
      const attachments = post.attachments || []
      const processedNames = new Set()

      for (const att of attachments) {
        if (!processedNames.has(att.name)) {
          insertAttachment.run(
            post.id,
            att.name,
            att.path || '',
            att.size || 0,
            att.data ? 1 : 0,
            att.data || null
          )
          processedNames.add(att.name)
          attachmentCount++
        }
      }

      // 단일 attachment 처리 (중복 방지)
      if (post.attachment && post.attachment.name && !processedNames.has(post.attachment.name)) {
        insertAttachment.run(
          post.id,
          post.attachment.name,
          post.attachment.path || '',
          post.attachment.size || 0,
          post.attachment.data ? 1 : 0,
          post.attachment.data || null
        )
        attachmentCount++
      }

      console.log(`  ✓ 게시글 #${post.id}: ${post.title.substring(0, 30)}...`)
    }
  })

  insertAll()
  console.log(`\n게시글 ${postCount}개, 첨부파일 ${attachmentCount}개 마이그레이션 완료`)
} else {
  console.log('posts.json 파일이 없습니다. 기본 데이터 없이 진행합니다.')
}

// featured.json 마이그레이션
if (fs.existsSync(featuredJsonPath)) {
  console.log('\nfeatured.json 마이그레이션 시작...')
  const featuredData = JSON.parse(fs.readFileSync(featuredJsonPath, 'utf-8'))

  // 0이나 falsy 값은 null로 변환
  const slot1Id = featuredData.slot1Id || null
  const slot2Id = featuredData.slot2Id || null
  const slot3Id = featuredData.slot3Id || null

  db.prepare(`
    UPDATE featured_slots SET slot1Id = ?, slot2Id = ?, slot3Id = ? WHERE id = 1
  `).run(slot1Id, slot2Id, slot3Id)

  console.log(`  슬롯1: ${slot1Id || 'null'}`)
  console.log(`  슬롯2: ${slot2Id || 'null'}`)
  console.log(`  슬롯3: ${slot3Id || 'null'}`)
  console.log('featured.json 마이그레이션 완료')
} else {
  console.log('\nfeatured.json 파일이 없습니다. 기본값 사용.')
}

// 데이터베이스 닫기
db.close()

// 결과 출력
const dbSize = fs.statSync(dbPath).size
console.log('\n=== 마이그레이션 완료 ===')
console.log(`데이터베이스 파일: ${dbPath}`)
console.log(`데이터베이스 크기: ${(dbSize / 1024).toFixed(2)} KB`)

// JSON 파일 크기와 비교
if (fs.existsSync(postsJsonPath)) {
  const jsonSize = fs.statSync(postsJsonPath).size
  console.log(`\nJSON 파일 크기: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`SQLite 파일 크기: ${(dbSize / 1024).toFixed(2)} KB`)
  console.log(`크기 감소: ${((1 - dbSize / jsonSize) * 100).toFixed(1)}%`)
}
