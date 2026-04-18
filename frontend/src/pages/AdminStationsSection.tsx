import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import {
  ADMIN_SESSION_KEYS,
  clampAdminPageSize,
  readAdminSession,
  writeAdminSession,
} from '../lib/adminSessionStorage'
import {
  createStation,
  deleteStation,
  fetchStationsPage,
  stationLabel,
  stationTimeFromInput,
  stationTimeToInput,
  type PagedStationsResponse,
  type StationDto,
  type StationCreatePayload,
  type StationUpdatePayload,
  updateStation,
} from '../api/stations'
import './AdminVehiclesSection.css'

const STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

const STATION_SORT_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Tên trạm' },
  { value: 'address', label: 'Địa chỉ' },
  { value: 'hotline', label: 'Hotline' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'rating', label: 'Đánh giá' },
  { value: 'createdAt', label: 'Ngày tạo' },
] as const

type FormState = {
  name: string
  address: string
  hotline: string
  photo: string
  startTime: string
  endTime: string
  status: string
}

function emptyForm(): FormState {
  return {
    name: '',
    address: '',
    hotline: '',
    photo: '',
    startTime: '',
    endTime: '',
    status: 'ACTIVE',
  }
}

function stationToForm(s: StationDto): FormState {
  return {
    name: s.name ?? '',
    address: s.address ?? '',
    hotline: s.hotline ?? '',
    photo: s.photo ?? '',
    startTime: stationTimeToInput(s.startTime ?? undefined),
    endTime: stationTimeToInput(s.endTime ?? undefined),
    status: s.status || 'ACTIVE',
  }
}

function statusLabel(st: string): string {
  const m: Record<string, string> = {
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Ngưng',
    MAINTENANCE: 'Bảo trì',
  }
  return m[st] || st
}

type Props = {
  refreshKey?: number
}

function parseStationsFilterStatus(
  v: unknown,
): 'ALL' | (typeof STATUSES)[number] {
  if (v === 'ALL') return 'ALL'
  if (typeof v === 'string' && (STATUSES as readonly string[]).includes(v)) {
    return v as (typeof STATUSES)[number]
  }
  return 'ALL'
}

const STATION_SORT_VALUES = new Set(
  STATION_SORT_OPTIONS.map((o) => o.value as string),
)

function parseStationSortBy(v: unknown): string {
  return typeof v === 'string' && STATION_SORT_VALUES.has(v) ? v : 'id'
}

function initialStationsFilters() {
  const d = readAdminSession(ADMIN_SESSION_KEYS.stations, {
    filterKeyword: '',
    filterStatus: 'ALL' as 'ALL' | (typeof STATUSES)[number],
    page: 0,
    size: 10,
    sortBy: 'id',
    sortDir: 'desc' as 'asc' | 'desc',
  })
  return {
    filterKeyword: typeof d.filterKeyword === 'string' ? d.filterKeyword : '',
    filterStatus: parseStationsFilterStatus(d.filterStatus),
    page: Math.max(
      0,
      Number.isFinite(Number(d.page)) ? Math.trunc(Number(d.page)) : 0,
    ),
    size: clampAdminPageSize(d.size),
    sortBy: parseStationSortBy(d.sortBy),
    sortDir: d.sortDir === 'asc' ? ('asc' as const) : ('desc' as const),
  }
}

