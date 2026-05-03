import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopNav from '../components/TopNav'
import { fetchPublishedBlogPostBySlug, type BlogPostPublicDto } from '../api/blogPosts'
import './CarRentalPage.css'
import './BlogPage.css'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPostPage() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = slugParam ? decodeURIComponent(slugParam) : ''

  const [post, setPost] = useState<BlogPostPublicDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!slug) {
      setPost(null)
      setError('Thiếu đường dẫn bài viết.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const p = await fetchPublishedBlogPostBySlug(slug)
      setPost(p)
    } catch (e) {
      setPost(null)
      setError(e instanceof Error ? e.message : 'Không tải được bài viết.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="cr-page blog-page">
      <TopNav solid showSearch={false} />

      <main className="blog-main blog-main--article">
        <p className="blog-back">
          <Link to="/blog">← Danh sách blog</Link>
        </p>

        {loading ? (
          <p className="blog-muted">Đang tải…</p>
        ) : error ? (
          <div className="blog-banner blog-banner--error" role="alert">
            {error}
          </div>
        ) : post ? (
          <article className="blog-article">
            <header className="blog-article__head">
              <time className="blog-article__date" dateTime={post.publishedAt ?? undefined}>
                {fmtDate(post.publishedAt)}
              </time>
              <h1 className="blog-article__title">{post.title}</h1>
              {post.excerpt ? <p className="blog-article__excerpt">{post.excerpt}</p> : null}
            </header>

            {post.coverImageUrl ? (
              <div className="blog-article__cover">
                <img src={post.coverImageUrl} alt="" loading="lazy" />
              </div>
            ) : null}

            <div
              className="blog-article__content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        ) : null}
      </main>
    </div>
  )
}
