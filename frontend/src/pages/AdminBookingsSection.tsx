import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import {
  ADMIN_SESSION_KEYS,
  clampAdminPageSize,
  readAdminSession,
  writeAdminSession,
} from '../lib/adminSessionStorage'
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
import {
  confirmRefundPayment,
  confirmTopupPayment,
  fetchPendingAdjustments,
  type PaymentDto,
  type PaymentPurpose,
} from '../api/payments'
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

const SORT_OPTION_VALUES = new Set(
  SORT_OPTIONS.map((o) => o.value as string),
)

function normalizeBookingSortBy(v: unknown): string {
  return typeof v === 'string' && SORT_OPTION_VALUES.has(v) ? v : 'id'
}

function initialBookingsFilters() {
  const d = readAdminSession(ADMIN_SESSION_KEYS.bookings, {
    page: 0,
    size: 10,
    sortBy: 'id',
    sortDir: 'desc' as 'asc' | 'desc',
    filterStatus: '',
    filterStationId: '',
    filterRenterId: '',
    searchQuery: '',
  })
  return {
    page: Math.max(
      0,
      Number.isFinite(Number(d.page)) ? Math.trunc(Number(d.page)) : 0,
    ),
    size: clampAdminPageSize(d.size),
    sortBy: normalizeBookingSortBy(d.sortBy),
    sortDir: d.sortDir === 'asc' ? ('asc' as const) : ('desc' as const),
    filterStatus: typeof d.filterStatus === 'string' ? d.filterStatus : '',
    filterStationId:
      typeof d.filterStationId === 'string' ? d.filterStationId : '',
    filterRenterId: typeof d.filterRenterId === 'string' ? d.filterRenterId : '',
    searchQuery: typeof d.searchQuery === 'string' ? d.searchQuery : '',
  }
}

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

function purposeVi(s: string | null | undefined): string {
  if (s === 'TOPUP') return 'Thu them'
  if (s === 'REFUND') return 'Hoan tien'
  return s || '—'
}

type Props = {
  refreshKey?: number
}

