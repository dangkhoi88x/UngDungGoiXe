import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelOwnerVehicleRequest,
  fetchMyOwnerVehicleRequests,
  resubmitOwnerVehicleRequest,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'
import { useOwnerRequestStatusWatcher } from '../hooks/useOwnerRequestStatusWatcher'
import TopNav from '../components/TopNav'
import './OwnerRegisterVehiclePage.css'
import './OwnerMyVehicleRequestsPage.css'

function statusLabel(s: OwnerVehicleRequestStatus): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    NEED_MORE_INFO: 'Cần bổ sung',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
  }
  return map[s] ?? s
}

function statusClass(s: OwnerVehicleRequestStatus): string {
  if (s === 'PENDING') return 'owmr-pill owmr-pill--pending'
  if (s === 'NEED_MORE_INFO') return 'owmr-pill owmr-pill--need-info'
  if (s === 'APPROVED') return 'owmr-pill owmr-pill--approved'
  if (s === 'REJECTED') return 'owmr-pill owmr-pill--rejected'
  return 'owmr-pill owmr-pill--cancelled'
}

function toDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return value
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}

function canEdit(s: OwnerVehicleRequestStatus): boolean {
  return s === 'PENDING' || s === 'NEED_MORE_INFO'
}

function canResubmit(s: OwnerVehicleRequestStatus): boolean {
  return s === 'REJECTED' || s === 'NEED_MORE_INFO'
}

function canCancel(s: OwnerVehicleRequestStatus): boolean {
  return s === 'PENDING' || s === 'NEED_MORE_INFO' || s === 'REJECTED'
}

