import { authFetch } from './authFetch'
import { unwrapApiData } from './apiResponse'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type AdminOverviewStatsDto = {
  bookingsToday: number
  ongoingBookings: number
  availableVehicles: number
  revenueThisMonth: number | string
  newUsersLast7Days: number
}

export type DailyMetricDto = {
  date: string
  value: number
}

export type StatusMetricDto = {
  status: string
  count: number
}

export type TopVehicleMetricDto = {
  vehicleId: number | null
  vehicleName: string | null
  licensePlate: string | null
  rentCount: number
  revenue: number | string
}

export type AdminDashboardChartsDto = {
  bookingsLast7Days: DailyMetricDto[]
  revenueLast7Days: DailyMetricDto[]
  bookingStatusBreakdown: StatusMetricDto[]
  vehicleStatusBreakdown: StatusMetricDto[]
  topVehiclesByRentCount: TopVehicleMetricDto[]
  topVehiclesByRevenue: TopVehicleMetricDto[]
}

export async function fetchAdminOverviewStats(): Promise<AdminOverviewStatsDto> {
  const res = await authFetch(`${API_BASE}/admin/dashboard/overview-stats`)
  if (!res.ok) throw new Error('Không tải được thống kê tổng quan admin.')
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<AdminOverviewStatsDto>(payload)
  if (!data) throw new Error('Phản hồi thống kê tổng quan không hợp lệ.')
  return data
}

export async function fetchAdminDashboardCharts(): Promise<AdminDashboardChartsDto> {
  const res = await authFetch(`${API_BASE}/admin/dashboard/charts`)
  if (!res.ok) throw new Error('Không tải được dữ liệu biểu đồ admin.')
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<AdminDashboardChartsDto>(payload)
  if (!data) throw new Error('Phản hồi dữ liệu biểu đồ không hợp lệ.')
  return data
}
