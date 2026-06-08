import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// ============ Supabase 클라이언트 (서버 전용 / service_role) ============
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)가 없습니다.")
    }
    client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export const ATTACHMENT_BUCKET = "ehwa-attachments"

// ============ 타입 (기존 코드 호환: status/isLegacy는 0/1 number 유지) ============
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

// ============ 경계 변환 (Postgres boolean <-> 기존 number 0/1) ============
function toPostRow(r: any): PostRow {
  return { ...r, status: r.status ? 1 : 0 } as PostRow
}
function toAttachmentRow(r: any): AttachmentRow {
  return { ...r, isLegacy: r.isLegacy ? 1 : 0 } as AttachmentRow
}

// ============ Posts CRUD ============
export async function getAllPosts(): Promise<PostRow[]> {
  const { data, error } = await db().from("posts").select("*").order("publishedAt", { ascending: false })
  if (error) throw error
  return (data ?? []).map(toPostRow)
}

export async function getActivePosts(): Promise<PostRow[]> {
  const { data, error } = await db()
    .from("posts")
    .select("*")
    .eq("status", true)
    .order("publishedAt", { ascending: false })
  if (error) throw error
  return (data ?? []).map(toPostRow)
}

export async function getPostById(id: number): Promise<PostRow | null> {
  const { data, error } = await db().from("posts").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? toPostRow(data) : null
}

export async function createPost(post: Omit<PostRow, "id"> & { id?: number }): Promise<number> {
  const id = post.id || Date.now()
  const { error } = await db().from("posts").insert({
    id,
    title: post.title,
    content: post.content,
    thumbnailImage: post.thumbnailImage || null,
    category: post.category,
    status: !!post.status,
    viewCount: post.viewCount ?? 0,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  })
  if (error) throw error
  return id
}

export async function updatePost(id: number, post: Partial<PostRow>): Promise<boolean> {
  const patch: Record<string, any> = { updatedAt: new Date().toISOString() }
  if (post.title !== undefined) patch.title = post.title
  if (post.content !== undefined) patch.content = post.content
  if (post.thumbnailImage !== undefined) patch.thumbnailImage = post.thumbnailImage || null
  if (post.category !== undefined) patch.category = post.category
  if (post.status !== undefined) patch.status = !!post.status
  if (post.viewCount !== undefined) patch.viewCount = post.viewCount
  if (post.publishedAt !== undefined) patch.publishedAt = post.publishedAt

  const { data, error } = await db().from("posts").update(patch).eq("id", id).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function deletePost(id: number): Promise<boolean> {
  const { data, error } = await db().from("posts").delete().eq("id", id).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function incrementViewCount(id: number): Promise<void> {
  const current = await getPostById(id)
  if (!current) return
  const { error } = await db().from("posts").update({ viewCount: current.viewCount + 1 }).eq("id", id)
  if (error) throw error
}

// ============ Attachments CRUD ============
export async function getAttachmentsByPostId(postId: number): Promise<AttachmentRow[]> {
  const { data, error } = await db().from("attachments").select("*").eq("postId", postId)
  if (error) throw error
  return (data ?? []).map(toAttachmentRow)
}

export async function addAttachment(attachment: Omit<AttachmentRow, "id">): Promise<number> {
  const { data, error } = await db()
    .from("attachments")
    .insert({
      postId: attachment.postId,
      name: attachment.name,
      path: attachment.path,
      size: attachment.size,
      isLegacy: !!attachment.isLegacy,
      legacyData: attachment.legacyData,
    })
    .select("id")
    .single()
  if (error) throw error
  return Number(data.id)
}

export async function deleteAttachmentsByPostId(postId: number): Promise<void> {
  const { error } = await db().from("attachments").delete().eq("postId", postId)
  if (error) throw error
}

// ============ Featured Slots CRUD ============
export async function getFeaturedSlots(): Promise<FeaturedSlotsRow> {
  const { data, error } = await db().from("featured_slots").select("*").eq("id", 1).single()
  if (error) throw error
  return data as FeaturedSlotsRow
}

export async function updateFeaturedSlots(slots: Omit<FeaturedSlotsRow, "id">): Promise<void> {
  const { error } = await db()
    .from("featured_slots")
    .update({ slot1Id: slots.slot1Id, slot2Id: slots.slot2Id, slot3Id: slots.slot3Id })
    .eq("id", 1)
  if (error) throw error
}

// ============ 헬퍼 ============
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
    attachments: attachments.map((att) => ({ name: att.name, path: att.path, size: att.size })),
    attachment:
      attachments.length > 0
        ? { name: attachments[0].name, path: attachments[0].path, size: attachments[0].size }
        : null,
  }
}

// 여러 게시글의 첨부를 한 번에 조회해 그룹핑 (N+1 방지)
async function attachmentsByPostIds(ids: number[]): Promise<Map<number, AttachmentRow[]>> {
  const map = new Map<number, AttachmentRow[]>()
  if (ids.length === 0) return map
  const { data, error } = await db().from("attachments").select("*").in("postId", ids)
  if (error) throw error
  for (const r of data ?? []) {
    const a = toAttachmentRow(r)
    const list = map.get(a.postId) ?? []
    list.push(a)
    map.set(a.postId, list)
  }
  return map
}

export async function getAllPostsWithAttachments() {
  const posts = await getAllPosts()
  const map = await attachmentsByPostIds(posts.map((p) => p.id))
  return posts.map((p) => toClientPost(p, map.get(p.id) ?? []))
}

export async function getActivePostsWithAttachments() {
  const posts = await getActivePosts()
  const map = await attachmentsByPostIds(posts.map((p) => p.id))
  return posts.map((p) => toClientPost(p, map.get(p.id) ?? []))
}

export async function getPostWithAttachments(id: number) {
  const post = await getPostById(id)
  if (!post) return null
  const attachments = await getAttachmentsByPostId(id)
  return toClientPost(post, attachments)
}

// ============ Storage ============
export async function uploadAttachmentFile(key: string, bytes: Buffer, contentType: string): Promise<string> {
  const { error } = await db().storage.from(ATTACHMENT_BUCKET).upload(key, bytes, {
    contentType,
    upsert: true,
  })
  if (error) throw error
  const { data } = db().storage.from(ATTACHMENT_BUCKET).getPublicUrl(key)
  return data.publicUrl
}

export async function deleteAttachmentFile(key: string): Promise<void> {
  await db().storage.from(ATTACHMENT_BUCKET).remove([key])
}
