import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import {
  ADMIN_SESSION_KEYS,
  readAdminSession,
  writeAdminSession,
} from '../lib/adminSessionStorage'
import {
  approveOwnerVehicleRequest,
  fetchAdminOwnerVehicleRequests,
  needMoreInfoOwnerVehicleRequest,
  rejectOwnerVehicleRequest,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'
import './AdminVehiclesSection.css'

const STATUSES: Array<OwnerVehicleRequestStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'NEED_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]

type Props = { refreshKey?: number }

type ReviewAction = 'approve' | 'reject' | 'need-more-info'

function statusLabel(s: OwnerVehicleRequestStatus | 'ALL'): string {
  const map: Record<string, string> = {
    ALL: 'Tất cả',
    PENDING: 'Chờ duyệt',
    NEED_MORE_INFO: 'Cần bổ sung',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
  }
  return map[s] ?? s
}

function canReview(item: OwnerVehicleRequestDto): boolean {
  return item.status === 'PENDING' || item.status === 'NEED_MORE_INFO'
}

function trimUrl(s?: string | null): string | null {
  const t = s?.trim()
  return t ? t : null
}

function docFlags(r: OwnerVehicleRequestDto) {
  const registration = trimUrl(r.registrationDocUrl)
  const insurance = trimUrl(r.insuranceDocUrl)
  return {
    registration,
    insurance,
    missingRegistration: !registration,
    missingInsurance: !insurance,
    missingAny: !registration || !insurance,
  }
}

function guessDocKind(url: string): 'image' | 'pdf' | 'unknown' {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined)
    const path = u.pathname.toLowerCase()
    if (path.endsWith('.pdf')) return 'pdf'
    if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path)) return 'image'
  } catch {
    const low = url.toLowerCase()
    if (low.includes('.pdf')) return 'pdf'
    if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(low)) return 'image'
  }
  return 'unknown'
}

type DocPreviewState = {
  url: string
  title: string
  kind: 'image' | 'pdf' | 'unknown'
}

type VehiclePhotosPreviewState = {
  requestId: number
  urls: string[]
}

function photoUrlsForRequest(r: OwnerVehicleRequestDto): string[] {
  if (!Array.isArray(r.photos)) return []
  return r.photos
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
}

function toDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleString('vi-VN')
}

function initialFilters() {
  const raw = readAdminSession(ADMIN_SESSION_KEYS.ownerVehicleRequests, {
    keyword: '',
    status: 'PENDING',
  })
  const status = STATUSES.includes(
    raw.status as OwnerVehicleRequestStatus | 'ALL',
  )
    ? (raw.status as OwnerVehicleRequestStatus | 'ALL')
    : 'PENDING'
  return {
    keyword: typeof raw.keyword === 'string' ? raw.keyword : '',
    status,
  }
}

