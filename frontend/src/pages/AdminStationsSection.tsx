import { useCallback, useEffect, useState } from 'react'
import {
  createStation,
  deleteStation,
  fetchStations,
  stationLabel,
  stationTimeFromInput,
  stationTimeToInput,
  type StationDto,
  type StationCreatePayload,
  type StationUpdatePayload,
  updateStation,
} from '../api/stations'
import './AdminVehiclesSection.css'

const STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

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

export default function AdminStationsSection({ refreshKey = 0 }: Props) {
  const [stations, setStations] = useState<StationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await fetchStations()
      setStations(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách trạm')
      setStations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll, refreshKey])

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
      await loadAll()
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
      await loadAll()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Thao tác thất bại')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && stations.length === 0) {
    return (
      <section className="adm-veh" aria-busy="true">
        <div className="adm-veh__loading">Đang tải danh sách trạm…</div>
      </section>
    )
  }

  return (
    <section className="adm-veh" aria-labelledby="adm-sta-title">
      <div className="adm-veh__toolbar">
        <h2 id="adm-sta-title">Trạm &amp; bãi xe</h2>
        <div className="adm-veh__actions">
          <button
            type="button"
            className="adm-veh__btn adm-veh__btn--ghost"
            onClick={() => void loadAll()}
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

      {stations.length === 0 && !loading ? (
        <p className="adm-veh__empty">Chưa có trạm. Nhấn «Thêm trạm» để tạo mới.</p>
      ) : null}

      {stations.length > 0 ? (
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
              {stations.map((s) => (
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
                    <span className="adm-veh__pill">
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
