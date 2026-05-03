import { useVehicleRating } from '../hooks/useVehicleRating'
import '../pages/OwnerMyVehicleRequestsPage.css'

type Props = {
  vehicleId: number
  loading?: boolean
  /** Điểm TB từ API xe (null = chưa có hoặc 0). */
  rating: number | null
}

/** Owner xem điểm TB và link sang trang xe — chỉ đọc đánh giá khách (anchor `#vd-feedback-title`). */
export function OwnerVehicleRatingSummary({ vehicleId, loading = false, rating }: Props) {
  const href = `/rent/${vehicleId}#vd-feedback-title`

  if (loading) {
    return (
      <div className="owmr-rating-summary">
        <p className="owmr-muted">Đang tải điểm đánh giá…</p>
      </div>
    )
  }

  const hasRating = rating != null && rating > 0

  return (
    <div className="owmr-rating-summary">
      {hasRating ? (
        <p className="owmr-rating-summary__score">
          ⭐ Trung bình: <strong>{rating.toFixed(1)}</strong> / 5{' '}
          <span className="owmr-muted">(từ khách sau chuyến)</span>
        </p>
      ) : (
        <p className="owmr-muted">Chưa có đánh giá từ khách.</p>
      )}
      <a className="owmr-link owmr-rating-summary__link" href={href}>
        Xem đánh giá trên trang xe (chỉ đọc) →
      </a>
    </div>
  )
}

/** Gọi API xe để lấy điểm TB — dùng trang chi tiết / lịch sử booking (một xe). */
export function OwnerVehicleRatingLive({ vehicleId }: { vehicleId: number }) {
  const { loading, rating } = useVehicleRating(vehicleId)
  return (
    <OwnerVehicleRatingSummary vehicleId={vehicleId} loading={loading} rating={rating} />
  )
}
