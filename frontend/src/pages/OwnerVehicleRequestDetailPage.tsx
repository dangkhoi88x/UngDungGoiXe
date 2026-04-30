import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchMyOwnerVehicleRequestById,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestHistoryItemDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'
import TopNav from '../components/TopNav'
import './OwnerRegisterVehiclePage.css'
import './OwnerVehicleRequestDetailPage.css'

function statusLabel(s: OwnerVehicleRequestStatus | null | undefined): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    NEED_MORE_INFO: 'Cần bổ sung',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
  }
  if (!s) return '—'
  return map[s] ?? s
}

function eventLabel(eventType?: string | null): string {
  const map: Record<string, string> = {
    SUBMITTED: 'Gửi yêu cầu',
    UPDATED_BY_OWNER: 'Owner cập nhật hồ sơ',
    RESUBMITTED: 'Owner gửi lại',
    APPROVED_BY_ADMIN: 'Admin duyệt',
    REJECTED_BY_ADMIN: 'Admin từ chối',
    NEED_MORE_INFO_BY_ADMIN: 'Admin yêu cầu bổ sung',
  }
  if (!eventType) return 'Cập nhật'
  return map[eventType] ?? eventType
}

function actorLabel(actorRole?: string | null): string {
  if (!actorRole) return 'Hệ thống'
  if (actorRole === 'ADMIN') return 'Admin'
  if (actorRole === 'OWNER') return 'Owner'
  return actorRole
}

function toDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function toDateOnly(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toTimeOnly(value?: string | null): string {
  if (!value) return '--:--'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return '--:--'
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function timelineIcon(eventType?: string | null, status?: string | null): string {
  const st = String(status || '').toUpperCase()
  const evt = String(eventType || '').toUpperCase()
  if (st === 'APPROVED') return '✓'
  if (st === 'REJECTED' || st === 'CANCELLED') return '✕'
  if (st === 'NEED_MORE_INFO') return '!'
  if (evt === 'UPDATED_BY_OWNER' || evt === 'RESUBMITTED' || evt === 'SUBMITTED') return '🚗'
  return '•'
}

export default function OwnerVehicleRequestDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const requestId = Number(idParam)
  const navigate = useNavigate()

  const [item, setItem] = useState<OwnerVehicleRequestDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const load = useCallback(async () => {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      setError('ID yêu cầu không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const dto = await fetchMyOwnerVehicleRequestById(requestId)
      setItem(dto)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được chi tiết yêu cầu.')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void load()
  }, [load])

  const timeline = useMemo(() => {
    const raw: OwnerVehicleRequestHistoryItemDto[] = item?.history ?? []
    const sorted = [...raw].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    if (sorted.length > 0) return sorted
    if (!item) return []
    return [
      {
        eventType: 'SUBMITTED',
        status: item.status,
        actorRole: 'OWNER',
        note: item.adminNote ?? null,
        createdAt: item.createdAt,
      },
    ]
  }, [item])

  const adminNotes = useMemo(
    () =>
      timeline.filter(
        (x) => x.actorRole === 'ADMIN' && typeof x.note === 'string' && x.note.trim(),
      ),
    [timeline],
  )

  const timelineForDisplay = useMemo(() => [...timeline], [timeline])

  return (
    <div className="owreg owreg--clean">
      <TopNav solid showSearch={false} />
      <main className="owreg__main owreg__main--clean owrd-main">
        <h1 className="owreg__title">Chi tiết yêu cầu #{requestId}</h1>
        {loading ? <p className="owrd-muted">Đang tải dữ liệu…</p> : null}
        {error ? (
          <p className="owreg__err" role="alert">
            {error}
          </p>
        ) : null}

        {item ? (
          <>
            <section className="owreg__section">
              <h2 className="owreg__section-title">Tổng quan</h2>
              <div className="owrd-grid">
                <div>
                  <p className="owrd-kv">
                    <strong>Trạng thái:</strong> {statusLabel(item.status)}
                  </p>
                  <p className="owrd-kv">
                    <strong>Xe:</strong> {item.name || '—'} / {item.brand || '—'}
                  </p>
                  <p className="owrd-kv">
                    <strong>Biển số:</strong> {item.licensePlate || '—'}
                  </p>
                </div>
                <div>
                  <p className="owrd-kv">
                    <strong>Tạo lúc:</strong> {toDate(item.createdAt)}
                  </p>
                  <p className="owrd-kv">
                    <strong>Cập nhật:</strong> {toDate(item.updatedAt)}
                  </p>
                  <p className="owrd-kv">
                    <strong>Xe duyệt:</strong>{' '}
                    {item.approvedVehicleId != null ? `#${item.approvedVehicleId}` : '—'}
                  </p>
                </div>
              </div>
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Timeline xử lý</h2>
              {timelineForDisplay.length === 0 ? (
                <p className="owrd-muted">Chưa có mốc xử lý.</p>
              ) : (
                <ol className="owrd-track">
                  {timelineForDisplay.map((h, idx) => {
                    const active = idx === timelineForDisplay.length - 1
                    return (
                      <li
                        key={`${h.eventType ?? 'evt'}-${h.createdAt ?? idx}`}
                        className={`owrd-track-item${active ? ' is-active' : ''}`}
                      >
                        <div className="owrd-track-rail" aria-hidden="true">
                          <span className="owrd-track-dot">{timelineIcon(h.eventType, h.status)}</span>
                        </div>
                        <div className="owrd-track-body">
                          <div className="owrd-track-head">
                            <strong className="owrd-track-date">{toDateOnly(h.createdAt)}</strong>
                            <span className="owrd-track-time">{toTimeOnly(h.createdAt)}</span>
                          </div>
                          <p className={`owrd-track-message${active ? ' is-highlight' : ''}`}>
                            {eventLabel(h.eventType)} · {statusLabel(h.status)}
                          </p>
                          <p className="owrd-track-address">
                            {actorLabel(h.actorRole)} · Hồ sơ xe {item?.licensePlate || 'đang xử lý'}
                          </p>
                          {h.note?.trim() ? <p className="owrd-track-note">{h.note}</p> : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            <section className="owreg__section">
              <h2 className="owreg__section-title">Lịch sử note admin</h2>
              {adminNotes.length === 0 ? (
                <p className="owrd-muted">Chưa có note từ admin.</p>
              ) : (
                <ul className="owrd-notes">
                  {adminNotes.map((n, idx) => (
                    <li key={`${n.createdAt ?? 'note'}-${idx}`} className="owrd-note-item">
                      <p className="owrd-note-meta">
                        {eventLabel(n.eventType)} · {toDate(n.createdAt)}
                      </p>
                      <p className="owrd-note-text">{n.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

