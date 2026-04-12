import { useCallback, useEffect, useState } from 'react'
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  deleteBooking,
  fetchBookingsPaged,
  formatBookingMoney,
  fromDateTimeLocalValue,
  pickupBooking,
  returnBooking,
  toDateTimeLocalValue,
  updateBooking,
  type BookingDto,
  type PagedBookingsResponse,
} from '../api/bookings'
import { fetchStations, type StationDto } from '../api/stations'
import { fetchAllVehicles, type VehicleDto } from '../api/vehicles'
import { fetchUsersPage, userDisplayName, type UserDto } from '../api/users'
import './AdminVehiclesSection.css'

const BOOKING_STATUSES = [
  '',
  'PENDING',
  'CONFIRMED',
  'ONGOING',
  'COMPLETED',
  'CANCELLED',
] as const

const SORT_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'startTime', label: 'Bắt đầu' },
  { value: 'expectedEndTime', label: 'Kết thúc dự kiến' },
  { value: 'createdAt', label: 'Ngày tạo' },
  { value: 'bookingCode', label: 'Mã' },
  { value: 'totalAmount', label: 'Tổng tiền' },
  { value: 'status', label: 'Trạng thái' },
] as const

function statusVi(s: string): string {
  const m: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    ONGOING: 'Đang thuê',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  }
  return m[s] || s
}

function paymentVi(s: string | null | undefined): string {
  if (!s) return '—'
  const m: Record<string, string> = {
    PENDING: 'Chưa TT',
    PAID: 'Đã TT',
    FAILED: 'TT lỗi',
    PARTIALLY_PAID: 'TT một phần',
  }
  return m[s] || s
}

type Props = {
  refreshKey?: number
}

