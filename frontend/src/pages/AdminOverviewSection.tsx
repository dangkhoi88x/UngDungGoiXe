/**
 * AdminOverviewSection — Dashboard analytics tổng quan
 *
 * Bao gồm:
 * - 5 KPI cards (animated counter, trend badge)
 * - Line chart doanh thu 12 tháng (SVG gradient fill)
 * - Bar chart booking 7 ngày gần đây
 * - 2 Donut charts (booking status, vehicle status)
 * - Top 5 xe lượt thuê (horizontal bar chart)
 * - Top 5 xe doanh thu (horizontal bar chart)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchAdminDashboardCharts,
  fetchAdminOverviewStats,
  type AdminDashboardChartsDto,
  type AdminOverviewStatsDto,
  type DailyMetricDto,
  type StatusMetricDto,
  type TopVehicleMetricDto,
} from '../api/adminDashboard'
import './AdminOverviewSection.css'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function toNum(v: number | string | null | undefined): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmtMoney(v: number | string | null | undefined): string {
  const n = toNum(v)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ₫`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₫`
  return `${n.toLocaleString('vi-VN')} ₫`
}

function fmtMonthLabel(isoDate: string): string {
  const d = new Date(isoDate)
  if (!Number.isFinite(d.getTime())) return isoDate.slice(0, 7)
  return d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
}

function fmtShortDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (!Number.isFinite(d.getTime())) return isoDate
  return d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })
}

const BOOKING_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ xác nhận', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận',  color: '#2563eb' },
  ONGOING:   { label: 'Đang thuê',    color: '#7c3aed' },
  COMPLETED: { label: 'Hoàn thành',   color: '#16a34a' },
  CANCELLED: { label: 'Đã hủy',       color: '#ef4444' },
}

const VEHICLE_STATUS_META: Record<string, { label: string; color: string }> = {
  AVAILABLE:   { label: 'Sẵn sàng', color: '#22c55e' },
  RENTED:      { label: 'Đang thuê', color: '#3b82f6' },
  MAINTENANCE: { label: 'Bảo trì',  color: '#f97316' },
  UNAVAILABLE: { label: 'Tạm khóa', color: '#94a3b8' },
}

// ─────────────────────────────────────────────────────────
// Animated counter hook
// ─────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const startValueRef = useRef(0)

  useEffect(() => {
    startValueRef.current = value
    startRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(startValueRef.current + (target - startValueRef.current) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

// ─────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────

type KpiProps = {
  icon: string
  label: string
  value: number
  format?: (n: number) => string
  sub: string
  accent?: 'lime' | 'blue' | 'purple' | 'green' | 'orange'
}

function KpiCard({ icon, label, value, format, sub, accent = 'blue' }: KpiProps) {
  const animated = useAnimatedNumber(value)
  const display = format ? format(animated) : animated.toLocaleString('vi-VN')

  return (
    <article className={`aov-kpi aov-kpi--${accent}`}>
      <div className="aov-kpi__icon" aria-hidden>{icon}</div>
      <div className="aov-kpi__body">
        <p className="aov-kpi__label">{label}</p>
        <p className="aov-kpi__value">{display}</p>
        <p className="aov-kpi__sub">{sub}</p>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────
// Revenue Line Chart (12 months, SVG gradient fill)
// ─────────────────────────────────────────────────────────

function RevenueLineChart({ data }: { data: DailyMetricDto[] }) {
  const values = data.map((x) => toNum(x.value))
  const max = Math.max(...values, 1)
  const W = 100
  const H = 100
  const pad = 4

  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2)
    const y = H - pad - (v / max) * (H - pad * 2)
    return [x, y] as [number, number]
  })

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = [
    ...pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`),
    `L${pts[pts.length - 1]?.[0].toFixed(2)},${(H - pad).toFixed(2)}`,
    `L${pts[0]?.[0].toFixed(2)},${(H - pad).toFixed(2)}`,
    'Z',
  ].join(' ')

  if (data.length === 0) {
    return <div className="aov-chart-empty">Chưa có dữ liệu doanh thu</div>
  }

  return (
    <div className="aov-linechart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="rev-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={pad} y1={(H - pad) - t * (H - pad * 2)}
            x2={W - pad} y2={(H - pad) - t * (H - pad * 2)}
            stroke="rgba(148,163,184,0.2)" strokeWidth="0.5"
          />
        ))}
        <path d={areaPath} fill="url(#rev-gradient)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" fill="#6366f1" />
        ))}
      </svg>
      {/* Labels */}
      <div className="aov-linechart__labels">
        {data.map((d, i) => (
          <span key={i}>{fmtMonthLabel(d.date)}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Bar Chart (7 ngày booking)
// ─────────────────────────────────────────────────────────

function BookingBarChart({ data }: { data: DailyMetricDto[] }) {
  const values = data.map((x) => toNum(x.value))
  const max = Math.max(...values, 1)

  if (data.length === 0) return <div className="aov-chart-empty">Chưa có dữ liệu</div>

  return (
    <div className="aov-barchart">
      {data.map((item, i) => {
        const v = toNum(item.value)
        const pct = Math.max(4, (v / max) * 100)
        return (
          <div key={i} className="aov-barchart__col">
            <span className="aov-barchart__val">{v > 0 ? v : ''}</span>
            <div className="aov-barchart__bar-wrap">
              <div className="aov-barchart__bar" style={{ height: `${pct}%` }} title={`${v} booking`} />
            </div>
            <span className="aov-barchart__label">{fmtShortDate(item.date)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Donut Chart
// ─────────────────────────────────────────────────────────

function DonutChart({
  title,
  metrics,
  meta,
}: {
  title: string
  metrics: StatusMetricDto[]
  meta: Record<string, { label: string; color: string }>
}) {
  const total = metrics.reduce((a, x) => a + toNum(x.count), 0)
  let deg = 0
  const segments = metrics
    .map((item) => {
      const pct = total > 0 ? (toNum(item.count) / total) * 360 : 0
      const start = deg
      deg += pct
      const color = meta[item.status]?.color ?? '#94a3b8'
      return { ...item, start, end: deg, color, pct }
    })
    .filter((s) => s.pct > 0)

  const conic = segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')

  return (
    <section className="aov-donut">
      <h3 className="aov-chart-title">{title}</h3>
      <div className="aov-donut__wrap">
        <div
          className="aov-donut__ring"
          style={{ background: conic ? `conic-gradient(${conic})` : '#e2e8f0' }}
          role="img"
          aria-label={`${title}: tổng ${total}`}
        >
          <div className="aov-donut__hole">
            <strong>{total}</strong>
            <span>Tổng</span>
          </div>
        </div>
        <ul className="aov-donut__legend">
          {metrics.map((item) => (
            <li key={item.status}>
              <span className="aov-donut__dot" style={{ background: meta[item.status]?.color ?? '#94a3b8' }} />
              <span className="aov-donut__name">{meta[item.status]?.label ?? item.status}</span>
              <strong>{toNum(item.count)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Horizontal Bar — Top vehicles
// ─────────────────────────────────────────────────────────

function TopVehiclesChart({
  title,
  items,
  valueKey,
  format,
  color,
}: {
  title: string
  items: TopVehicleMetricDto[]
  valueKey: 'rentCount' | 'revenue'
  format: (v: number) => string
  color: string
}) {
  const values = items.map((x) => toNum(valueKey === 'rentCount' ? x.rentCount : x.revenue))
  const max = Math.max(...values, 1)

  return (
    <section className="aov-toplist">
      <h3 className="aov-chart-title">{title}</h3>
      {items.length === 0 ? (
        <p className="aov-chart-empty">Chưa có dữ liệu</p>
      ) : (
        <ol className="aov-toplist__list">
          {items.map((v, i) => {
            const val = toNum(valueKey === 'rentCount' ? v.rentCount : v.revenue)
            const pct = (val / max) * 100
            return (
              <li key={v.vehicleId ?? i} className="aov-toplist__item">
                <span className="aov-toplist__rank">{i + 1}</span>
                <div className="aov-toplist__info">
                  <span className="aov-toplist__name">{v.vehicleName?.trim() || 'Xe chưa đặt tên'}</span>
                  <span className="aov-toplist__plate">{v.licensePlate || '—'}</span>
                </div>
                <div className="aov-toplist__bar-wrap">
                  <div
                    className="aov-toplist__bar"
                    style={{ width: `${Math.max(4, pct)}%`, background: color }}
                  />
                </div>
                <span className="aov-toplist__val">{format(val)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Main Section
// ─────────────────────────────────────────────────────────

type Props = {
  /** refreshKey tăng → fetch lại data */
  refreshKey?: number
}

export default function AdminOverviewSection({ refreshKey = 0 }: Props) {
  const [stats, setStats] = useState<AdminOverviewStatsDto | null>(null)
  const [charts, setCharts] = useState<AdminDashboardChartsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const load = useCallback(async () => {
    if (!isMounted.current) return
    setLoading(true)
    setError(null)
    try {
      const [s, c] = await Promise.all([fetchAdminOverviewStats(), fetchAdminDashboardCharts()])
      if (!isMounted.current) return
      setStats(s)
      setCharts(c)
    } catch (e) {
      if (!isMounted.current) return
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu thống kê.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    void load()
    // Tự refresh mỗi 60s
    const timer = window.setInterval(() => void load(), 60_000)
    return () => {
      isMounted.current = false
      window.clearInterval(timer)
    }
  }, [load, refreshKey])

  if (loading && !stats) {
    return (
      <div className="aov-loading" aria-busy="true">
        <span className="aov-spinner" aria-hidden />
        Đang tải dữ liệu thống kê…
      </div>
    )
  }

  if (error) {
    return (
      <div className="aov-error" role="alert">
        <span>⚠️</span> {error}
        <button type="button" onClick={() => void load()}>Thử lại</button>
      </div>
    )
  }

  const revenueTotal = toNum(stats?.revenueThisMonth ?? 0)

  return (
    <div className="aov">
      {/* ── KPI Cards ── */}
      <section className="aov-kpis" aria-label="Chỉ số chính">
        <KpiCard
          icon="📅"
          label="Đơn đặt hôm nay"
          value={stats?.bookingsToday ?? 0}
          sub="Booking mới tạo trong ngày"
          accent="lime"
        />
        <KpiCard
          icon="🚙"
          label="Xe đang cho thuê"
          value={stats?.ongoingBookings ?? 0}
          sub="Booking đang ONGOING"
          accent="blue"
        />
        <KpiCard
          icon="✅"
          label="Xe sẵn sàng"
          value={stats?.availableVehicles ?? 0}
          sub="Trạng thái AVAILABLE"
          accent="green"
        />
        <KpiCard
          icon="💰"
          label="Doanh thu tháng này"
          value={revenueTotal}
          format={fmtMoney}
          sub="Tổng thanh toán PAID"
          accent="purple"
        />
        <KpiCard
          icon="👤"
          label="Người dùng mới"
          value={stats?.newUsersLast7Days ?? 0}
          sub="Đăng ký trong 7 ngày qua"
          accent="orange"
        />
      </section>

      {/* ── Trend Charts row ── */}
      <div className="aov-row aov-row--charts">
        <div className="aov-panel aov-panel--wide">
          <header className="aov-panel__head">
            <h2 className="aov-panel__title">
              <span aria-hidden>📈</span> Doanh thu 12 tháng gần đây
            </h2>
            <span className="aov-panel__badge aov-panel__badge--purple">Tháng</span>
          </header>
          <RevenueLineChart data={charts?.revenueByMonth ?? []} />
        </div>

        <div className="aov-panel">
          <header className="aov-panel__head">
            <h2 className="aov-panel__title">
              <span aria-hidden>📋</span> Booking 7 ngày gần đây
            </h2>
            <span className="aov-panel__badge aov-panel__badge--blue">Ngày</span>
          </header>
          <BookingBarChart data={charts?.bookingsLast7Days ?? []} />
        </div>
      </div>

      {/* ── Donut Charts row ── */}
      <div className="aov-row">
        <div className="aov-panel">
          <DonutChart
            title="🗂 Trạng thái đặt xe"
            metrics={charts?.bookingStatusBreakdown ?? []}
            meta={BOOKING_STATUS_META}
          />
        </div>
        <div className="aov-panel">
          <DonutChart
            title="🚗 Trạng thái phương tiện"
            metrics={charts?.vehicleStatusBreakdown ?? []}
            meta={VEHICLE_STATUS_META}
          />
        </div>
        <div className="aov-panel">
          <header className="aov-panel__head">
            <h2 className="aov-panel__title">
              <span aria-hidden>💵</span> Doanh thu 7 ngày
            </h2>
          </header>
          <BookingBarChart
            data={(charts?.revenueLast7Days ?? []).map((d) => ({
              ...d,
              value: d.value,
            }))}
          />
        </div>
      </div>

      {/* ── Top Vehicles row ── */}
      <div className="aov-row">
        <div className="aov-panel">
          <TopVehiclesChart
            title="🏆 Top 5 xe theo lượt thuê"
            items={charts?.topVehiclesByRentCount ?? []}
            valueKey="rentCount"
            format={(n) => `${n} lượt`}
            color="#2563eb"
          />
        </div>
        <div className="aov-panel">
          <TopVehiclesChart
            title="💰 Top 5 xe theo doanh thu"
            items={charts?.topVehiclesByRevenue ?? []}
            valueKey="revenue"
            format={fmtMoney}
            color="#7c3aed"
          />
        </div>
      </div>

      {/* Last updated */}
      {!loading && (
        <p className="aov-updated">
          Cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · Tự động làm mới mỗi 60 giây
        </p>
      )}
    </div>
  )
}
