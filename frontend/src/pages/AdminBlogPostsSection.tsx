import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import {
  ADMIN_SESSION_KEYS,
  clampAdminPageSize,
  readAdminSession,
  writeAdminSession,
} from '../lib/adminSessionStorage'
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogPostById,
  fetchAdminBlogPostsPage,
  publishAdminBlogPost,
  updateAdminBlogPost,
  type BlogPostAdminDto,
  type BlogPostStatus,
  type BlogPostUpsertPayload,
} from '../api/blogPosts'
import AdminBlogRichTextEditor from '../components/AdminBlogRichTextEditor'
import './AdminVehiclesSection.css'
import './AdminBlogPostsSection.css'

const STATUSES: { value: BlogPostStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'ARCHIVED', label: 'Đã lưu trữ' },
]

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Cập nhật' },
  { value: 'publishedAt', label: 'Xuất bản' },
  { value: 'createdAt', label: 'Tạo' },
  { value: 'title', label: 'Tiêu đề' },
  { value: 'slug', label: 'Slug' },
  { value: 'id', label: 'ID' },
] as const

type FormState = {
  slug: string
  title: string
  excerpt: string
  content: string
  coverImageUrl: string
  status: BlogPostStatus
}

function emptyForm(): FormState {
  return {
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    coverImageUrl: '',
    status: 'DRAFT',
  }
}

function postToForm(p: BlogPostAdminDto): FormState {
  return {
    slug: p.slug ?? '',
    title: p.title ?? '',
    excerpt: p.excerpt ?? '',
    content: p.content ?? '',
    coverImageUrl: p.coverImageUrl ?? '',
    status: p.status,
  }
}

