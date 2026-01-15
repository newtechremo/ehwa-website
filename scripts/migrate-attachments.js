/**
 * 첨부파일 마이그레이션 스크립트
 * base64로 저장된 첨부파일을 파일로 추출하고, posts.json을 경량화합니다.
 *
 * 사용법: node scripts/migrate-attachments.js
 */

const fs = require('fs')
const path = require('path')

const postsPath = path.join(__dirname, '..', 'data', 'posts.json')
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'attachments')
const backupPath = path.join(__dirname, '..', 'data', 'posts.backup.json')

// 디렉토리 확인 및 생성
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// base64 데이터에서 파일 추출
function extractBase64ToFile(base64Data, originalName, postId) {
  // data:application/pdf;base64,... 형식에서 데이터 추출
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    console.log(`  - 유효하지 않은 base64 데이터: ${originalName}`)
    return null
  }

  const mimeType = matches[1]
  const base64 = matches[2]
  const buffer = Buffer.from(base64, 'base64')

  // 고유 파일명 생성
  const ext = path.extname(originalName) || getExtFromMime(mimeType)
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .substring(0, 50)
  const timestamp = postId || Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const uniqueFilename = `${timestamp}_${random}_${baseName}${ext}`

  const filePath = path.join(uploadsDir, uniqueFilename)
  fs.writeFileSync(filePath, buffer)

  return {
    name: originalName,
    path: `/uploads/attachments/${uniqueFilename}`,
    size: buffer.length
  }
}

function getExtFromMime(mimeType) {
  const mimeMap = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'text/plain': '.txt',
  }
  return mimeMap[mimeType] || ''
}

async function migrate() {
  console.log('=== 첨부파일 마이그레이션 시작 ===\n')

  // 원본 파일 읽기
  if (!fs.existsSync(postsPath)) {
    console.log('posts.json 파일이 없습니다.')
    return
  }

  const originalSize = fs.statSync(postsPath).size
  console.log(`원본 posts.json 크기: ${(originalSize / 1024 / 1024).toFixed(2)} MB\n`)

  // 백업 생성
  console.log('백업 생성 중...')
  fs.copyFileSync(postsPath, backupPath)
  console.log(`백업 완료: ${backupPath}\n`)

  // JSON 파싱
  const posts = JSON.parse(fs.readFileSync(postsPath, 'utf-8'))
  console.log(`총 ${posts.length}개 게시글 처리 중...\n`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const post of posts) {
    console.log(`게시글 #${post.id}: ${post.title.substring(0, 30)}...`)

    // attachments 처리
    if (post.attachments && post.attachments.length > 0) {
      const newAttachments = []
      for (const att of post.attachments) {
        if (att.data && !att.path) {
          // base64 데이터가 있고 path가 없으면 마이그레이션
          try {
            const result = extractBase64ToFile(att.data, att.name, post.id)
            if (result) {
              newAttachments.push(result)
              console.log(`  ✓ 마이그레이션: ${att.name}`)
              migratedCount++
            } else {
              newAttachments.push({ name: att.name, path: '', size: att.size })
              errorCount++
            }
          } catch (err) {
            console.log(`  ✗ 오류: ${att.name} - ${err.message}`)
            newAttachments.push({ name: att.name, path: '', size: att.size })
            errorCount++
          }
        } else if (att.path) {
          // 이미 마이그레이션됨
          newAttachments.push(att)
          console.log(`  - 이미 마이그레이션됨: ${att.name}`)
          skippedCount++
        }
      }
      post.attachments = newAttachments
    }

    // 단일 attachment 처리
    if (post.attachment && post.attachment.data && !post.attachment.path) {
      try {
        const result = extractBase64ToFile(post.attachment.data, post.attachment.name, post.id)
        if (result) {
          post.attachment = result
          console.log(`  ✓ 마이그레이션 (단일): ${post.attachment.name}`)
          migratedCount++
        }
      } catch (err) {
        console.log(`  ✗ 오류 (단일): ${post.attachment.name} - ${err.message}`)
        errorCount++
      }
    } else if (post.attachment && post.attachment.path) {
      console.log(`  - 이미 마이그레이션됨 (단일): ${post.attachment.name}`)
      skippedCount++
    }
  }

  // 새 posts.json 저장
  console.log('\n새 posts.json 저장 중...')
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2))

  const newSize = fs.statSync(postsPath).size
  console.log(`\n=== 마이그레이션 완료 ===`)
  console.log(`마이그레이션: ${migratedCount}개`)
  console.log(`이미 처리됨: ${skippedCount}개`)
  console.log(`오류: ${errorCount}개`)
  console.log(`\n파일 크기 변화:`)
  console.log(`  - 이전: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  - 이후: ${(newSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  - 감소: ${((originalSize - newSize) / 1024 / 1024).toFixed(2)} MB (${((1 - newSize / originalSize) * 100).toFixed(1)}%)`)
}

migrate().catch(console.error)