export default function AdminStationsSection({ refreshKey = 0 }: Props) {
  const initialFilters = useMemo(() => initialStationsFilters(), [])
  const [filterKeyword, setFilterKeyword] = useState(initialFilters.filterKeyword)
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | (typeof STATUSES)[number]
  >(initialFilters.filterStatus)
  const [page, setPage] = useState(initialFilters.page)
  const [size, setSize] = useState(initialFilters.size)
  const [sortBy, setSortBy] = useState<string>(initialFilters.sortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialFilters.sortDir)
  const [data, setData] = useState<PagedStationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadStations = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchStationsPage({
        page,
        size,
        sortBy,
        sortDir,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
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
        e instanceof Error ? e.message : 'Không tải được danh sách trạm.',
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, size, sortBy, sortDir, filterKeyword, filterStatus])

  useEffect(() => {
    void loadStations()
  }, [loadStations, refreshKey])

  useEffect(() => {
    writeAdminSession(ADMIN_SESSION_KEYS.stations, {
      filterKeyword,
      filterStatus,
      page,
      size,
      sortBy,
      sortDir,
    })
  }, [filterKeyword, filterStatus, page, size, sortBy, sortDir])

  useEffect(() => {
    setPage(0)
  }, [filterKeyword, filterStatus])

  const content = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  const hasActiveFilters =
    filterKeyword.trim() !== '' || filterStatus !== 'ALL'

  const openCreate = () => {
    setToast(null)
    setForm(emptyForm())
    setEditingId(null)
    setModal('create')
  }

  const openEdit = (s: StationDto) => {
    setToast(null)
    setForm(stationToForm(s))
    setEditingId(s.id)
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
    const name = form.name.trim()
    const address = form.address.trim()
    if (!name) {
      setToast('Tên trạm không được để trống.')
      return
    }
    if (!address) {
      setToast('Địa chỉ không được để trống.')
      return
    }

    const startT = stationTimeFromInput(form.startTime)
    const endT = stationTimeFromInput(form.endTime)
    const hotline = form.hotline.trim() || null
    const photo = form.photo.trim() || null

    setSaving(true)
    try {
      if (modal === 'create') {
        const body: StationCreatePayload = {
          name,
          address,
          hotline,
          photo,
          startTime: startT,
          endTime: endT,
        }
        await createStation(body)
        setToast('Đã thêm trạm.')
      } else if (modal === 'edit' && editingId != null) {
        const body: StationUpdatePayload = {
          name,
          address,
          hotline,
          photo,
          status: form.status || null,
          startTime: startT,
          endTime: endT,
        }
        await updateStation(editingId, body)
        setToast('Đã cập nhật trạm.')
      }
      closeModal()
      await loadStations()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivate = async () => {
    if (deleteId == null) return
    setDeleting(true)
    setToast(null)
    try {
      await deleteStation(deleteId)
      setToast('Trạm đã chuyển sang trạng thái ngưng hoạt động.')
      setDeleteId(null)
      await loadStations()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Thao tác thất bại')
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
      className="adm-veh adm-users-section adm-stations-section"
      aria-labelledby="adm-sta-title"
    >
      <div className="adm-veh__toolbar">
        <h2 id="adm-sta-title">Trạm &amp; bãi xe</h2>
        <div className="adm-veh__actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => void loadStations()}
            disabled={loading}
          >
            Tải lại
          </button>
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--primary"
            onClick={openCreate}
          >
            + Thêm trạm
          </button>
        </div>
      </div>

      <div className="adm-users__filters" aria-label="Bộ lọc trạm">
        <div className="adm-users__search-field">
          <label className="adm-users__filter-label" htmlFor="sta-filter-keyword">
            Từ khóa
          </label>
          <input
            id="sta-filter-keyword"
            type="search"
            className="adm-users__search-input"
            placeholder="Tên trạm, địa chỉ, hotline, ID…"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="adm-users__filter-label" htmlFor="sta-filter-status">
            Trạng thái
          </label>
          <select
            id="sta-filter-status"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(
                e.target.value as 'ALL' | (typeof STATUSES)[number],
              )
            }
          >
            <option value="ALL">Tất cả</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {statusLabel(st)}
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
            {STATION_SORT_OPTIONS.map((o) => (
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

      {loading && content.length === 0 ? (
        <div className="adm-veh__loading">Đang tải danh sách trạm…</div>
      ) : null}

      {!loading && !error && totalElements === 0 && !hasActiveFilters ? (
        <p className="adm-veh__empty">Chưa có trạm trong hệ thống.</p>
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
                <th>Tên trạm</th>
                <th>Địa chỉ</th>
                <th>Hotline</th>
                <th>Giờ mở — đóng</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {content.map((s) => (
                <tr key={s.id}>
                  <td className="adm-veh__mono">{s.id}</td>
                  <td>{stationLabel(s)}</td>
                  <td>{s.address ?? '—'}</td>
                  <td>{s.hotline ?? '—'}</td>
                  <td className="adm-veh__mono">
                    {[
                      stationTimeToInput(s.startTime ?? undefined),
                      stationTimeToInput(s.endTime ?? undefined),
                    ]
                      .filter(Boolean)
                      .join(' — ') || '—'}
                  </td>
                  <td>
                    <span className="adm-veh__pill" title="Trạng thái trạm">
                      {statusLabel(s.status || '')}
                    </span>
                  </td>
                  <td>
                    <div className="adm-veh__row-actions">
                      <button
                        type="button"
                        className="adm-veh__link-btn"
                        onClick={() => openEdit(s)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="adm-veh__link-btn adm-veh__link-btn--danger"
                        onClick={() => {
                          setToast(null)
                          setDeleteId(s.id)
                        }}
                        disabled={s.status === 'INACTIVE'}
                        title={
                          s.status === 'INACTIVE'
                            ? 'Trạm đã ngưng hoạt động'
                            : 'Đặt trạng thái ngưng (soft delete)'
                        }
                      >
                        Ngưng
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
                : `Trang ${page + 1} / ${Math.max(totalPages, 1)} · ${totalElements} trạm`}
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
            aria-labelledby="adm-sta-modal-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-sta-modal-title">
                {modal === 'create' ? 'Thêm trạm / bãi' : 'Sửa trạm / bãi'}
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
                <label htmlFor="sta-name">Tên trạm *</label>
                <input
                  id="sta-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="adm-veh__field">
                <label htmlFor="sta-address">Địa chỉ *</label>
                <input
                  id="sta-address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, address: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="sta-hotline">Hotline</label>
                  <input
                    id="sta-hotline"
                    value={form.hotline}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, hotline: e.target.value }))
                    }
                  />
                </div>
                {modal === 'edit' ? (
                  <div className="adm-veh__field">
                    <label htmlFor="sta-status">Trạng thái</label>
                    <select
                      id="sta-status"
                      value={form.status}
                      onChange={(e) =>
                        setForm((x) => ({ ...x, status: e.target.value }))
                      }
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {statusLabel(st)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="sta-open">Giờ mở cửa</label>
                  <input
                    id="sta-open"
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, startTime: e.target.value }))
                    }
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="sta-close">Giờ đóng cửa</label>
                  <input
                    id="sta-close"
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, endTime: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-veh__field">
                <label htmlFor="sta-photo">Ảnh (URL)</label>
                <input
                  id="sta-photo"
                  type="url"
                  placeholder="https://..."
                  value={form.photo}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, photo: e.target.value }))
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
            style={{ maxWidth: 420 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-sta-del-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-sta-del-title">Ngưng hoạt động trạm?</h3>
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
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Trạm <strong>#{deleteId}</strong> sẽ chuyển sang trạng thái{' '}
                <strong>Ngưng</strong> (soft delete). Xe gắn trạm vẫn giữ liên
                kết; bạn có thể bật lại bằng Sửa → Hoạt động.
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
                  onClick={() => void confirmDeactivate()}
                  disabled={deleting}
                >
                  {deleting ? 'Đang xử lý…' : 'Xác nhận ngưng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
