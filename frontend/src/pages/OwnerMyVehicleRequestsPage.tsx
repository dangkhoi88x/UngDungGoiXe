import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchMyOwnerVehicleRequests,
  resubmitOwnerVehicleRequest,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'
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
  if (s === 'APPROVED') return 'owmr-pill owmr-pill--ok'
  if (s === 'REJECTED' || s === 'CANCELLED') return 'owmr-pill owmr-pill--bad'
  if (s === 'NEED_MORE_INFO') return 'owmr-pill owmr-pill--warn'
  return 'owmr-pill owmr-pill--pending'
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

export default function OwnerMyVehicleRequestsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<OwnerVehicleRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchMyOwnerVehicleRequests()
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onResubmit(id: number) {
    setToast(null)
    setBusyId(id)
    try {
      await resubmitOwnerVehicleRequest(id)
      setToast(`Đã gửi lại yêu cầu #${id}. Trạng thái: chờ duyệt.`)
      await load()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Gửi lại thất bại.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="owreg">
      <header className="owreg__toolbar">
        <nav className="owreg__crumb" aria-label="Breadcrumb">
          <a className="owreg__crumb-link" href="/">
            Trang chủ
          </a>
          <span className="owreg__crumb-sep">/</span>
          <a className="owreg__crumb-link" href="/account">
            Tài khoản
          </a>
          <span className="owreg__crumb-sep">/</span>
          <span className="owreg__crumb-current">Yêu cầu xe của tôi</span>
        </nav>
      </header>

      <main className="owreg__main owmr-main">
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
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? 'Đang tải…' : 'Tải lại'}
            </button>
          </div>
        </div>

        {toast ? (
          <p className="owmr-toast" role="status">
            {toast}
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

        {!loading && items.length === 0 ? (
          <div className="owmr-empty">
            <p>Bạn chưa có yêu cầu nào.</p>
            <a className="owreg__btn owreg__btn--primary" href="/owner/register-vehicle">
              Đăng xe cho thuê
            </a>
          </div>
        ) : null}

        {items.length > 0 ? (
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
                {items.map((r) => (
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
                      {!canEdit(r.status) &&
                      !canResubmit(r.status) &&
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