export default function AdminBookingsSection({ refreshKey = 0 }: Props) {
  const [activeTab, setActiveTab] = useState<
    'bookings' | 'completed-history' | PaymentPurpose
  >('bookings')
  const initialFilters = useMemo(() => initialBookingsFilters(), [])
  const [page, setPage] = useState(initialFilters.page)
  const [size, setSize] = useState(initialFilters.size)
  const [sortBy, setSortBy] = useState(initialFilters.sortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialFilters.sortDir)
  const [filterStatus, setFilterStatus] = useState(initialFilters.filterStatus)
  const [filterStationId, setFilterStationId] = useState(
    initialFilters.filterStationId,
  )
  const [filterRenterId, setFilterRenterId] = useState(
    initialFilters.filterRenterId,
  )
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery)

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
  const [pendingTopups, setPendingTopups] = useState<PaymentDto[]>([])
  const [pendingRefunds, setPendingRefunds] = useState<PaymentDto[]>([])
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false)
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null)
  const [processingAdjustmentId, setProcessingAdjustmentId] = useState<number | null>(null)
  const [adjustmentSearch, setAdjustmentSearch] = useState('')

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

  const loadAdjustments = useCallback(async () => {
    setAdjustmentsError(null)
    setAdjustmentsLoading(true)
    try {
      const [topups, refunds] = await Promise.all([
        fetchPendingAdjustments('TOPUP'),
        fetchPendingAdjustments('REFUND'),
      ])
      setPendingTopups(topups)
      setPendingRefunds(refunds)
    } catch (e) {
      setAdjustmentsError(
        e instanceof Error ? e.message : 'Khong tai duoc danh sach dieu chinh.',
      )
    } finally {
      setAdjustmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRefs()
  }, [loadRefs])

  useEffect(() => {
    void loadAdjustments()
  }, [loadAdjustments, refreshKey])

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
        status:
          activeTab === 'completed-history'
            ? 'COMPLETED'
            : filterStatus || undefined,
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
    activeTab,
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

  useEffect(() => {
    writeAdminSession(ADMIN_SESSION_KEYS.bookings, {
      page,
      size,
      sortBy,
      sortDir,
      filterStatus,
      filterStationId,
      filterRenterId,
      searchQuery,
    })
  }, [
    page,
    size,
    sortBy,
    sortDir,
    filterStatus,
    filterStationId,
    filterRenterId,
    searchQuery,
  ])

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

  const processAdjustment = async (paymentId: number, purpose: PaymentPurpose) => {
    setToast(null)
    setProcessingAdjustmentId(paymentId)
    try {
      if (purpose === 'TOPUP') {
        await confirmTopupPayment(paymentId)
        setToast('Da xac nhan thu them TOPUP.')
      } else {
        await confirmRefundPayment(paymentId)
        setToast('Da xac nhan hoan tien REFUND.')
      }
      await Promise.all([loadAdjustments(), load()])
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Xu ly dieu chinh that bai')
    } finally {
      setProcessingAdjustmentId(null)
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

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return content
    return content.filter((b) => {
      const code = (b.bookingCode || '').toLowerCase()
      const renter = (b.renterName || '').toLowerCase()
      const vehicle = (b.vehicleName || '').toLowerCase()
      const station = (b.stationName || '').toLowerCase()
      const st = (b.status || '').toLowerCase()
      const stVi = statusVi(b.status).toLowerCase()
      const pay = (b.paymentStatus || '').toLowerCase()
      const payVi = paymentVi(b.paymentStatus).toLowerCase()
      return (
        code.includes(q) ||
        renter.includes(q) ||
        vehicle.includes(q) ||
        station.includes(q) ||
        st.includes(q) ||
        stVi.includes(q) ||
        pay.includes(q) ||
        payVi.includes(q) ||
        String(b.id).includes(q) ||
        String(b.renterId).includes(q) ||
        String(b.vehicleId).includes(q) ||
        String(b.stationId).includes(q)
      )
    })
  }, [content, searchQuery])

  const currentAdjustments = activeTab === 'TOPUP' ? pendingTopups : pendingRefunds
  const filteredAdjustments = useMemo(() => {
    const q = adjustmentSearch.trim().toLowerCase()
    if (!q) return currentAdjustments
    return currentAdjustments.filter((p) => {
      const paymentId = String(p.id)
      const bookingId = String(p.bookingId ?? '')
      const bookingCode = (p.bookingCode || '').toLowerCase()
      const tx = (p.transactionId || '').toLowerCase()
      return (
        paymentId.includes(q) ||
        bookingId.includes(q) ||
        bookingCode.includes(q) ||
        tx.includes(q)
      )
    })
  }, [adjustmentSearch, currentAdjustments])

  useEscapeToClose(
    modalCreate,
    () => {
      if (!saving) setModalCreate(false)
    },
    !saving,
  )
  useEscapeToClose(
    Boolean(notesBooking),
    () => {
      if (!saving) setNotesBooking(null)
    },
    !saving,
  )
  useEscapeToClose(
    deleteId != null,
    () => {
      if (!deleting) setDeleteId(null)
    },
    !deleting,
  )

  if (activeTab === 'TOPUP' || activeTab === 'REFUND') {
    return (
      <section className="adm-veh adm-bookings-section" aria-labelledby="adm-bk-title">
        <div className="adm-veh__toolbar">
          <h2 id="adm-bk-title">Đặt xe</h2>
          <div className="adm-veh__actions">
            <button
              type="button"
              className="adm-veh__btn adm-veh__btn--ghost"
              onClick={() => void loadAdjustments()}
              disabled={adjustmentsLoading}
            >
              Tải lại
            </button>
          </div>
        </div>

        <div className="adm-bk-tabs" role="tablist" aria-label="Dieu huong dat xe">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="adm-bk-tab"
            onClick={() => setActiveTab('bookings')}
          >
            Danh sach dat xe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="adm-bk-tab"
            onClick={() => {
              setActiveTab('completed-history')
              setPage(0)
            }}
          >
            Lịch sử hoàn thành
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'TOPUP'}
            className={`adm-bk-tab ${activeTab === 'TOPUP' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('TOPUP')}
          >
            TOPUP chờ xử lý ({pendingTopups.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'REFUND'}
            className={`adm-bk-tab ${activeTab === 'REFUND' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('REFUND')}
          >
            REFUND chờ xử lý ({pendingRefunds.length})
          </button>
        </div>

        <div className="adm-users__filters" style={{ marginBottom: 14 }}>
          <div className="adm-users__search-field">
            <label className="adm-users__filter-label" htmlFor="adm-adjust-search">
              Tìm nhanh khoản điều chỉnh
            </label>
            <input
              id="adm-adjust-search"
              type="search"
              className="adm-users__search-input"
              placeholder="Mã payment, booking, transaction..."
              value={adjustmentSearch}
              onChange={(e) => setAdjustmentSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {adjustmentsError ? (
          <p className="adm-veh__msg adm-veh__msg--err" role="alert">
            {adjustmentsError}
          </p>
        ) : null}
        {toast ? (
          <p className="adm-veh__msg adm-veh__msg--ok" role="status">
            {toast}
          </p>
        ) : null}

        {adjustmentsLoading ? (
          <div className="adm-veh__loading">Đang tải danh sách điều chỉnh…</div>
        ) : null}

        {!adjustmentsLoading && filteredAdjustments.length === 0 ? (
          <p className="adm-veh__empty">Không có khoản điều chỉnh đang chờ xử lý.</p>
        ) : null}

        {!adjustmentsLoading && filteredAdjustments.length > 0 ? (
          <div className="adm-veh__scroll">
            <table className="adm-veh__table" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>Mã payment</th>
                  <th>Mã booking</th>
                  <th>Số tiền</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Thời gian tạo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((p) => (
                  <tr key={p.id}>
                    <td className="adm-veh__mono">#{p.id}</td>
                    <td className="adm-veh__mono">{p.bookingCode || `#${p.bookingId}`}</td>
                    <td>{formatBookingMoney(p.amount)}</td>
                    <td>
                      <span className="adm-veh__pill">{purposeVi(p.paymentPurpose)}</span>
                    </td>
                    <td>{paymentVi(p.status)}</td>
                    <td style={{ fontSize: 12 }}>
                      {p.createdAt ? toDateTimeLocalValue(p.createdAt).replace('T', ' ') : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-veh__btn adm-veh__btn--primary"
                        disabled={processingAdjustmentId === p.id}
                        onClick={() => void processAdjustment(p.id, activeTab)}
                      >
                        {processingAdjustmentId === p.id
                          ? 'Đang xử lý…'
                          : activeTab === 'TOPUP'
                            ? 'Xác nhận đã thu'
                            : 'Xác nhận đã hoàn'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <section className="adm-veh adm-bookings-section" aria-labelledby="adm-bk-title">
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

      <div className="adm-bk-tabs" role="tablist" aria-label="Dieu huong dat xe">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookings'}
          className={`adm-bk-tab ${activeTab === 'bookings' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('bookings')
            setPage(0)
          }}
        >
          Danh sách đặt xe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'completed-history'}
          className={`adm-bk-tab ${activeTab === 'completed-history' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('completed-history')
            setPage(0)
          }}
        >
          Lịch sử hoàn thành
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="adm-bk-tab"
          onClick={() => setActiveTab('TOPUP')}
        >
          TOPUP chờ xử lý ({pendingTopups.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="adm-bk-tab"
          onClick={() => setActiveTab('REFUND')}
        >
          REFUND chờ xử lý ({pendingRefunds.length})
        </button>
      </div>

      <div className="adm-users__filters">
        <div className="adm-users__search-field">
          <label className="adm-users__filter-label" htmlFor="adm-bk-search">
            Tìm trên trang này
          </label>
          <input
            id="adm-bk-search"
            type="search"
            className="adm-users__search-input"
            placeholder="Mã đơn, người thuê, xe, trạm, trạng thái…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <label>
          <span className="adm-users__filter-label">Trạng thái</span>
          <select
            disabled={activeTab === 'completed-history'}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(0)
            }}
          >
            <option value="">
              {activeTab === 'completed-history' ? 'Hoàn thành (cố định)' : 'Tất cả'}
            </option>
            {BOOKING_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {statusVi(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="adm-users__filter-label">Trạm</span>
          <select
            value={filterStationId}
            onChange={(e) => {
              setFilterStationId(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả trạm</option>
            {stations.map((s) => (
              <option key={s.id} value={String(s.id)}>
                #{s.id} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="adm-users__filter-label">Người thuê</span>
          <select
            value={filterRenterId}
            onChange={(e) => {
              setFilterRenterId(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Mọi người thuê</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                #{u.id} — {userDisplayName(u)}
              </option>
            ))}
          </select>
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
        <div className="adm-veh__loading">Đang tải danh sách đặt xe…</div>
      ) : null}

      {!loading && content.length === 0 ? (
        <p className="adm-veh__empty">
          Không có đặt xe khớp bộ lọc API trên trang này. Đổi trạng thái / trạm /
          người thuê hoặc chuyển trang.
        </p>
      ) : null}

      {!loading && content.length > 0 && filteredRows.length === 0 ? (
        <p className="adm-veh__empty">
          Không có dòng nào khớp tìm kiếm trên trang hiện tại. Xóa từ khóa hoặc
          đổi bộ lọc server.
        </p>
      ) : null}

      {filteredRows.length > 0 ? (
        <>
          <div className="adm-veh__scroll">
            <table className="adm-veh__table adm-bk-table" style={{ minWidth: 1100 }}>
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
                {filteredRows.map((b) => (
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
            style={{ maxWidth: 560 }}
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
              <div className="adm-bk-modal__section">
                <p className="adm-bk-modal__section-title">Người thuê &amp; phương tiện</p>
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
              </div>
              <div className="adm-bk-modal__section">
                <p className="adm-bk-modal__section-title">Trạm &amp; thời gian</p>
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
              </div>
              <div className="adm-bk-modal__section">
                <p className="adm-bk-modal__section-title">Ghi chú</p>
                <div className="adm-veh__field">
                  <label htmlFor="bk-n">Ghi chú lấy xe (tuỳ chọn)</label>
                  <textarea
                    id="bk-n"
                    value={cNote}
                    onChange={(e) => setCNote(e.target.value)}
                    rows={3}
                  />
                </div>
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
            style={{ maxWidth: 520 }}
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
              <div className="adm-bk-modal__section">
                <p className="adm-bk-modal__section-title">Thông tin đơn</p>
                <p className="adm-bk-modal__meta">
                  <strong>{notesBooking.renterName}</strong> · {notesBooking.vehicleName} ·{' '}
                  {notesBooking.stationName}
                  <br />
                  Trạng thái: <strong>{statusVi(notesBooking.status)}</strong> · Thanh toán:{' '}
                  {paymentVi(notesBooking.paymentStatus)}
                </p>
              </div>
              <div className="adm-bk-modal__section">
                <p className="adm-bk-modal__section-title">Ghi chú giao nhận</p>
                <div className="adm-veh__field">
                  <label htmlFor="bn-p">Lấy xe</label>
                  <textarea
                    id="bn-p"
                    value={nPickup}
                    onChange={(e) => setNPickup(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="bn-r">Trả xe</label>
                  <textarea
                    id="bn-r"
                    value={nReturn}
                    onChange={(e) => setNReturn(e.target.value)}
                    rows={4}
                  />
                </div>
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
