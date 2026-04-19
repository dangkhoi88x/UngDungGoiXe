import {
  licenseVerificationLabel,
  type LicenseVerificationStatus,
} from '../api/users'
import './LicenseRequiredModal.css'

type Props = {
  open: boolean
  onDismiss: () => void
  currentStatus?: LicenseVerificationStatus | null
}

export default function LicenseRequiredModal({ open, onDismiss, currentStatus }: Props) {
  if (!open) return null

  const statusLine =
    currentStatus != null
      ? `Trạng thái GPLX: ${licenseVerificationLabel(currentStatus)}.`
      : 'Trạng thái GPLX: chưa có dữ liệu — vui lòng gửi hồ sơ trên trang tài khoản.'

  return (
    <div className="lr-backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="lr-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lr-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="lr-title" className="lr-title">
          Cần xác minh GPLX để thuê xe
        </h2>
        <p className="lr-text">{statusLine}</p>
        <p className="lr-text">
          Để tiếp tục thuê xe, hãy gửi đủ hồ sơ GPLX trên trang tài khoản và chờ duyệt; nếu bị từ chối, cập
          nhật và gửi lại.
        </p>
        <div className="lr-actions">
          <a className="lr-btn lr-btn--primary" href="/account">
            Đến trang tài khoản
          </a>
          <button type="button" className="lr-btn lr-btn--ghost" onClick={onDismiss}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
