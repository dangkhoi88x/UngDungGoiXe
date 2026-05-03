import {
  parseApiErrorFromResponse,
  unwrapApiData,
} from './apiResponse'
import { authFetch } from './authFetch'

/** Tránh `VITE_API_BASE=` rỗng — `??` không fallback và sẽ gọi sai origin/path. */
function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim().replace(/\/+$/, '')
  }
  return '/api'
}

const API_BASE = apiBase()

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type BlogPostPublicDto = {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  content: string
  coverImageUrl?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type BlogPostAdminDto = BlogPostPublicDto & {
  status: BlogPostStatus
  authorAdminId?: number | null
}

export type PagedBlogPostsPublic = {
  content: BlogPostPublicDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export type PagedBlogPostsAdmin = {
  content: BlogPostAdminDto[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export type BlogPostUpsertPayload = {
  slug?: string | null
  title: string
  excerpt?: string | null
  content: string
  coverImageUrl?: string | null
  status?: BlogPostStatus | null
}

async function parseApiError(res: Response): Promise<string> {
  return parseApiErrorFromResponse(res)
}

/** Public — không JWT. */
export async function fetchPublishedBlogPostsPage(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  keyword?: string
}): Promise<PagedBlogPostsPublic> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'publishedAt')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.keyword != null && params.keyword.trim() !== '') {
    q.set('keyword', params.keyword.trim())
  }
  const res = await fetch(`${API_BASE}/blog/posts?${q}`, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedBlogPostsPublic>(payload)
  if (!paged) throw new Error('Phản hồi danh sách blog không hợp lệ.')
  return paged
}

export async function fetchPublishedBlogPostBySlug(slug: string): Promise<BlogPostPublicDto> {
  const enc = encodeURIComponent(slug)
  const res = await fetch(`${API_BASE}/blog/posts/${enc}`, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BlogPostPublicDto>(payload)
  if (!data) throw new Error('Phản hồi bài viết không hợp lệ.')
  return data
}

/** Admin — JWT. */
export async function fetchAdminBlogPostsPage(params: {
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  keyword?: string
  status?: BlogPostStatus | ''
}): Promise<PagedBlogPostsAdmin> {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 10))
  q.set('sortBy', params.sortBy ?? 'updatedAt')
  q.set('sortDir', params.sortDir ?? 'desc')
  if (params.keyword != null && params.keyword.trim() !== '') {
    q.set('keyword', params.keyword.trim())
  }
  if (params.status) q.set('status', params.status)
  const res = await authFetch(`${API_BASE}/admin/blog/posts?${q}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const paged = unwrapApiData<PagedBlogPostsAdmin>(payload)
  if (!paged) throw new Error('Phản hồi danh sách blog (admin) không hợp lệ.')
  return paged
}

export async function fetchAdminBlogPostById(id: number): Promise<BlogPostAdminDto> {
  const res = await authFetch(`${API_BASE}/admin/blog/posts/${id}`)
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BlogPostAdminDto>(payload)
  if (!data) throw new Error('Phản hồi bài viết không hợp lệ.')
  return data
}

export async function createAdminBlogPost(body: BlogPostUpsertPayload): Promise<BlogPostAdminDto> {
  const res = await authFetch(`${API_BASE}/admin/blog/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BlogPostAdminDto>(payload)
  if (!data) throw new Error('Phản hồi tạo bài viết không hợp lệ.')
  return data
}

export async function updateAdminBlogPost(
  id: number,
  body: BlogPostUpsertPayload,
): Promise<BlogPostAdminDto> {
  const res = await authFetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BlogPostAdminDto>(payload)
  if (!data) throw new Error('Phản hồi cập nhật bài viết không hợp lệ.')
  return data
}

export async function publishAdminBlogPost(id: number): Promise<BlogPostAdminDto> {
  const res = await authFetch(`${API_BASE}/admin/blog/posts/${id}/publish`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<BlogPostAdminDto>(payload)
  if (!data) throw new Error('Phản hồi xuất bản không hợp lệ.')
  return data
}

export async function deleteAdminBlogPost(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await parseApiError(res))
  }
}
