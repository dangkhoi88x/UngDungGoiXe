import { useCallback, useEffect, useState } from 'react'
import {
  fetchMyBookingVehicleFeedback,
  MAX_BOOKING_FEEDBACK_PHOTOS,
  submitBookingVehicleFeedback,
  uploadBookingFeedbackPhoto,
  type BookingDto,
  type BookingVehicleFeedbackDto,
} from '../api/bookings'
import { validateVehiclePhotoFileClient } from '../api/vehicles'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

import './BookingReviewModal.css'

function formatRatingStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return `${'★'.repeat(full)}${half ? '½' : ''}${'☆'.repeat(empty)}`
}

type Props = {
  open: boolean
  booking: BookingDto | null
  onClose: () => void
  /** Gọi sau khi gửi đánh giá thành công (truyền `bookingId`). */
  onSubmitted?: (bookingId: number) => void
}

export function BookingReviewModal({ open, booking, onClose, onSubmitted }: Props) {
  const bookingId = booking?.id
  const vehicleLabel = booking?.vehicleName ?? 'Xe'

  const [loading, setLoading] = useState(false)
  const [existing, setExisting] = useState<BookingVehicleFeedbackDto | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setRating(5)
    setComment('')
    setPhotoUrls([])
    setSubmitError(null)
    setExisting(null)
  }, [])

  useEffect(() => {
    if (!open || bookingId == null) return
    let cancelled = false
    resetForm()
    setLoading(true)
    fetchMyBookingVehicleFeedback(bookingId)
      .then((data) => {
        if (cancelled) return
        setExisting(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setSubmitError(e instanceof Error ? e.message : 'Không tải được đánh giá.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, bookingId, resetForm])

  useEscapeToClose(open && !submitting && !uploading, onClose)

  const handlePhotosChange = async (files: FileList | null) => {
    if (!bookingId || !files?.length) return
    const next = [...photoUrls]
    const remaining = MAX_BOOKING_FEEDBACK_PHOTOS - next.length
    if (remaining <= 0) return

    setSubmitError(null)
    const arr = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      for (const file of arr) {
        const clientErr = validateVehiclePhotoFileClient(file)
        if (clientErr) throw new Error(clientErr)
        const url = await uploadBookingFeedbackPhoto(bookingId, file)
        next.push(url)
      }
      setPhotoUrls(next)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Upload ảnh thất bại.')
    } finally {
      setUploading(false)
    }
  }

  const removePhotoAt = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingId || existing) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await submitBookingVehicleFeedback(bookingId, {
        vehicleRating: rating,
        comment: comment.trim() || null,
        photoUrls: photoUrls.length ? photoUrls : undefined,
      })
      const refreshed = await fetchMyBookingVehicleFeedback(bookingId)
      setExisting(refreshed)
      onSubmitted?.(bookingId)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Gửi đánh giá thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !booking) return null

  const readonly = Boolean(existing)

  return (
    <div className="brv-overlay" role="presentation" onMouseDown={(ev) => ev.target === ev.currentTarget && !submitting && !uploading && onClose()}>
      <div className="brv-modal" role="dialog" aria-labelledby="brv-title" aria-modal="true">
        <div className="brv-modal__head">
          <h2 id="brv-title">{readonly ? 'Đánh giá của bạn' : 'Đánh giá chuyến đi'}</h2>
          <button type="button" className="brv-close" onClick={onClose} disabled={submitting || uploading} aria-label="Đóng">
            ×
          </button>
        </div>
        <p className="brv-sub">{vehicleLabel}</p>

        {loading ? (
          <p className="brv-muted">Đang tải…</p>
        ) : readonly && existing ? (
          <div className="brv-readonly">
            <div className="brv-stars-display" title={`${existing.vehicleRating}`}>
              {formatRatingStars(existing.vehicleRating)}
              <span className="brv-rating-num">{existing.vehicleRating}</span>
            </div>
            {existing.comment ? <p className="brv-comment">{existing.comment}</p> : <p className="brv-muted">Không có nhận xét.</p>}
            {existing.photoUrls?.length ? (
              <ul className="brv-photo-grid">
                {existing.photoUrls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" loading="lazy" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <form className="brv-form" onSubmit={handleSubmit}>
            <label className="brv-label" htmlFor="brv-rating-range">
              Sao cho xe (1–5, bước 0.5)
            </label>
            <div className="brv-rating-row">
              <input
                id="brv-rating-range"
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={rating}
                onChange={(ev) => setRating(Number(ev.target.value))}
              />
              <span className="brv-rating-value">{rating}</span>
            </div>
            <label className="brv-label" htmlFor="brv-comment">
              Nhận xét (tuỳ chọn)
            </label>
            <textarea
              id="brv-comment"
              className="brv-textarea"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(ev) => setComment(ev.target.value)}
              placeholder="Chia sẻ trải nghiệm với xe..."
            />
            <label className="brv-label" htmlFor="brv-photos">
              Ảnh (tuỳ chọn, tối đa {MAX_BOOKING_FEEDBACK_PHOTOS})
            </label>
            <input
              id="brv-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading || photoUrls.length >= MAX_BOOKING_FEEDBACK_PHOTOS}
              onChange={(ev) => void handlePhotosChange(ev.target.files)}
            />
            {photoUrls.length ? (
              <ul className="brv-thumb-row">
                {photoUrls.map((url, idx) => (
                  <li key={url}>
                    <img src={url} alt="" />
                    <button type="button" className="brv-thumb-remove" onClick={() => removePhotoAt(idx)} aria-label="Xóa ảnh">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {submitError ? <p className="brv-error">{submitError}</p> : null}
            <div className="brv-actions">
              <button type="button" className="brv-btn brv-btn--ghost" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="brv-btn brv-btn--primary" disabled={submitting || uploading}>
                {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
