import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import {
  ADMIN_SESSION_KEYS,
  clampAdminPageSize,
  readAdminSession,
  writeAdminSession,
} from '../lib/adminSessionStorage'
import {
  createVehicle,
  deleteVehicle,
  fetchVehiclesPage,
  formatDailyPrice,
  formatHourlyPrice,
  fuelLabel,
  type PagedVehiclesResponse,
  type VehicleDto,
  type VehicleWritePayload,
  updateVehicle,
  vehicleDisplayName,
} from '../api/vehicles'
import { fetchStations, stationLabel, type StationDto } from '../api/stations'
import './AdminVehiclesSection.css'

const STATUSES = [
  'AVAILABLE',
  'RENTED',
  'MAINTENANCE',
  'CHARGING',
  'UNAVAILABLE',
] as const

const FUELS = ['GASOLINE', 'ELECTRICITY'] as const

const VEHICLE_SORT_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'licensePlate', label: 'Biển số' },
  { value: 'name', label: 'Tên xe' },
  { value: 'brand', label: 'Hãng' },
  { value: 'stationId', label: 'Trạm' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'fuelType', label: 'Nhiên liệu' },
  { value: 'capacity', label: 'Số chỗ' },
  { value: 'rentCount', label: 'Lượt thuê' },
  { value: 'hourlyRate', label: 'Giá/giờ' },
  { value: 'dailyRate', label: 'Giá/ngày' },
  { value: 'createdAt', label: 'Ngày tạo' },
] as const

type FormState = {
  stationId: string
  licensePlate: string
  name: string
  brand: string
  fuelType: string
  rating: string
  capacity: string
  rentCount: string
  photosText: string
  policiesText: string
  status: string
  hourlyRate: string
  dailyRate: string
  depositAmount: string
}

function emptyForm(stationIdDefault: string): FormState {
  return {
    stationId: stationIdDefault,
    licensePlate: '',
    name: '',
    brand: '',
    fuelType: 'GASOLINE',
    rating: '0',
    capacity: '5',
    rentCount: '0',
    photosText: '',
    policiesText: '',
    status: 'AVAILABLE',
    hourlyRate: '',
    dailyRate: '',
    depositAmount: '',
  }
}

function vehicleToForm(v: VehicleDto): FormState {
  return {
    stationId: String(v.stationId),
    licensePlate: v.licensePlate ?? '',
    name: v.name ?? '',
    brand: v.brand ?? '',
    fuelType: v.fuelType || 'GASOLINE',
    rating: v.rating != null ? String(v.rating) : '0',
    capacity: v.capacity != null ? String(v.capacity) : '',
    rentCount: v.rentCount != null ? String(v.rentCount) : '0',
    photosText: (v.photos ?? []).join('\n'),
    policiesText: (v.policies ?? []).join('\n'),
    status: v.status || 'AVAILABLE',
    hourlyRate:
      v.hourlyRate != null && v.hourlyRate !== ''
        ? String(v.hourlyRate)
        : '',
    dailyRate:
      v.dailyRate != null && v.dailyRate !== '' ? String(v.dailyRate) : '',
    depositAmount:
      v.depositAmount != null && v.depositAmount !== ''
        ? String(v.depositAmount)
        : '',
  }
}

