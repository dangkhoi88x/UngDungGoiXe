import { useCallback, useEffect, useState } from 'react'
import {
  createUser,
  deleteUser,
  fetchUsersPage,
  type PagedUsersResponse,
  type UserDto,
  type UserCreatePayload,
  type UserUpdatePayload,
  updateUser,
  userDisplayName,
} from '../api/users'
import './AdminVehiclesSection.css'

const SORT_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'Tên' },
  { value: 'lastName', label: 'Họ' },
] as const

type FormCreate = {
  email: string
  password: string
  firstName: string
  lastName: string
}

type FormEdit = {
  email: string
  firstName: string
  lastName: string
  password: string
  licenseVerified: boolean
}

function emptyCreate(): FormCreate {
  return { email: '', password: '', firstName: '', lastName: '' }
}

function userToEditForm(u: UserDto): FormEdit {
  return {
    email: u.email ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    password: '',
    licenseVerified: u.isLicenseVerified === true,
  }
}

type Props = {
  refreshKey?: number
}

export default function AdminUsersSection({ refreshKey = 0 }: Props) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [data, setData] = useState<PagedUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formCreate, setFormCreate] = useState<FormCreate>(emptyCreate)
  const [formEdit, setFormEdit] = useState<FormEdit>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    licenseVerified: false,
  })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchUsersPage({ page, size, sortBy, sortDir })
      setData(res)
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(Math.max(0, res.totalPages - 1))
      } else if (res.totalPages === 0) {
        setPage(0)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, size, sortBy, sortDir])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const openCreate = () => {
    setToast(null)
    setFormCreate(emptyCreate())
    setModal('create')
  }

  const openEdit = (u: UserDto) => {
    setToast(null)
    setFormEdit(userToEditForm(u))
    setEditingId(u.id)
    setModal('edit')
  }

  const closeModal = () => {
    if (saving) return
    setModal(null)
    setEditingId(null)
  }

  const onSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    const email = formCreate.email.trim()
    const password = formCreate.password
    const firstName = formCreate.firstName.trim()
    const lastName = formCreate.lastName.trim()
    if (!email || !password || !firstName || !lastName) {
      setToast('Điền đủ email, mật khẩu, tên và họ.')
      return
    }
    setSaving(true)
    try {
      const body: UserCreatePayload = { email, password, firstName, lastName }
      await createUser(body)
      setToast('Đã tạo người dùng.')
      closeModal()
      setPage(0)
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setSaving(false)
    }
  }

  const onSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    if (editingId == null) return
    const email = formEdit.email.trim()
    const firstName = formEdit.firstName.trim()
    const lastName = formEdit.lastName.trim()
    if (!email || !firstName || !lastName) {
      setToast('Email, tên và họ không được để trống.')
      return
    }
    const body: UserUpdatePayload = {
      email,
      firstName,
      lastName,
      password: formEdit.password.trim() || null,
      isLicenseVerified: formEdit.licenseVerified,
    }
    setSaving(true)
    try {
      await updateUser(editingId, body)
      setToast('Đã cập nhật người dùng.')
      closeModal()
      await load()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    setDeleting(true)
    setToast(null)
    try {
      await deleteUser(deleteId)
      setToast('Đã xóa người dùng.')
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
    <section className="adm-veh" aria-labelledby="adm-users-title">
      <div className="adm-veh__toolbar">
        <h2 id="adm-users-title">Người dùng</h2>
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
          >
            + Thêm người dùng
          </button>
        </div>
      </div>

      <div className="adm-users__filters">
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
      {toast && !modal && !deleteId ? (
        <p className="adm-veh__msg adm-veh__msg--ok" role="status">
          {toast}
        </p>
      ) : null}

      {loading && content.length === 0 ? (
        <div className="adm-veh__loading">Đang tải…</div>
      ) : null}

      {!loading && content.length === 0 ? (
        <p className="adm-veh__empty">Không có người dùng trên trang này.</p>
      ) : null}

      {content.length > 0 ? (
        <>
          <div className="adm-veh__scroll">
            <table className="adm-veh__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {content.map((u) => (
                  <tr key={u.id}>
                    <td className="adm-veh__mono">{u.id}</td>
                    <td>{userDisplayName(u)}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="adm-veh__pill">
                        {(u.roles ?? []).join(', ') || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="adm-veh__row-actions">
                        <button
                          type="button"
                          className="adm-veh__link-btn"
                          onClick={() => openEdit(u)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="adm-veh__link-btn adm-veh__link-btn--danger"
                          onClick={() => {
                            setToast(null)
                            setDeleteId(u.id)
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
                : `Trang ${page + 1} / ${Math.max(totalPages, 1)} · ${totalElements} người dùng`}
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

      {modal === 'create' ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) => ev.target === ev.currentTarget && closeModal()}
        >
          <div
            className="adm-veh__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-user-create-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-user-create-title">Thêm người dùng</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            <form className="adm-veh__form" onSubmit={onSubmitCreate}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <div className="adm-veh__field">
                <label htmlFor="u-email">Email *</label>
                <input
                  id="u-email"
                  type="email"
                  autoComplete="off"
                  value={formCreate.email}
                  onChange={(e) =>
                    setFormCreate((s) => ({ ...s, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="adm-veh__field">
                <label htmlFor="u-pass">Mật khẩu *</label>
                <input
                  id="u-pass"
                  type="password"
                  autoComplete="new-password"
                  value={formCreate.password}
                  onChange={(e) =>
                    setFormCreate((s) => ({ ...s, password: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="u-fn">Tên *</label>
                  <input
                    id="u-fn"
                    value={formCreate.firstName}
                    onChange={(e) =>
                      setFormCreate((s) => ({ ...s, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="u-ln">Họ *</label>
                  <input
                    id="u-ln"
                    value={formCreate.lastName}
                    onChange={(e) =>
                      setFormCreate((s) => ({ ...s, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <p className="adm-veh__field--hint">
                Vai trò mặc định do backend gán (thường là USER).
              </p>
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
                  {saving ? 'Đang lưu…' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modal === 'edit' ? (
        <div
          className="adm-veh__overlay"
          role="presentation"
          onClick={(ev) => ev.target === ev.currentTarget && closeModal()}
        >
          <div
            className="adm-veh__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-user-edit-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-user-edit-title">Sửa người dùng #{editingId}</h3>
              <button
                type="button"
                className="adm-veh__modal-close"
                aria-label="Đóng"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            <form className="adm-veh__form" onSubmit={onSubmitEdit}>
              {toast ? (
                <p className="adm-veh__msg adm-veh__msg--err" role="alert">
                  {toast}
                </p>
              ) : null}
              <div className="adm-veh__field">
                <label htmlFor="ue-email">Email *</label>
                <input
                  id="ue-email"
                  type="email"
                  value={formEdit.email}
                  onChange={(e) =>
                    setFormEdit((s) => ({ ...s, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="adm-veh__form-row2">
                <div className="adm-veh__field">
                  <label htmlFor="ue-fn">Tên *</label>
                  <input
                    id="ue-fn"
                    value={formEdit.firstName}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="adm-veh__field">
                  <label htmlFor="ue-ln">Họ *</label>
                  <input
                    id="ue-ln"
                    value={formEdit.lastName}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="adm-veh__field">
                <label htmlFor="ue-pass">Mật khẩu mới (để trống nếu giữ nguyên)</label>
                <input
                  id="ue-pass"
                  type="password"
                  autoComplete="new-password"
                  value={formEdit.password}
                  onChange={(e) =>
                    setFormEdit((s) => ({ ...s, password: e.target.value }))
                  }
                />
              </div>
              <div className="adm-veh__field adm-veh__field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formEdit.licenseVerified}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, licenseVerified: e.target.checked }))
                    }
                  />{' '}
                  GPLX đã xác minh (duyệt hồ sơ người dùng)
                </label>
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
            aria-labelledby="adm-user-del-title"
          >
            <div className="adm-veh__modal-head">
              <h3 id="adm-user-del-title">Xóa người dùng?</h3>
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
                Xóa vĩnh viễn tài khoản <strong>#{deleteId}</strong>? Có thể lỗi
                nếu còn dữ liệu liên quan (đặt xe, v.v.).
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
