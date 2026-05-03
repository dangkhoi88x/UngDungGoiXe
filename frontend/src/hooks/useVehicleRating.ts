import { useEffect, useState } from 'react'
import { fetchVehicleById } from '../api/vehicles'

/** Đọc `Vehicle.rating` (trung bình từ feedback khách) — API xe công khai. */
export function useVehicleRating(vehicleId: number | null | undefined): {
  loading: boolean
  rating: number | null
} {
  const [loading, setLoading] = useState(() =>
    vehicleId != null && vehicleId > 0,
  )
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    if (vehicleId == null || vehicleId <= 0) {
      setLoading(false)
      setRating(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchVehicleById(vehicleId)
      .then((v) => {
        if (!cancelled) setRating(v.rating != null && v.rating > 0 ? v.rating : null)
      })
      .catch(() => {
        if (!cancelled) setRating(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vehicleId])

  return { loading, rating }
}
