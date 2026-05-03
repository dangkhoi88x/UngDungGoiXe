import './VehiclePhotoUpload.css'
import { useCallback, useId, useState } from 'react'
import {
  fetchVehicleById,
  MAX_VEHICLE_PHOTO_UPLOAD_BYTES,
  type VehicleDto,
  uploadVehiclePhoto,
  validateVehiclePhotoFileClient,
} from '../api/vehicles'

type Props = {
  vehicleId: number
  /** Sau upload + tải lại chi tiết xe từ API */
  onVehicleRefreshed?: (vehicle: VehicleDto) => void
  /** Chỉ báo URL mới (không gọi fetchVehicleById) */
  onUploadedUrl?: (url: string) => void
  variant?: 'admin' | 'owner'
}

export default function VehiclePhotoUpload({
  vehicleId,
  onVehicleRefreshed,
  onUploadedUrl,
  variant = 'owner',
}: Props) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null)

  const pickAndUpload = useCallback(
    async (file: File | undefined) => {
      setLocalError(null)
      setLastPreviewUrl(null)
      if (!file) return

      const err = validateVehiclePhotoFileClient(file)
      if (err) {
        setLocalError(err)
        return
      }

      setBusy(true)
      try {
        const url = await uploadVehiclePhoto(vehicleId, file)
        setLastPreviewUrl(url)
        onUploadedUrl?.(url)

        if (onVehicleRefreshed) {
          const fresh = await fetchVehicleById(vehicleId)
          onVehicleRefreshed(fresh)
        }
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Tải ảnh thất bại.')
      } finally {
        setBusy(false)
      }
    },
    [vehicleId, onUploadedUrl, onVehicleRefreshed],
  )

  const admin = variant === 'admin'

  return (
    <div className={admin ? 'veh-photo-up veh-photo-up--admin' : 'veh-photo-up'}>
      <div className="veh-photo-up__row">
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="veh-photo-up__input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            void pickAndUpload(f)
            e.target.value = ''
          }}
        />
        <label htmlFor={inputId} className="veh-photo-up__label">
          {busy ? 'Đang tải lên…' : admin ? 'Chọn ảnh (Cloudinary)' : 'Thêm ảnh xe'}
        </label>
      </div>
      <p className="veh-photo-up__hint">
        JPEG, PNG, WebP · tối đa ~{(MAX_VEHICLE_PHOTO_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}{' '}
        MB (khớp cấu hình server).
      </p>
      {localError ? (
        <p className="veh-photo-up__err" role="alert">
          {localError}
        </p>
      ) : null}
      {lastPreviewUrl ? (
        <div className="veh-photo-up__preview">
          <span className="veh-photo-up__preview-label">Vừa tải:</span>
          <img src={lastPreviewUrl} alt="" className="veh-photo-up__preview-img" />
        </div>
      ) : null}
    </div>
  )
}
