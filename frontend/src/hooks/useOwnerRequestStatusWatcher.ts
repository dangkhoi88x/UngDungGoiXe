import { useCallback, useEffect, useRef } from 'react'
import {
  fetchMyOwnerVehicleRequests,
  type OwnerVehicleRequestDto,
  type OwnerVehicleRequestStatus,
} from '../api/ownerVehicleRequests'

export type OwnerRequestStatusChange = {
  id: number
  previousStatus: OwnerVehicleRequestStatus
  status: OwnerVehicleRequestStatus
}

type UseOwnerRequestStatusWatcherOptions = {
  intervalMs?: number
  enabled?: boolean
  onData?: (list: OwnerVehicleRequestDto[]) => void
  onStatusChanged?: (changes: OwnerRequestStatusChange[], list: OwnerVehicleRequestDto[]) => void
  onError?: (error: unknown) => void
}

export function useOwnerRequestStatusWatcher(options: UseOwnerRequestStatusWatcherOptions = {}) {
  const {
    intervalMs = 60_000,
    enabled = true,
    onData,
    onStatusChanged,
    onError,
  } = options
  const prevStatusMapRef = useRef<Map<number, OwnerVehicleRequestStatus>>(new Map())
  const initializedRef = useRef(false)

  const sync = useCallback(
    async (detectStatusChange: boolean) => {
      if (!enabled || !localStorage.getItem('accessToken')) return
      try {
        const list = await fetchMyOwnerVehicleRequests()
        onData?.(list)

        if (detectStatusChange && initializedRef.current) {
          const prev = prevStatusMapRef.current
          const changes: OwnerRequestStatusChange[] = []
          for (const item of list) {
            const oldStatus = prev.get(item.id)
            if (oldStatus && oldStatus !== item.status) {
              changes.push({
                id: item.id,
                previousStatus: oldStatus,
                status: item.status,
              })
            }
          }
          if (changes.length > 0) onStatusChanged?.(changes, list)
        }

        prevStatusMapRef.current = new Map(list.map((item) => [item.id, item.status]))
        initializedRef.current = true
      } catch (error) {
        onError?.(error)
      }
    },
    [enabled, onData, onError, onStatusChanged],
  )

  useEffect(() => {
    if (!enabled) return
    void sync(false)

    const pollId = window.setInterval(() => {
      void sync(true)
    }, intervalMs)

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void sync(true)
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      window.clearInterval(pollId)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [enabled, intervalMs, sync])

  return {
    refresh: useCallback(async () => sync(true), [sync]),
    refreshSnapshot: useCallback(async () => sync(false), [sync]),
  }
}
