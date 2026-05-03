import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminBookingFeedbacksPage,
  type AdminBookingFeedbackRowDto,
  type PagedAdminBookingFeedbackDto,
} from '../api/adminBookingFeedback'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import './AdminVehiclesSection.css'

type Props = { refreshKey?: number }

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function truncate(s: string | null | undefined, max: number): string {
  const t = (s ?? '').trim()
  if (!t) return '—'
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export default function AdminBookingFeedbacksSection({ refreshKey = 0 }: Props) {
  const [page, setPage] = useState(0)
  const [size] = useState(15)
  const [data, setData] = useState<PagedAdminBookingFeedbackDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminBookingFeedbackRowDto | null>(null)

  useEscapeToClose(detail != null, () => setDetail(null))

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchAdminBookingFeedbacksPage({ page, size })
      setData(res)
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(Math.max(0, res.totalPages - 1))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được đánh giá.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, size])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const rows = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  return (
    <div className="adm-veh">
      <div className="adm-veh__toolbar">
        <div>
          <h2>Đánh giá sau thuê xe</h2>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#555' }}>
            Phản hồi của khách sau booking hoàn tất — điểm sao, nhận xét và ảnh đính kèm.
          </p>
        </div>
      </div>

      {error ? (
        <div className="adm-veh__msg adm-veh__msg--err" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p style={{ margin: 12 }}>Đang tải…</p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 12, color: '#666' }}>Chưa có đánh giá nào.</p>
      ) : (
        <>
          <div className="adm-veh__scroll">
            <table className="adm-veh__table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Xe</th>
                  <th>Sao</th>
                  <th>Nội dung</th>
                  <th>Ảnh</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatWhen(r.createdAt)}</td>
                    <td>
                      <strong>{r.bookingCode ?? `#${r.bookingId ?? '—'}`}</strong>
                    </td>
                    <td>
                      <div>{r.renterDisplayName ?? '—'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.renterEmail ?? ''}</div>
                    </td>
                    <td>{r.vehicleName ?? `#${r.vehicleId ?? '—'}`}</td>
                    <td>
                      <strong style={{ color: '#ea580c' }}>{r.vehicleRating ?? '—'}</strong>
                    </td>
                    <td title={r.comment ?? ''}>{truncate(r.comment, 72)}</td>
                    <td>{r.photoUrls?.length ? `${r.photoUrls.length}` : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-veh__btn adm-veh__btn--ghost"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => setDetail(r)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 16,
            }}
          >
            <span style={{ fontSize: 13, color: '#555' }}>
              {totalElements} đánh giá — Trang {page + 1}/{Math.max(1, totalPages)}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="adm-veh__btn adm-veh__btn--ghost"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Trước
              </button>
              <button
                type="button"
                className="adm-veh__btn adm-veh__btn--ghost"
                disabled={totalPages <= 0 || page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}

      {detail ? (
        <div
          className="adm-backdrop is-open"
          style={{ position: 'fixed', inset: 0, zIndex: 1300 }}
          role="presentation"
          onMouseDown={(ev) => ev.target === ev.currentTarget && setDetail(null)}
        >
          <div
            className="adm-veh"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(520px, calc(100vw - 32px))',
              maxHeight: 'min(85vh, 640px)',
              overflow: 'auto',
              zIndex: 1301,
              margin: 0,
            }}
            role="dialog"
            aria-labelledby="abf-detail-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h2 id="abf-detail-title" style={{ margin: 0, fontSize: 18 }}>
                Chi tiết đánh giá
              </h2>
              <button type="button" className="adm-veh__btn adm-veh__btn--ghost" onClick={() => setDetail(null)}>
                Đóng
              </button>
            </div>
            <dl style={{ margin: '16px 0 0', fontSize: 14, display: 'grid', gap: 10 }}>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Thời gian</dt>
                <dd style={{ margin: '4px 0 0' }}>{formatWhen(detail.createdAt)}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Đơn</dt>
                <dd style={{ margin: '4px 0 0' }}>
                  {detail.bookingCode ?? '—'} (ID {detail.bookingId ?? '—'})
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Khách</dt>
                <dd style={{ margin: '4px 0 0' }}>
                  {detail.renterDisplayName ?? '—'}
                  {detail.renterEmail ? (
                    <>
                      <br />
                      <span style={{ color: '#64748b' }}>{detail.renterEmail}</span>
                    </>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Xe</dt>
                <dd style={{ margin: '4px 0 0' }}>
                  {detail.vehicleName ?? '—'} (ID {detail.vehicleId ?? '—'})
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Điểm xe</dt>
                <dd style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#ea580c' }}>
                  {detail.vehicleRating ?? '—'} / 5
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: '#64748b' }}>Nhận xét</dt>
                <dd style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{detail.comment?.trim() || '—'}</dd>
              </div>
              {detail.photoUrls?.length ? (
                <div>
                  <dt style={{ fontWeight: 700, color: '#64748b' }}>Ảnh</dt>
                  <dd style={{ margin: '8px 0 0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {detail.photoUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt=""
                            style={{
                              width: 96,
                              height: 96,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