export default function OwnerMyVehicleRequestsPage() {
  type ToastState = { message: string; href?: string; linkLabel?: string } | null
  const navigate = useNavigate()
  const [items, setItems] = useState<OwnerVehicleRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<OwnerVehicleRequestStatus | 'ALL'>('ALL')
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST')

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const load = useCallback(async (opts?: { silent?: boolean; detectStatusChange?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const list = await fetchMyOwnerVehicleRequests()
      setItems(list)
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu.')
        setItems([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load({ detectStatusChange: false })
  }, [load])

  useOwnerRequestStatusWatcher({
    intervalMs: 45_000,
    onData: setItems,
    onStatusChanged: (changes) => {
      const first = changes[0]
      const extra = changes.length > 1 ? ` (+${changes.length - 1} yêu cầu)` : ''
      setToast({
        message: `Trạng thái yêu cầu vừa cập nhật #${first.id}: ${statusLabel(first.status)}${extra}.`,
        href: `/owner/vehicle-requests/${first.id}`,
        linkLabel: 'Xem yêu cầu',
      })
    },
  })

  const filteredAndSortedItems = useMemo(() => {
    const filtered =
      statusFilter === 'ALL' ? items : items.filter((item) => item.status === statusFilter)

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
      const safeA = Number.isFinite(aTime) ? aTime : 0
      const safeB = Number.isFinite(bTime) ? bTime : 0
      return sortOrder === 'NEWEST' ? safeB - safeA : safeA - safeB
    })
  }, [items, sortOrder, statusFilter])

  async function onResubmit(id: number) {
    setToast(null)
    setBusyId(id)
    try {
      await resubmitOwnerVehicleRequest(id)
      setToast({ message: `Đã gửi lại yêu cầu #${id}. Trạng thái: chờ duyệt.` })
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Gửi lại thất bại.' })
    } finally {
      setBusyId(null)
    }
  }

  async function onCancel(id: number) {
    setToast(null)
    setBusyId(id)
    try {
      await cancelOwnerVehicleRequest(id)
      setToast({ message: `Đã hủy yêu cầu #${id}. Hệ thống đã dọn file upload local.` })
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Hủy yêu cầu thất bại.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="owreg owreg--clean">
      <TopNav solid showSearch={false} />
      <main className="owreg__main owreg__main--clean owmr-main">
        <div className="owmr-head">
          <div>
            <h1 className="owreg__title owmr-title">Yêu cầu xe của tôi</h1>
            <p className="owreg__lead owmr-lead">
              Theo dõi trạng thái duyệt, chỉnh sửa khi đang chờ hoặc được yêu cầu bổ sung, hoặc gửi
              lại sau từ chối / bổ sung.
            </p>
          </div>
          <div className="owmr-head-actions">
            <a className="owreg__btn owreg__btn--ghost" href="/owner/register-vehicle">
              + Đăng xe mới
            </a>
            <button
              type="button"
              className="owreg__btn owreg__btn--ghost"
              onClick={() => void load({ detectStatusChange: false })}
              disabled={loading}
            >
              {loading ? 'Đang tải…' : 'Tải lại'}
            </button>
          </div>
        </div>

        <div className="owmr-toolbar">
          <label className="owmr-filter">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(ev) => setStatusFilter(ev.target.value as OwnerVehicleRequestStatus | 'ALL')}
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="NEED_MORE_INFO">Cần bổ sung</option>
              <option value="REJECTED">Từ chối</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>

          <label className="owmr-filter">
            <span>Sắp xếp</span>
            <select
              value={sortOrder}
              onChange={(ev) => setSortOrder(ev.target.value as 'NEWEST' | 'OLDEST')}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
            </select>
          </label>

          <span className="owmr-count">Hiển thị {filteredAndSortedItems.length} yêu cầu</span>
        </div>

        {toast ? (
          <p className="owmr-toast" role="status">
            {toast.message}{' '}
            {toast.href ? (
              <a href={toast.href} className="owmr-toast__link">
                {toast.linkLabel ?? 'Xem chi tiết'}
              </a>
            ) : null}
          </p>
        ) : null}
        {error ? (
          <p className="owreg__err" role="alert">
            {error}
          </p>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="owmr-muted">Đang tải danh sách…</p>
        ) : null}

        {!loading && filteredAndSortedItems.length === 0 ? (
          <div className="owmr-empty">
            <p>
              {items.length === 0
                ? 'Bạn chưa có yêu cầu nào.'
                : 'Không có yêu cầu nào khớp với bộ lọc hiện tại.'}
            </p>
            <a className="owreg__btn owreg__btn--primary" href="/owner/register-vehicle">
              Đăng xe cho thuê
            </a>
          </div>
        ) : null}

        {filteredAndSortedItems.length > 0 ? (
          <div className="owmr-scroll">
            <table className="owmr-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Biển số</th>
                  <th>Xe</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú admin</th>
                  <th>Tạo lúc</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedItems.map((r) => (
                  <tr key={r.id}>
                    <td className="owmr-mono">#{r.id}</td>
                    <td className="owmr-mono">{r.licensePlate || '—'}</td>
                    <td>
                      <div className="owmr-cell-title">{r.name || '—'}</div>
                      <div className="owmr-cell-sub">{r.brand || '—'}</div>
                    </td>
                    <td>
                      <span className={statusClass(r.status)}>{statusLabel(r.status)}</span>
                    </td>
                    <td className="owmr-note">
                      {r.adminNote?.trim() ? (
                        <span title={r.adminNote}>{r.adminNote}</span>
                      ) : (
                        <span className="owmr-muted">—</span>
                      )}
                    </td>
                    <td className="owmr-date">{toDate(r.createdAt)}</td>
                    <td className="owmr-actions">
                      <a className="owmr-link" href={`/owner/vehicle-requests/${r.id}`}>
                        Chi tiết
                      </a>
                      {r.status === 'APPROVED' && r.approvedVehicleId != null ? (
                        <a
                          className="owmr-link"
                          href={`/rent/${r.approvedVehicleId}`}
                          title="Xem xe trên cửa hàng cho thuê"
                        >
                          Xem xe #{r.approvedVehicleId}
                        </a>
                      ) : null}
                      {canEdit(r.status) ? (
                        <a className="owmr-link" href={`/owner/vehicle-requests/${r.id}/edit`}>
                          Sửa
                        </a>
                      ) : null}
                      {canResubmit(r.status) ? (
                        <button
                          type="button"
                          className="owmr-link owmr-link--btn"
                          disabled={busyId === r.id}
                          onClick={() => void onResubmit(r.id)}
                        >
                          {busyId === r.id ? 'Đang gửi…' : 'Gửi lại'}
                        </button>
                      ) : null}
                      {canCancel(r.status) ? (
                        <button
                          type="button"
                          className="owmr-link owmr-link--btn"
                          disabled={busyId === r.id}
                          onClick={() => void onCancel(r.id)}
                        >
                          {busyId === r.id ? 'Đang hủy…' : 'Hủy yêu cầu'}
                        </button>
                      ) : null}
                      {!canEdit(r.status) &&
                      !canResubmit(r.status) &&
                      !canCancel(r.status) &&
                      !(r.status === 'APPROVED' && r.approvedVehicleId != null) ? (
                        <span className="owmr-muted">—</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="owmr-footnote">
              <strong>Từ chối:</strong> dùng <strong>Gửi lại</strong> để chuyển về chờ duyệt, rồi
              dùng <strong>Sửa</strong> nếu cần đổi thông tin. <strong>Cần bổ sung:</strong> có thể{' '}
              <strong>Sửa</strong> trước hoặc <strong>Gửi lại</strong> sau khi đã cập nhật đủ theo
              ghi chú admin.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