function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseNumInput(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function formToPayload(f: FormState): VehicleWritePayload {
  const stationId = Number(f.stationId)
  const licensePlate = f.licensePlate.trim()
  const photos = linesToList(f.photosText)
  const policies = linesToList(f.policiesText)
  const rating = parseNumInput(f.rating)
  const capacity = parseNumInput(f.capacity)
  const rentCount = parseNumInput(f.rentCount)
  const hourlyRate = parseNumInput(f.hourlyRate)
  const dailyRate = parseNumInput(f.dailyRate)
  const depositAmount = parseNumInput(f.depositAmount)

  return {
    stationId: Number.isInteger(stationId) && stationId > 0 ? stationId : 0,
    licensePlate,
    name: f.name.trim() || null,
    brand: f.brand.trim() || null,
    fuelType: f.fuelType || null,
    rating: rating ?? null,
    capacity: capacity ?? null,
    rentCount: rentCount ?? null,
    photos: photos.length ? photos : null,
    policies: policies.length ? policies : null,
    status: f.status || null,
    hourlyRate,
    dailyRate,
    depositAmount,
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'Sẵn sàng',
    RENTED: 'Đang thuê',
    MAINTENANCE: 'Bảo trì',
    CHARGING: 'Đang sạc',
    UNAVAILABLE: 'Không dùng',
  }
  return map[s] || s
}

type Props = {
  refreshKey?: number
}

function parseVehiclesFilterStatus(
  v: unknown,
): 'ALL' | (typeof STATUSES)[number] {
  if (v === 'ALL') return 'ALL'
  if (typeof v === 'string' && (STATUSES as readonly string[]).includes(v)) {
    return v as (typeof STATUSES)[number]
  }
  return 'ALL'
}

function parseVehiclesFilterFuel(v: unknown): 'ALL' | (typeof FUELS)[number] {
  if (v === 'ALL') return 'ALL'
  if (typeof v === 'string' && (FUELS as readonly string[]).includes(v)) {
    return v as (typeof FUELS)[number]
  }
  return 'ALL'
}

function parseStationFilterId(v: unknown): 'ALL' | string {
  if (v === 'ALL') return 'ALL'
  if (typeof v === 'string' && /^\d+$/.test(v)) return v
  return 'ALL'
}

const VEHICLE_SORT_VALUES = new Set(
  VEHICLE_SORT_OPTIONS.map((o) => o.value as string),
)

function parseVehicleSortBy(v: unknown): string {
  return typeof v === 'string' && VEHICLE_SORT_VALUES.has(v) ? v : 'id'
}

function initialVehiclesFilters() {
  const d = readAdminSession(ADMIN_SESSION_KEYS.vehicles, {
    filterKeyword: '',
    filterStatus: 'ALL' as 'ALL' | (typeof STATUSES)[number],
    filterFuel: 'ALL' as 'ALL' | (typeof FUELS)[number],
    filterStationId: 'ALL' as 'ALL' | string,
    page: 0,
    size: 10,
    sortBy: 'id',
    sortDir: 'desc' as 'asc' | 'desc',
  })
  return {
    filterKeyword: typeof d.filterKeyword === 'string' ? d.filterKeyword : '',
    filterStatus: parseVehiclesFilterStatus(d.filterStatus),
    filterFuel: parseVehiclesFilterFuel(d.filterFuel),
    filterStationId: parseStationFilterId(d.filterStationId),
    page: Math.max(
      0,
      Number.isFinite(Number(d.page)) ? Math.trunc(Number(d.page)) : 0,
    ),
    size: clampAdminPageSize(d.size),
    sortBy: parseVehicleSortBy(d.sortBy),
    sortDir: d.sortDir === 'asc' ? ('asc' as const) : ('desc' as const),
  }
}

export default function AdminVehiclesSection({ refreshKey = 0 }: Props) {
  const initialFilters = useMemo(() => initialVehiclesFilters(), [])
  const [stations, setStations] = useState<StationDto[]>([])
  const [filterKeyword, setFilterKeyword] = useState(initialFilters.filterKeyword)
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | (typeof STATUSES)[number]
  >(initialFilters.filterStatus)
  const [filterFuel, setFilterFuel] = useState<'ALL' | (typeof FUELS)[number]>(
    initialFilters.filterFuel,
  )
  const [filterStationId, setFilterStationId] = useState<'ALL' | string>(
    initialFilters.filterStationId,
  )
  const [page, setPage] = useState(initialFilters.page)
  const [size, setSize] = useState(initialFilters.size)
  const [sortBy, setSortBy] = useState<string>(initialFilters.sortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialFilters.sortDir)
  const [data, setData] = useState<PagedVehiclesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm(''))
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const firstStationId = stations[0]?.id != null ? String(stations[0].id) : ''

  const loadStations = useCallback(async () => {
    try {
      setStations(await fetchStations())
    } catch {
      setStations([])
    }
  }, [])

  const loadVehicles = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchVehiclesPage({
        page,
        size,
        sortBy,
        sortDir,
        stationId:
          filterStationId !== 'ALL'
            ? Number(filterStationId)
            : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        fuelType: filterFuel !== 'ALL' ? filterFuel : undefined,
        keyword: filterKeyword.trim() || undefined,
      })
      setData(res)
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(Math.max(0, res.totalPages - 1))
      } else if (res.totalPages === 0) {
        setPage(0)
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không tải được danh sách phương tiện.',
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [
    page,
    size,
    sortBy,
    sortDir,
    filterKeyword,
    filterStatus,
    filterFuel,
    filterStationId,
  ])

  useEffect(() => {
    void loadStations()
  }, [loadStations, refreshKey])

  useEffect(() => {
    void loadVehicles()
  }, [loadVehicles, refreshKey])

  useEffect(() => {
    writeAdminSession(ADMIN_SESSION_KEYS.vehicles, {
      filterKeyword,
      filterStatus,
      filterFuel,
      filterStationId,
      page,
      size,
      sortBy,
      sortDir,
    })
  }, [
    filterKeyword,
    filterStatus,
    filterFuel,
    filterStationId,
    page,
    size,
    sortBy,
    sortDir,
  ])

  const stationName = useCallback(
    (id: number) =>
      stationLabel(stations.find((s) => s.id === id) ?? { id, name: '' }),
    [stations],
  )

  useEffect(() => {
    setPage(0)
  }, [filterKeyword, filterStatus, filterFuel, filterStationId])

  const content = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  const hasActiveFilters =
    filterKeyword.trim() !== '' ||
    filterStatus !== 'ALL' ||
    filterFuel !== 'ALL' ||
    filterStationId !== 'ALL'

  const reload = useCallback(async () => {
    await loadStations()
    await loadVehicles()
  }, [loadStations, loadVehicles])

  const openCreate = () => {
    setToast(null)
    setForm(emptyForm(firstStationId))
    setEditingId(null)
    setModal('create')
  }

  const openEdit = (v: VehicleDto) => {
    setToast(null)
    setForm(vehicleToForm(v))
    setEditingId(v.id)
    setModal('edit')
  }

  const closeModal = () => {
    if (saving) return
    setModal(null)
    setEditingId(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    const payload = formToPayload(form)
    if (!payload.stationId || payload.stationId <= 0) {
      setToast('Chọn trạm / bãi xe.')
      return
    }
    if (!payload.licensePlate) {
      setToast('Biển số không được để trống.')
      return
    }

    setSaving(true)
    try {
      if (modal === 'create') {
        await createVehicle(payload)
        setToast('Đã thêm xe.')
      } else if (modal === 'edit' && editingId != null) {
        await updateVehicle(editingId, payload)
        setToast('Đã cập nhật xe.')
      }
      closeModal()
      await reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    setDeleting(true)
    setToast(null)
    try {
      await deleteVehicle(deleteId)
      setToast('Đã xóa xe.')
      setDeleteId(null)
      await reload()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  useEscapeToClose(modal !== null, closeModal, !saving)
  useEscapeToClose(
    deleteId != null,
    () => {
      if (!deleting) setDeleteId(null)
    },
    !deleting,
  )

  return (
    <section
      className="adm-veh adm-users-section adm-vehicles-section"
      aria-labelledby="adm-veh-title"
    >
      <div className="adm-veh__toolbar">
        <h2 id="adm-veh-title">Phương tiện</h2>
        <div className="adm-veh__actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => void reload()}
            disabled={loading}
          >
            Tải lại
          </button>
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--primary"
            onClick={openCreate}
            disabled={!firstStationId}
            title={
              !firstStationId
                ? 'Cần có ít nhất một trạm trong hệ thống'
                : undefined
            }
          >
            + Thêm xe
          </button>
        </div>
      </div>

      <div className="adm-users__filters" aria-label="Bộ lọc phương tiện">
        <div className="adm-users__search-field">
          <label className="adm-users__filter-label" htmlFor="veh-filter-keyword">
            Từ khóa
          </label>
          <input
            id="veh-filter-keyword"
            type="search"
            className="adm-users__search-input"
            placeholder="ID, biển số, tên xe, hãng, trạm…"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="adm-users__filter-label" htmlFor="veh-filter-status">
            Trạng thái
          </label>
          <select
            id="veh-filter-status"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as 'ALL' | (typeof STATUSES)[number])
            }
          >
            <option value="ALL">Tất cả</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="adm-users__filter-label" htmlFor="veh-filter-fuel">
            Nhiên liệu
          </label>
          <select
            id="veh-filter-fuel"
            value={filterFuel}
            onChange={(e) => setFilterFuel(e.target.value as 'ALL' | (typeof FUELS)[number])}
          >
            <option value="ALL">Tất cả</option>
            {FUELS.map((f) => (
              <option key={f} value={f}>
                {fuelLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="adm-users__filter-label" htmlFor="veh-filter-station">
            Trạm
          </label>
          <select
            id="veh-filter-station"
            value={filterStationId}
            onChange={(e) => setFilterStationId(e.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {stations.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {stationLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <label>
          <span className="adm-users__filter-label">Sắp xếp</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(0)
            }}
          >
            {VEHICLE_SORT_OPTIONS.map((o) => (
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
        <div className="adm-users__filters-actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => {
              setFilterKeyword('')
              setFilterStatus('ALL')
              setFilterFuel('ALL')
              setFilterStationId('ALL')
              setPage(0)
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
      {toast && !modal && !deleteId ? (
        <p className="adm-veh__msg adm-veh__msg--ok" role="status">
          {toast}
        </p>
      ) : null}

      {!firstStationId && !loading ? (
        <p className="adm-veh__msg adm-veh__msg--err" role="status">
          Chưa có trạm nào. Hãy tạo trạm qua mục Trạm hoặc API <code>/stations</code>{' '}
          trước khi thêm xe.
        </p>
      ) : null}

      {loading && content.length === 0 ? (
        <div className="adm-veh__loading">Đang tải danh sách xe…</div>
      ) : null}

      {!loading && !error && totalElements === 0 && !hasActiveFilters ? (
        <p className="adm-veh__empty">Chưa có phương tiện trong hệ thống.</p>
      ) : null}

      {!loading && totalElements === 0 && hasActiveFilters ? (
        <p className="adm-veh__empty">
          Không có dòng nào khớp tìm kiếm hoặc bộ lọc. Đổi từ khóa hoặc nhấn «Xóa lọc».
        </p>
      ) : null}

      {content.length > 0 ? (
        <>
          <div className="adm-veh__scroll">
            <table className="adm-veh__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Biển số</th>
                <th>Xe</th>
                <th>Trạm</th>
                <th>Trạng thái</th>
                <th>Nhiên liệu</th>
                <th>Giá</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {content.map((v) => (
                <tr key={v.id}>
                  <td className="adm-veh__mono">{v.id}</td>
                  <td className="adm-veh__mono">{v.licensePlate}</td>
                  <td>{vehicleDisplayName(v)}</td>
                  <td>{stationName(v.stationId)}</td>
                  <td>
                    <span className="adm-veh__pill">{statusLabel(v.status)}</span>
                  </td>
                  <td>
                    <span className="adm-veh__pill" title="Loại nhiên liệu">
                      {fuelLabel(v.fuelType)}
                    </span>
                  </td>
                  <td>
                    <div>{formatDailyPrice(v)}</div>
                    <div className="adm-veh__cell-sub">{formatHourlyPrice(v)}</div>
                  </td>
                  <td>
                    <div className="adm-veh__row-actions">
                      <button
                        type="button"
                        className="adm-veh__link-btn"
                        onClick={() => openEdit(v)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="adm-veh__link-btn adm-veh__link-btn--danger"
                        onClick={() => {
                          setToast(null)
                          setDeleteId(v.id)
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
                ? '0 kết quả'
                : `Trang ${page + 1} / ${Math.max(totalPages, 1)} · ${totalElements} phương tiện`}
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
                disabled={page >= totalPages - 1 || loading || totalPages === 0}
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

      {modal ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) => ev.target === ev.currentTarget && closeModal()}
        >
          <div
            className="adm-veh__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-veh-modal-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-veh-modal-title">
                {modal === 'create' ? 'Thêm phương tiện' : 'Sửa phương tiện'}
              </h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            <form className="adm-veh__form" onSubmit={onSubmit}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}

              <div className="adm-veh__field">
                <label htmlFor="veh-station">Trạm / bãi *</label>
                <select
                  id="veh-station"
                  value={form.stationId}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, stationId: e.target.value }))
                  }
                  required
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {stationLabel(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="veh-plate">Biển số *</label>
                  <input
                    id="veh-plate"
                    value={form.licensePlate}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, licensePlate: e.target.value }))
                    }
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="veh-status">Trạng thái</label>
                  <select
                    id="veh-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, status: e.target.value }))
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="veh-brand">Hãng</label>
                  <input
                    id="veh-brand"
                    value={form.brand}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, brand: e.target.value }))
                    }
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="veh-name">Tên / dòng xe</label>
                  <input
                    id="veh-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="veh-fuel">Nhiên liệu</label>
                  <select
                    id="veh-fuel"
                    value={form.fuelType}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fuelType: e.target.value }))
                    }
                  >
                    {FUELS.map((f) => (
                      <option key={f} value={f}>
                        {f === 'GASOLINE' ? 'Xăng' : 'Điện'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="veh-cap">Số chỗ</label>
                  <input
                    id="veh-cap"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, capacity: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="veh-rate">Đánh giá (0–5)</label>
                  <input
                    id="veh-rate"
                    type="number"
                    step="0.1"
                    min={0}
                    value={form.rating}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, rating: e.target.value }))
                    }
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="veh-rent-count">Lượt thuê</label>
                  <input
                    id="veh-rent-count"
                    type="number"
                    min={0}
                    value={form.rentCount}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, rentCount: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="veh-hourly">Giá theo giờ (₫)</label>
                  <input
                    id="veh-hourly"
                    type="number"
                    min={0}
                    step="1000"
                    value={form.hourlyRate}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, hourlyRate: e.target.value }))
                    }
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="veh-daily">Giá theo ngày (₫)</label>
                  <input
                    id="veh-daily"
                    type="number"
                    min={0}
                    step="1000"
                    value={form.dailyRate}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, dailyRate: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-veh__field">
                <label htmlFor="veh-deposit">Tiền cọc (₫)</label>
                <input
                  id="veh-deposit"
                  type="number"
                  min={0}
                  step="1000"
                  value={form.depositAmount}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, depositAmount: e.target.value }))
                  }
                />
              </div>

              <div className="adm-veh__field">
                <label htmlFor="veh-photos">Ảnh (URL, mỗi dòng một link)</label>
                <textarea
                  id="veh-photos"
                  value={form.photosText}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, photosText: e.target.value }))
                  }
                />
              </div>

              <div className="adm-veh__field">
                <label htmlFor="veh-policies">Chính sách (mỗi dòng một mục)</label>
                <textarea
                  id="veh-policies"
                  value={form.policiesText}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, policiesText: e.target.value }))
                  }
                />
              </div>

              <div className="adm-veh__form-actions">
                <button
                  type="button"
                  className="adm-veh__btn adm-veh__btn--ghost"
                  onClick={closeModal}
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
            aria-modal="true"
            aria-labelledby="adm-veh-del-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-veh-del-title">Xóa xe?</h3>
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
                Hành động này không hoàn tác. Xóa xe có ID{' '}
                <strong>{deleteId}</strong>?
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
