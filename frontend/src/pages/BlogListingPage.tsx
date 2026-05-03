import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopNav from '../components/TopNav'
import {
  fetchPublishedBlogPostsPage,
  type BlogPostPublicDto,
  type PagedBlogPostsPublic,
} from '../api/blogPosts'
import './CarRentalPage.css'
import './BlogPage.css'

const PAGE_SIZE = 9

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function BlogListingPage() {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PagedBlogPostsPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPublishedBlogPostsPage({
        page,
        size: PAGE_SIZE,
        sortBy: 'publishedAt',
        sortDir: 'desc',
      })
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Không tải được blog.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const posts = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="cr-page blog-page">
      <TopNav solid showSearch={false} />

      <main className="blog-main">
        <header className="blog-hero">
          <p className="blog-hero__eyebrow">Blog</p>
          <h1 className="blog-hero__title">Gợi ý thuê xe &amp; đồ án</h1>
          <p className="blog-hero__sub">
            Bài viết được quản trị viên xuất bản — chỉ hiển thị nội dung public.
          </p>
        </header>

        {error ? (
          <div className="blog-banner blog-banner--error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="blog-muted">Đang tải bài viết…</p>
        ) : posts.length === 0 ? (
          <p className="blog-muted">Chưa có bài viết đã xuất bản.</p>
        ) : (
          <ul className="blog-grid" role="list">
            {posts.map((p: BlogPostPublicDto) => (
              <li key={p.id}>
                <article className="blog-card">
                  <Link className="blog-card__link" to={`/blog/${encodeURIComponent(p.slug)}`}>
                    <div className="blog-card__media">
                      {p.coverImageUrl ? (
                        <img src={p.coverImageUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="blog-card__placeholder" aria-hidden />
                      )}
                    </div>
                    <div className="blog-card__body">
                      <time className="blog-card__date" dateTime={p.publishedAt ?? undefined}>
                        {fmtDate(p.publishedAt)}
                      </time>
                      <h2 className="blog-card__title">{p.title}</h2>
                      {p.excerpt ? <p className="blog-card__excerpt">{p.excerpt}</p> : null}
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}

        {!loading && totalPages > 1 ? (
          <nav className="blog-pagination" aria-label="Phân trang blog">
            <button
              type="button"
              className="blog-page-btn"
              disabled={page <= 0}
              onClick={() => setPage((x) => Math.max(0, x - 1))}
            >
              ← Trước
            </button>
            <span className="blog-pagination__meta">
              Trang {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="blog-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((x) => x + 1)}
            >
              Sau →
            </button>
          </nav>
        ) : null}
      </main>
    </div>
  )
}