export default function AdminBookingsSection({ refreshKey = 0 }: Props) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStationId, setFilterStationId] = useState('')
  const [filterRenterId, setFilterRenterId] = useState('')

  const [data, setData] = useState<PagedBookingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [stations, setStations] = useState<StationDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [users, setUsers] = useState<UserDto[]>([])

  const [modalCreate, setModalCreate] = useState(false)
  const [cRenter, setCRenter] = useState('')
  const [cVehicle, setCVehicle] = useState('')
  const [cStation, setCStation] = useState('')
  const [cStart, setCStart] = useState('')
  const [cEnd, setCEnd] = useState('')
  const [cNote, setCNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [notesBooking, setNotesBooking] = useState<BookingDto | null>(null)
  const [nPickup, setNPickup] = useState('')
  const [nReturn, setNReturn] = useState('')

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [workflowId, setWorkflowId] = useState<number | null>(null)

  const loadRefs = useCallback(async () => {
    try {
      const [st, v, uPage] = await Promise.all([
        fetchStations(),
        fetchAllVehicles(),
        fetchUsersPage({ page: 0, size: 100, sortBy: 'id', sortDir: 'asc' }),
      ])
      setStations(st)
      setVehicles(v)
      setUsers(uPage.content)
    } catch {
      /* bảng vẫn tải được nếu refs lỗi */
    }
  }, [])

  useEffect(() => {
    void loadRefs()
  }, [loadRefs])

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const stationId = filterStationId.trim()
        ? Number(filterStationId)
        : undefined
      const renterId = filterRenterId.trim()
        ? Number(filterRenterId)
        : undefined
      const res = await fetchBookingsPaged({
        page,
        size,
        sortBy,
        sortDir,
        status: filterStatus || undefined,
        stationId:
          stationId != null && Number.isInteger(stationId) && stationId > 0
            ? stationId
            : undefined,
        renterId:
          renterId != null && Number.isInteger(renterId) && renterId > 0
            ? renterId
            : undefined,
      })
      setData(res)
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(Math.max(0, res.totalPages - 1))
      } else if (res.totalPages === 0) {
        setPage(0)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được đặt xe')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [
    page,
    size,
    sortBy,
    sortDir,
    filterStatus,
    filterStationId,
    filterRenterId,
  ])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const openCreate = () => {
    setToast(null)
    setCRenter(users[0]?.id != null ? String(users[0].id) : '')
    setCVehicle(vehicles[0]?.id != null ? String(vehicles[0].id) : '')
    setCStation(stations[0]?.id != null ? String(stations[0].id) : '')
    setCStart('')
    setCEnd('')
    setCNote('')
    setModalCreate(true)
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    const renterId = Number(cRenter)
    const vehicleId = Number(cVehicle)
    const stationId = Number(cStation)
    if (!Number.isInteger(renterId) || renterId <= 0) {
      setToast('Chọn người thuê.')
      return
    }
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      setToast('Chọn xe.')
      return
    }
    if (!Number.isInteger(stationId) || stationId <= 0) {
      setToast('Chọn trạm.')
      return
    }
    const startTime = fromDateTimeLocalValue(cStart)
    const expectedEndTime = fromDateTimeLocalValue(cEnd)
    if (!startTime || !expectedEndTime) {
      setToast('Chọn thời gian bắt đầu và kết thúc.')
      return
    }
    setSaving(true)
    try {
      await createBooking({
        renterId,
        vehicleId,
        stationId,
        startTime,
        expectedEndTime,
        pickupNote: cNote.trim() || null,
      })
      setToast('Đã tạo đặt xe.')
      setModalCreate(false)
      setPage(0)
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setSaving(false)
    }
  }

  const openNotes = (b: BookingDto) => {
    setToast(null)
    setNotesBooking(b)
    setNPickup(b.pickupNote ?? '')
    setNReturn(b.returnNote ?? '')
  }

  const saveNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notesBooking) return
    setSaving(true)
    setToast(null)
    try {
      await updateBooking(notesBooking.id, {
        pickupNote: nPickup.trim() || null,
        returnNote: nReturn.trim() || null,
      })
      setToast('Đã lưu ghi chú.')
      setNotesBooking(null)
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const runWorkflow = async (
    id: number,
    fn: (id: number) => Promise<BookingDto>,
    okMsg: string,
  ) => {
    setToast(null)
    setWorkflowId(id)
    try {
      await fn(id)
      setToast(okMsg)
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Thao tác thất bại')
    } finally {
      setWorkflowId(null)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    setDeleting(true)
    setToast(null)
    try {
      await deleteBooking(deleteId)
      setToast('Đã xóa đặt xe.')
      setDeleteId(null)
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const content = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  return (
    <section className="adm-veh" aria-labelledby="adm-bk-title">
      <div className="adm-veh__toolbar">
        <h2 id="adm-bk-title">Đặt xe</h2>
        <div className="adm-veh__actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            Tải lại
          </button>
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--primary"
            onClick={openCreate}
            disabled={!users.length || !vehicles.length || !stations.length}
            title={
              !users.length || !vehicles.length || !stations.length
                ? 'Cần có ít nhất một user, xe và trạm trong hệ thống'
                : undefined
            }
          >
            + Tạo đặt xe
          </button>
        </div>
      </div>

      <div className="adm-users__filters">
        <label>
          <span className="adm-users__filter-label">Trạng thái</span>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả</option>
            {BOOKING_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {statusVi(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="adm-users__filter-label">Trạm (ID)</span>
          <input
            type="number"
            min={1}
            placeholder="Mọi trạm"
            value={filterStationId}
            onChange={(e) => {
              setFilterStationId(e.target.value)
              setPage(0)
            }}
            style={{
              width: 120,
              border: '1px solid var(--adm-border, #e8e8e8)',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          />
        </label>
        <label>
          <span className="adm-users__filter-label">Người thuê (ID)</span>
          <input
            type="number"
            min={1}
            placeholder="Mọi người"
            value={filterRenterId}
            onChange={(e) => {
              setFilterRenterId(e.target.value)
              setPage(0)
            }}
            style={{
              width: 120,
              border: '1px solid var(--adm-border, #e8e8e8)',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          />
        </label>
        <label>
          <span className="adm-users__filter-label">Sắp xếp</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(0)
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="adm-users__filter-label">Thứ tự</span>
          <select
            value={sortDir}
            onChange={(e) => {
              setSortDir(e.target.value as 'asc' | 'desc')
              setPage(0)
            }}
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>
        </label>
        <label>
          <span className="adm-users__filter-label">/ trang</span>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="adm-veh__msg adm-veh__msg--err" role="alert">
          {error}
        </p>
      ) : null}
      {toast && !modalCreate && !notesBooking && !deleteId ? (
        <p className="adm-veh__msg adm-veh__msg--ok" role="status">
          {toast}
        </p>
      ) : null}

      {loading && content.length === 0 ? (
        <div className="adm-veh__loading">Đang tải…</div>
      ) : null}

      {!loading && content.length === 0 ? (
        <p className="adm-veh__empty">Không có đặt xe trên trang này.</p>
      ) : null}

      {content.length > 0 ? (
        <>
          <div className="adm-veh__scroll">
            <table className="adm-veh__table" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Người thuê</th>
                  <th>Xe</th>
                  <th>Trạm</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>TT</th>
                  <th>Tổng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {content.map((b) => (
                  <tr key={b.id}>
                    <td className="adm-veh__mono">{b.bookingCode}</td>
                    <td>
                      <div>{b.renterName}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        #{b.renterId}
                      </div>
                    </td>
                    <td>
                      {b.vehicleName}
                      <div style={{ fontSize: 11, color: '#999' }}>
                        #{b.vehicleId}
                      </div>
                    </td>
                    <td>
                      {b.stationName}
                      <div style={{ fontSize: 11, color: '#999' }}>
                        #{b.stationId}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {toDateTimeLocalValue(b.startTime).replace('T', ' ')} →
                      <br />
                      {toDateTimeLocalValue(b.expectedEndTime).replace('T', ' ')}
                    </td>
                    <td>
                      <span className="adm-veh__pill">{statusVi(b.status)}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {paymentVi(b.paymentStatus)}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {formatBookingMoney(b.totalAmount)}
                    </td>
                    <td>
                      <div
                        className="adm-veh__row-actions"
                        style={{ flexDirection: 'column', alignItems: 'stretch' }}
                      >
                        {b.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="adm-veh__link-btn"
                            disabled={workflowId === b.id}
                            onClick={() =>
                              void runWorkflow(
                                b.id,
                                confirmBooking,
                                'Đã xác nhận.',
                              )
                            }
                          >
                            Xác nhận
                          </button>
                        ) : null}
                        {b.status === 'CONFIRMED' ? (
                          <button
                            type="button"
                            className="adm-veh__link-btn"
                            disabled={workflowId === b.id}
                            onClick={() =>
                              void runWorkflow(
                                b.id,
                                pickupBooking,
                                'Đã giao xe.',
                              )
                            }
                          >
                            Giao xe
                          </button>
                        ) : null}
                        {b.status === 'ONGOING' ? (
                          <button
                            type="button"
                            className="adm-veh__link-btn"
                            disabled={workflowId === b.id}
                            onClick={() =>
                              void runWorkflow(
                                b.id,
                                returnBooking,
                                'Đã trả xe.',
                              )
                            }
                          >
                            Trả xe
                          </button>
                        ) : null}
                        {['PENDING', 'CONFIRMED', 'ONGOING'].includes(
                          b.status,
                        ) ? (
                          <button
                            type="button"
                            className="adm-veh__link-btn adm-veh__link-btn--danger"
                            disabled={workflowId === b.id}
                            onClick={() =>
                              void runWorkflow(
                                b.id,
                                cancelBooking,
                                'Đã hủy.',
                              )
                            }
                          >
                            Hủy
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="adm-veh__link-btn"
                          onClick={() => openNotes(b)}
                        >
                          Ghi chú
                        </button>
                        <button
                          type="button"
                          className="adm-veh__link-btn adm-veh__link-btn--danger"
                          onClick={() => {
                            setToast(null)
                            setDeleteId(b.id)
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="adm-veh__pager" aria-label="Phân trang">
            <span className="adm-veh__pager-info">
              {totalElements === 0
                ? '0 đơn'
                : `Trang ${page + 1} / ${Math.max(totalPages, 1)} · ${totalElements} đặt xe`}
            </span>
            <div className="adm-veh__pager-btns">
              <button
                type="button"
                className="adm-veh__btn adm-veh__btn--ghost"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Trước
              </button>
              <button
                type="button"
                className="adm-veh__btn adm-veh__btn--ghost"
                disabled={
                  page >= totalPages - 1 || loading || totalPages === 0
                }
                onClick={() =>
                  setPage((p) =>
                    totalPages > 0 ? Math.min(totalPages - 1, p + 1) : p,
                  )
                }
              >
                Sau
              </button>
            </div>
          </nav>
        </>
      ) : null}

      {modalCreate ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) =>
            ev.target === ev.currentTarget && !saving && setModalCreate(false)
          }
        >
          <div
            className="adm-veh__modal"
            style={{ maxWidth: 520 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-bk-create-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-bk-create-title">Tạo đặt xe</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={() => !saving && setModalCreate(false)}
              >
                ×
              </button>
            </div>
            <form className="adm-veh__form" onSubmit={submitCreate}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <div className="adm-veh__field">
                <label htmlFor="bk-renter">Người thuê *</label>
                <select
                  id="bk-renter"
                  value={cRenter}
                  onChange={(e) => setCRenter(e.target.value)}
                  required
                >
                  {users.length === 0 ? (
                    <option value="">— Chưa có người dùng —</option>
                  ) : null}
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      #{u.id} — {userDisplayName(u)} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-veh__field">
                <label htmlFor="bk-veh">Xe *</label>
                <select
                  id="bk-veh"
                  value={cVehicle}
                  onChange={(e) => setCVehicle(e.target.value)}
                  required
                >
                  {vehicles.length === 0 ? (
                    <option value="">— Chưa có xe —</option>
                  ) : null}
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      #{v.id} — {v.name || v.licensePlate}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-veh__field">
                <label htmlFor="bk-st">Trạm *</label>
                <select
                  id="bk-st"
                  value={cStation}
                  onChange={(e) => setCStation(e.target.value)}
                  required
                >
                  {stations.length === 0 ? (
                    <option value="">— Chưa có trạm —</option>
                  ) : null}
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="bk-s">Bắt đầu *</label>
                  <input
                    id="bk-s"
                    type="datetime-local"
                    value={cStart}
                    onChange={(e) => setCStart(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="bk-e">Kết thúc dự kiến *</label>
                  <input
                    id="bk-e"
                    type="datetime-local"
                    value={cEnd}
                    onChange={(e) => setCEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="adm-veh__field">
                <label htmlFor="bk-n">Ghi chú lấy xe</label>
                <textarea
                  id="bk-n"
                  value={cNote}
                  onChange={(e) => setCNote(e.target.value)}
                />
              </div>
              <div className="adm-veh__form-actions">
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--ghost"
                  onClick={() => setModalCreate(false)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-veh__btn adm-veh__btn--primary"
                  disabled={saving}
                >
                  {saving ? 'Đang tạo…' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {notesBooking ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) =>
            ev.target === ev.currentTarget && !saving && setNotesBooking(null)
          }
        >
          <div
            className="adm-veh__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-bk-notes-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-bk-notes-title">
                Ghi chú — {notesBooking.bookingCode}
              </h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={() => !saving && setNotesBooking(null)}
              >
                ×
              </button>
            </div>
            <form className="adm-veh__form" onSubmit={saveNotes}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <div className="adm-veh__field">
                <label htmlFor="bn-p">Lấy xe</label>
                <textarea
                  id="bn-p"
                  value={nPickup}
                  onChange={(e) => setNPickup(e.target.value)}
                />
              </div>
              <div className="adm-veh__field">
                <label htmlFor="bn-r">Trả xe</label>
                <textarea
                  id="bn-r"
                  value={nReturn}
                  onChange={(e) => setNReturn(e.target.value)}
                />
              </div>
              <div className="adm-veh__form-actions">
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--ghost"
                  onClick={() => setNotesBooking(null)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-veh__btn adm-veh__btn--primary"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteId != null ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) =>
            ev.target === ev.currentTarget && !deleting && setDeleteId(null)
          }
        >
          <div
            className="adm-veh__modal"
            style={{ maxWidth: 400 }}
            role="dialog"
            aria-labelledby="adm-bk-del-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-bk-del-title">Xóa đặt xe?</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={() => !deleting && setDeleteId(null)}
              >
                ×
              </button>
            </div>
            <div className="adm-veh__form">
              <p style={{ margin: 0 }}>
                Xóa vĩnh viễn đơn <strong>#{deleteId}</strong>? Chỉ nên xóa khi
                dữ liệu thử nghiệm; có thể lỗi nếu còn thanh toán liên kết.
              </p>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <div className="adm-veh__form-actions">
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--ghost"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--danger"
                  onClick={() => void confirmDelete()}
                  disabled={deleting}
                >
                  {deleting ? 'Đang xóa…' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
