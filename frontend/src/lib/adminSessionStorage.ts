const PREFIX = 'ungdunggoixe.admin:v1:'

export const ADMIN_SESSION_KEYS = {
  users: 'users.filters',
  vehicles: 'vehicles.filters',
  stations: 'stations.filters',
  bookings: 'bookings.filters',
  ownerVehicleRequests: 'ownerVehicleRequests.filters',
  blogPosts: 'blogPosts.filters',
} as const

export function readAdminSession<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
): T {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<T>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function writeAdminSession(key: string, value: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

export function clampAdminPageSize(n: unknown): number {
  const s = Number(n)
  return [5, 10, 20, 50].includes(s) ? s : 10
}