function statusLabel(s: BlogPostStatus): string {
  const m: Record<BlogPostStatus, string> = {
    DRAFT: 'Nháp',
    PUBLISHED: 'Đã XB',
    ARCHIVED: 'Lưu trữ',
  }
  return m[s] || s
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

type Props = {
  refreshKey?: number
}

function parseFilterStatus(v: unknown): BlogPostStatus | '' {
  if (v === 'DRAFT' || v === 'PUBLISHED' || v === 'ARCHIVED') return v
  return ''
}

function looksLikeImageUrl(s: string): boolean {
  const t = s.trim().toLowerCase()
  return (
    t.startsWith('https://') ||
    t.startsWith('http://') ||
    t.startsWith('/') ||
    t.startsWith('data:image/')
  )
}

export default function AdminBlogPostsSection({ refreshKey }: Props) {
  const sessionDefaults = useMemo(
    () => ({
      page: 0,
      size: 10,
      sortBy: 'updatedAt',
      sortDir: 'desc' as 'asc' | 'desc',
      keyword: '',
      statusFilter: '' as BlogPostStatus | '',
    }),
    [],
  )

  const [session, setSession] = useState(() =>
    readAdminSession(ADMIN_SESSION_KEYS.blogPosts, sessionDefaults),
  )

  const page = Number(session.page) || 0
  const size = clampAdminPageSize(session.size)
  const sortBy =
    SORT_OPTIONS.some((o) => o.value === session.sortBy) ? session.sortBy : 'updatedAt'
  const sortDir = session.sortDir === 'asc' ? 'asc' : 'desc'
  const keyword = typeof session.keyword === 'string' ? session.keyword : ''
  const statusFilter = parseFilterStatus(session.statusFilter)

  const [rows, setRows] = useState<BlogPostAdminDto[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** Remount TipTap khi mở form mới / bài khác để đồng bộ HTML đầu vào. */
  const [rteKey, setRteKey] = useState(0)
  const [studioTab, setStudioTab] = useState<'compose' | 'preview'>('compose')

  const persistSession = useCallback(
    (patch: Partial<typeof sessionDefaults>) => {
      setSession((prev) => {
        const next = { ...prev, ...patch }
        writeAdminSession(ADMIN_SESSION_KEYS.blogPosts, next as Record<string, unknown>)
        return next
      })
    },
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminBlogPostsPage({
        page,
        size,
        sortBy,
        sortDir,
        keyword,
        status: statusFilter,
      })
      setRows(res.content)
      setTotalPages(res.totalPages)
    } catch (e) {
      setRows([])
      setTotalPages(0)
      setToast(e instanceof Error ? e.message : 'Không tải được danh sách blog.')
    } finally {
      setLoading(false)
    }
  }, [keyword, page, size, sortBy, sortDir, statusFilter])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setModal('create')
    setStudioTab('compose')
    setRteKey((k) => k + 1)
  }

  async function openEdit(id: number) {
    setSaving(false)
    try {
      const p = await fetchAdminBlogPostById(id)
      setEditingId(id)
      setForm(postToForm(p))
      setModal('edit')
      setStudioTab('compose')
      setRteKey((k) => k + 1)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Không mở được bài viết.')
    }
  }

  function closeModal() {
    if (saving) return
    setModal(null)
    setEditingId(null)
  }

  useEscapeToClose(modal !== null, closeModal, !saving)

  async function submitModal() {
    setSaving(true)
    try {
      const payload: BlogPostUpsertPayload = {
        title: form.title.trim(),
        content: form.content,
        excerpt: form.excerpt.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        status: form.status,
      }
      const slugTrim = form.slug.trim()
      if (slugTrim) payload.slug = slugTrim

      if (modal === 'create') {
        await createAdminBlogPost(payload)
        setToast('Đã tạo bài viết.')
      } else if (modal === 'edit' && editingId != null) {
        await updateAdminBlogPost(editingId, payload)
        setToast('Đã cập nhật bài viết.')
      }
      closeModal()
      void load()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function onPublish(id: number) {
    try {
      await publishAdminBlogPost(id)
      setToast('Đã xuất bản.')
      void load()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Xuất bản thất bại.')
    }
  }

  async function confirmDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await deleteAdminBlogPost(deleteId)
      setToast('Đã lưu trữ bài viết.')
      setDeleteId(null)
      void load()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Thao tác thất bại.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="adm-veh adm-blog-hub">
      <div className="adm-veh__toolbar adm-blog-hub__toolbar">
        <div className="adm-veh__filters">
          <label className="adm-veh__field">
            <span>Tìm kiếm</span>
            <input
              type="search"
              value={keyword}
              placeholder="Tiêu đề hoặc slug…"
              onChange={(e) => persistSession({ keyword: e.target.value, page: 0 })}
            />
          </label>
          <label className="adm-veh__field">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                persistSession({
                  statusFilter: e.target.value as BlogPostStatus | '',
                  page: 0,
                })
              }
            >
              {STATUSES.map((s) => (
                <option key={s.label + String(s.value)} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-veh__field">
            <span>Sắp xếp</span>
            <select
              value={sortBy}
              onChange={(e) => persistSession({ sortBy: e.target.value, page: 0 })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-veh__field">
            <span>Chiều</span>
            <select
              value={sortDir}
              onChange={(e) =>
                persistSession({ sortDir: e.target.value === 'asc' ? 'asc' : 'desc', page: 0 })
              }
            >
              <option value="desc">Mới nhất</option>
              <option value="asc">Cũ nhất</option>
            </select>
          </label>
          <label className="adm-veh__field">
            <span>/ trang</span>
            <select
              value={String(size)}
              onChange={(e) =>
                persistSession({ size: clampAdminPageSize(e.target.value), page: 0 })
              }
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="adm-veh__primary" onClick={openCreate}>
          + Bài mới
        </button>
      </div>

      {toast && !modal && deleteId == null ? (
        <div className="adm-veh__toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="adm-blog-hub__table-card">
      <div className="adm-veh__table-wrap">
        <table className="adm-veh__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tiêu đề</th>
              <th>Slug</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '18px 12px', color: '#64748b' }}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="adm-blog-hub__empty">Chưa có bài viết nào — bấm &quot;+ Bài mới&quot; để soạn.</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <strong>{r.title}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.85em' }}>{r.slug}</code>
                  </td>
                  <td>
                    <span className="adm-veh__pill">{statusLabel(r.status)}</span>
                  </td>
                  <td>{fmtShort(r.updatedAt)}</td>
                  <td className="adm-veh__actions">
                    <button type="button" className="adm-veh__linkish" onClick={() => void openEdit(r.id)}>
                      Sửa
                    </button>
                    {r.status !== 'PUBLISHED' ? (
                      <button
                        type="button"
                        className="adm-veh__linkish"
                        onClick={() => void onPublish(r.id)}
                      >
                        Xuất bản
                      </button>
                    ) : null}
                    <button type="button" className="adm-veh__danger" onClick={() => setDeleteId(r.id)}>
                      Lưu trữ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {!loading && totalPages > 1 ? (
        <div className="adm-veh__pager">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => persistSession({ page: Math.max(0, page - 1) })}
          >
            ←
          </button>
          <span>
            Trang {page + 1}/{Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => persistSession({ page: page + 1 })}
          >
            →
          </button>
        </div>
      ) : null}

      {modal ? (
        <div
          className="adm-blog-studio__overlay"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="adm-blog-studio__shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-blog-studio-title"
          >
            <header className="adm-blog-studio__topbar">
              <div className="adm-blog-studio__topbar-left">
                <p className="adm-blog-studio__topbar-kicker">Studio nội dung</p>
                <h2 id="adm-blog-studio-title" className="adm-blog-studio__topbar-title">
                  {modal === 'create' ? 'Bài viết mới' : 'Chỉnh sửa bài viết'}
                </h2>
                {modal === 'edit' && editingId != null ? (
                  <span className="adm-blog-studio__badge">ID #{editingId}</span>
                ) : (
                  <span className="adm-blog-studio__badge">Soạn → xem trước → lưu</span>
                )}
              </div>
              <div className="adm-blog-studio__topbar-actions">
                <span className="adm-blog-studio__hint">Esc để đóng</span>
                <button type="button" className="adm-blog-studio__close" onClick={closeModal} aria-label="Đóng">
                  ×
                </button>
              </div>
            </header>

            <div className="adm-blog-studio__body">
              <aside className="adm-blog-studio__meta" aria-label="Thông tin bài viết">
                <p className="adm-blog-studio__meta-head">Meta &amp; xuất bản</p>

                <div className="adm-blog-studio__field">
                  <label>
                    <span>Tiêu đề *</span>
                    <input
                      value={form.title}
                      placeholder="Tiêu đề hiển thị trên blog"
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="adm-blog-studio__field">
                  <label>
                    <span>Slug</span>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      placeholder="Để trống → tự sinh từ tiêu đề"
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="adm-blog-studio__field">
                  <label>
                    <span>Mô tả ngắn</span>
                    <textarea
                      value={form.excerpt}
                      onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                      placeholder="Hiển thị trên thẻ bài và SEO ngắn"
                      rows={3}
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="adm-blog-studio__field">
                  <label>
                    <span>Ảnh bìa (URL)</span>
                    <input
                      value={form.coverImageUrl}
                      onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                      placeholder="https://…"
                      disabled={saving}
                    />
                  </label>
                  {looksLikeImageUrl(form.coverImageUrl) ? (
                    <div className="adm-blog-studio__cover-preview">
                      <img src={form.coverImageUrl.trim()} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                  ) : (
                    <div className="adm-blog-studio__cover-preview adm-blog-studio__cover-preview--empty">
                      Xem trước ảnh bìa khi có URL hợp lệ
                    </div>
                  )}
                </div>

                <div className="adm-blog-studio__field">
                  <span>Trạng thái</span>
                  <div className="adm-blog-studio__segment" role="group" aria-label="Trạng thái bài viết">
                    {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        data-status={st}
                        className={form.status === st ? 'is-active' : ''}
                        disabled={saving}
                        onClick={() => setForm((f) => ({ ...f, status: st }))}
                      >
                        {st === 'DRAFT' ? 'Nháp' : st === 'PUBLISHED' ? 'Xuất bản' : 'Lưu trữ'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="adm-blog-studio__meta-footnote">
                  Nội dung lưu dạng HTML. Tab <strong>Xem trước</strong> mô phỏng trang public; sau khi lưu có thể
                  xuất bản nhanh từ danh sách.
                </p>
              </aside>

              <section className="adm-blog-studio__canvas" aria-label="Soạn và xem trước">
                <div className="adm-blog-studio__canvas-bar">
                  <div
                    className="adm-blog-studio__tabs"
                    role="tablist"
                    aria-label="Chế độ vùng soạn"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioTab === 'compose'}
                      className={studioTab === 'compose' ? 'is-active' : ''}
                      onClick={() => setStudioTab('compose')}
                    >
                      Soạn thảo
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioTab === 'preview'}
                      className={studioTab === 'preview' ? 'is-active' : ''}
                      onClick={() => setStudioTab('preview')}
                    >
                      Xem trước
                    </button>
                  </div>
                  <span className="adm-blog-studio__canvas-label">
                    {studioTab === 'compose' ? 'Rich text · TipTap' : 'Giống layout đọc bài'}
                  </span>
                </div>

                {studioTab === 'compose' ? (
                  <div className="adm-blog-studio__rte-host">
                    <AdminBlogRichTextEditor
                      key={rteKey}
                      value={form.content}
                      disabled={saving}
                      placeholder="Viết nội dung chính: tiêu đề phụ, list, trích dẫn, link…"
                      onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                    />
                  </div>
                ) : (
                  <div className="adm-blog-studio__preview">
                    <div className="adm-blog-studio__preview-inner">
                      <h3 className="adm-blog-studio__preview-title">
                        {form.title.trim() || 'Chưa có tiêu đề'}
                      </h3>
                      {form.excerpt.trim() ? (
                        <p className="adm-blog-studio__preview-excerpt">{form.excerpt.trim()}</p>
                      ) : null}
                      {looksLikeImageUrl(form.coverImageUrl) ? (
                        <div className="adm-blog-studio__preview-cover">
                          <img src={form.coverImageUrl.trim()} alt="" />
                        </div>
                      ) : null}
                      {form.content.replace(/<[^>]+>/g, '').trim() === '' ? (
                        <p className="adm-blog-studio__preview-empty">Chưa có nội dung — quay lại tab Soạn thảo.</p>
                      ) : (
                        <div
                          className="adm-blog-studio__preview-body"
                          dangerouslySetInnerHTML={{ __html: form.content }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <footer className="adm-blog-studio__footer">
              <button type="button" className="adm-veh__ghost" onClick={closeModal} disabled={saving}>
                Huỷ
              </button>
              <button type="button" className="adm-veh__primary" onClick={() => void submitModal()} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu bài'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {deleteId != null ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && !deleting && setDeleteId(null)}
        >
          <div className="adm-veh__modal" role="dialog" aria-modal="true">
            <div className="adm-veh__modal-head">
              <h3>Lưu trữ bài #{deleteId}?</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                onClick={() => !deleting && setDeleteId(null)}
              >
                ×
              </button>
            </div>
            <div className="adm-veh__modal-body">
              <p style={{ marginTop: 0 }}>
                Bài sẽ chuyển sang ARCHIVED và không còn hiển thị trên blog public.
              </p>
            </div>
            <div className="adm-veh__modal-foot">
              <button
                type="button"
                className="adm-veh__ghost"
                disabled={deleting}
                onClick={() => setDeleteId(null)}
              >
                Huỷ
              </button>
              <button type="button" className="adm-veh__danger" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? 'Đang xử lý…' : 'Lưu trữ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