export default function AdminOwnerVehicleRequestsSection({ refreshKey = 0 }: Props) {
  const init = useMemo(() => initialFilters(), [])
  const [keyword, setKeyword] = useState(init.keyword)
  const [status, setStatus] = useState<OwnerVehicleRequestStatus | 'ALL'>(init.status)
  const [items, setItems] = useState<OwnerVehicleRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [reviewTarget, setReviewTarget] = useState<OwnerVehicleRequestDto | null>(null)
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approve')
  const [adminNote, setAdminNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const [docPreview, setDocPreview] = useState<DocPreviewState | null>(null)
  const [docImageBroken, setDocImageBroken] = useState(false)
  const [vehiclePhotosPreview, setVehiclePhotosPreview] =
    useState<VehiclePhotosPreviewState | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchAdminOwnerVehicleRequests({ status })
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được yêu cầu owner.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    writeAdminSession(ADMIN_SESSION_KEYS.ownerVehicleRequests, { keyword, status })
  }, [keyword, status])

  useEffect(() => {
    setDocImageBroken(false)
  }, [docPreview?.url])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return items
    return items.filter((x) => {
      const blob = [
        String(x.id),
        String(x.ownerId),
        x.licensePlate ?? '',
        x.name ?? '',
        x.brand ?? '',
        x.address ?? '',
        x.status,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [items, keyword])

  const reviewPhotoUrls = useMemo(
    () => (reviewTarget ? photoUrlsForRequest(reviewTarget) : []),
    [reviewTarget],
  )

  const openReview = (item: OwnerVehicleRequestDto, action: ReviewAction) => {
    setDocPreview(null)
    setVehiclePhotosPreview(null)
    setToast(null)
    setReviewTarget(item)
    setReviewAction(action)
    setAdminNote(item.adminNote ?? '')
  }

  const closeReview = () => {
    if (reviewing) return
    setReviewTarget(null)
    setVehiclePhotosPreview(null)
    setAdminNote('')
    setReviewAction('approve')
  }

  const closeVehiclePhotosPreview = () => {
    setVehiclePhotosPreview(null)
  }

  const openDocPreview = (url: string, title: string) => {
    setDocImageBroken(false)
    setDocPreview({ url, title, kind: guessDocKind(url) })
  }

  const closeDocPreview = () => {
    setDocPreview(null)
    setDocImageBroken(false)
  }

  useEscapeToClose(docPreview != null, closeDocPreview, true)
  useEscapeToClose(
    vehiclePhotosPreview != null && docPreview == null,
    closeVehiclePhotosPreview,
    true,
  )
  useEscapeToClose(
    reviewTarget != null && docPreview == null && vehiclePhotosPreview == null,
    closeReview,
    !reviewing,
  )

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewTarget) return
    setReviewing(true)
    setToast(null)
    try {
      const payload = { adminNote: adminNote.trim() || null }
      if (reviewAction === 'approve') {
        await approveOwnerVehicleRequest(reviewTarget.id, payload)
        setToast(`Đã duyệt request #${reviewTarget.id}.`)
      } else if (reviewAction === 'reject') {
        await rejectOwnerVehicleRequest(reviewTarget.id, payload)
        setToast(`Đã từ chối request #${reviewTarget.id}.`)
      } else {
        await needMoreInfoOwnerVehicleRequest(reviewTarget.id, payload)
        setToast(`Đã chuyển request #${reviewTarget.id} sang trạng thái cần bổ sung.`)
      }
      closeReview()
      await load()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Thao tác thất bại.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <section className="adm-veh adm-users-section" aria-labelledby="adm-owner-req-title">
      <div className="adm-veh__toolbar">
        <h2 id="adm-owner-req-title">Yêu cầu xe owner</h2>
        <div className="adm-veh__actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            Tải lại
          </button>
        </div>
      </div>

      <div className="adm-users__filters" aria-label="Bộ lọc yêu cầu xe owner">
        <div className="adm-users__search-field">
          <label className="adm-users__filter-label" htmlFor="owner-req-keyword">
            Từ khóa
          </label>
          <input
            id="owner-req-keyword"
            type="search"
            className="adm-users__search-input"
            placeholder="ID, owner, biển số, tên xe, hãng..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="adm-users__filter-label" htmlFor="owner-req-status">
            Trạng thái
          </label>
          <select
            id="owner-req-status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as OwnerVehicleRequestStatus | 'ALL')
            }
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {statusLabel(st)}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-users__filters-actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => {
              setKeyword('')
              setStatus('PENDING')
            }}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {error ? (
        <p className="adm-veh__msg adm-veh__msg--err" role="alert">
          {error}
        </p>
      ) : null}
      {toast && !reviewTarget ? (
        <p className="adm-veh__msg adm-veh__msg--ok" role="status">
          {toast}
        </p>
      ) : null}

      {loading ? <div className="adm-veh__loading">Đang tải yêu cầu owner…</div> : null}
      {!loading && filtered.length === 0 ? (
        <p className="adm-veh__empty">Không có yêu cầu nào khớp bộ lọc.</p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="adm-veh__scroll">
          <table className="adm-veh__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Owner</th>
                <th>Biển số</th>
                <th>Tên/Hãng</th>
                <th>Giấy tờ</th>
                <th>Trạm</th>
                <th>Trạng thái</th>
                <th>Duyệt xe</th>
                <th>Tạo lúc</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const docs = docFlags(r)
                return (
                <tr
                  key={r.id}
                  className={docs.missingAny ? 'adm-veh__tr--doc-warn' : undefined}
                >
                  <td className="adm-veh__mono">#{r.id}</td>
                  <td className="adm-veh__mono">#{r.ownerId}</td>
                  <td className="adm-veh__mono">{r.licensePlate || '—'}</td>
                  <td>
                    <strong>{r.name || '—'}</strong>
                    <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>{r.brand || '—'}</div>
                  </td>
                  <td className="adm-veh__doc-cell">
                    <div className="adm-veh__doc-btns" role="group" aria-label="Giấy tờ xe">
                      {docs.registration ? (
                        <button
                          type="button"
                          className="adm-veh__doc-preview-btn"
                          onClick={() =>
                            openDocPreview(docs.registration!, 'Giấy đăng ký / đăng kiểm')
                          }
                        >
                          Xem ĐK
                        </button>
                      ) : (
                        <span className="adm-veh__doc-missing" title="Chưa có URL giấy đăng ký">
                          Thiếu ĐK
                        </span>
                      )}
                      {docs.insurance ? (
                        <button
                          type="button"
                          className="adm-veh__doc-preview-btn"
                          onClick={() =>
                            openDocPreview(docs.insurance!, 'Giấy bảo hiểm')
                          }
                        >
                          Xem BH
                        </button>
                      ) : (
                        <span className="adm-veh__doc-missing" title="Chưa có URL giấy bảo hiểm">
                          Thiếu BH
                        </span>
                      )}
                    </div>
                    {docs.missingAny ? (
                      <p className="adm-veh__doc-row-warn" role="status">
                        {docs.missingRegistration && docs.missingInsurance
                          ? 'Thiếu cả hai giấy tờ — cần owner bổ sung trước khi duyệt.'
                          : docs.missingRegistration
                            ? 'Thiếu giấy đăng ký.'
                            : 'Thiếu giấy bảo hiểm.'}
                      </p>
                    ) : null}
                  </td>
                  <td className="adm-veh__mono">#{r.stationId}</td>
                  <td>
                    <span className="adm-veh__pill">{statusLabel(r.status)}</span>
                  </td>
                  <td className="adm-veh__mono">
                    {r.approvedVehicleId != null ? `#${r.approvedVehicleId}` : '—'}
                  </td>
                  <td>{toDate(r.createdAt)}</td>
                  <td>
                    <div className="adm-veh__row-actions">
                      <button
                        type="button"
                        className="adm-veh__link-btn"
                        onClick={() => openReview(r, 'approve')}
                        disabled={!canReview(r)}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="adm-veh__link-btn"
                        onClick={() => openReview(r, 'need-more-info')}
                        disabled={!canReview(r)}
                      >
                        Bổ sung
                      </button>
                      <button
                        type="button"
                        className="adm-veh__link-btn adm-veh__link-btn--danger"
                        onClick={() => openReview(r, 'reject')}
                        disabled={!canReview(r)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {docPreview ? (
        <div
          className="adm-veh__overlay adm-veh__overlay--doc-preview"
          role="presentation"
          onClick={(ev) => ev.target === ev.currentTarget && closeDocPreview()}
        >
          <div
            className="adm-veh__modal adm-veh__modal--doc-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-req-doc-preview-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="owner-req-doc-preview-title">{docPreview.title}</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng xem giấy tờ"
                onClick={closeDocPreview}
              >
                ×
              </button>
            </div>
            <div className="adm-veh__doc-preview-body">
              <p className="adm-veh__doc-preview-meta">
                <a
                  href={docPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adm-veh__doc-preview-open"
                >
                  Mở trong tab mới
                </a>
              </p>
              {docPreview.kind === 'image' ? (
                docImageBroken ? (
                  <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                    Không tải được ảnh. Dùng liên kết “Mở trong tab mới” để kiểm tra URL hoặc quyền
                    truy cập.
                  </p>
                ) : (
                  <img
                    className="adm-veh__doc-preview-img"
                    src={docPreview.url}
                    alt={docPreview.title}
                    onError={() => setDocImageBroken(true)}
                  />
                )
              ) : docPreview.kind === 'pdf' ? (
                <>
                  <iframe
                    className="adm-veh__doc-preview-frame"
                    title={docPreview.title}
                    src={docPreview.url}
                  />
                  <p className="adm-veh__doc-preview-hint" role="note">
                    Nếu khung trống, máy chủ lưu file có thể chặn nhúng (X-Frame-Options). Hãy mở
                    tab mới.
                  </p>
                </>
              ) : (
                <>
                  <p className="adm-veh__doc-preview-hint">
                    Không nhận dạng được định dạng từ URL. Bạn có thể thử xem trực tiếp trong tab
                    mới (ảnh, PDF hoặc trang tải xuống).
                  </p>
                  <iframe
                    className="adm-veh__doc-preview-frame"
                    title={docPreview.title}
                    src={docPreview.url}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {vehiclePhotosPreview ? (
        <div
          className="adm-veh__overlay adm-veh__overlay--vehicle-photos"
          role="presentation"
          onClick={(ev) =>
            ev.target === ev.currentTarget && closeVehiclePhotosPreview()
          }
        >
          <div
            className="adm-veh__modal adm-veh__modal--doc-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-req-vehicle-photos-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="owner-req-vehicle-photos-title">
                Ảnh xe — request #{vehiclePhotosPreview.requestId}
              </h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng xem ảnh xe"
                onClick={closeVehiclePhotosPreview}
              >
                ×
              </button>
            </div>
            <div className="adm-veh__vehicle-photos-body">
              <p className="adm-veh__doc-preview-hint">
                Bấm ảnh để mở URL gốc trong tab mới (phóng to / tải về tùy máy chủ).
              </p>
              <div className="adm-veh__vehicle-photos-grid">
                {vehiclePhotosPreview.urls.map((url, i) => (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-veh__vehicle-photo-card"
                    title={`Ảnh ${i + 1} — mở tab mới`}
                  >
                    <img
                      src={url}
                      alt={`Ảnh xe ${i + 1}`}
                      loading="lazy"
                      className="adm-veh__vehicle-photo-img"
                    />
                    <span className="adm-veh__vehicle-photo-label">Ảnh {i + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reviewTarget ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) => ev.target === ev.currentTarget && closeReview()}
        >
          <div
            className="adm-veh__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-req-review-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="owner-req-review-title">
                {reviewAction === 'approve'
                  ? `Duyệt request #${reviewTarget.id}`
                  : reviewAction === 'reject'
                    ? `Từ chối request #${reviewTarget.id}`
                    : `Yêu cầu bổ sung #${reviewTarget.id}`}
              </h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={closeReview}
              >
                ×
              </button>
            </div>

            <form className="adm-veh__form" onSubmit={submitReview}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <p style={{ marginTop: 0 }}>
                <strong>Xe:</strong> {reviewTarget.name || '—'} /{' '}
                {reviewTarget.licensePlate || '—'} · <strong>Owner:</strong> #
                {reviewTarget.ownerId}
              </p>
              <div className="adm-veh__review-photos-row">
                {reviewPhotoUrls.length > 0 ? (
                  <button
                    type="button"
                    className="adm-veh__btn adm-veh__btn--ghost adm-veh__btn--photos-quick"
                    onClick={() =>
                      setVehiclePhotosPreview({
                        requestId: reviewTarget.id,
                        urls: reviewPhotoUrls,
                      })
                    }
                    disabled={reviewing}
                  >
                    Xem nhanh ảnh xe ({reviewPhotoUrls.length})
                  </button>
                ) : (
                  <span className="adm-veh__review-photos-empty">Chưa có ảnh xe trong yêu cầu.</span>
                )}
              </div>
              <div className="adm-veh__field">
                <label htmlFor="owner-req-admin-note">Ghi chú admin (tùy chọn)</label>
                <textarea
                  id="owner-req-admin-note"
                  className="adm-veh__input"
                  rows={4}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ví dụ: cần bổ sung đăng ký xe mặt trước..."
                />
              </div>
              <div className="adm-veh__form-actions">
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--ghost"
                  onClick={closeReview}
                  disabled={reviewing}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={
                    reviewAction === 'reject'
                      ? 'adm-veh__btn adm-veh__btn--danger'
                      : 'adm-veh__btn adm-veh__btn--primary'
                  }
                  disabled={reviewing}
                >
                  {reviewing
                    ? 'Đang xử lý…'
                    : reviewAction === 'approve'
                      ? 'Xác nhận duyệt'
                      : reviewAction === 'reject'
                        ? 'Xác nhận từ chối'
                        : 'Gửi yêu cầu bổ sung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
