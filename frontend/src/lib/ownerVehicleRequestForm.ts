/** Mỗi dòng một URL / một đoạn text. */
export function splitLinesUrls(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function joinLines(lines: string[] | null | undefined): string {
  if (!lines?.length) return ''
  return lines.map((s) => s.trim()).filter(Boolean).join('\n')
}

export function parseOptionalDouble(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function parseRequiredMoney(
  raw: string,
  label: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim()
  if (!t) return { ok: false, error: `Vui lòng nhập ${label}.` }
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${label} không hợp lệ.` }
  return { ok: true, value: n }
}

export function parseOptionalInt(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function moneyToFormString(v: number | string | null | undefined): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  const s = String(v).trim()
  if (!s) return ''
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? s : ''
}

export function intToFormString(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return ''
  return String(Math.trunc(v))
}

export type OwnerVehicleFormStrings = {
  stationId: string
  licensePlate: string
  name: string
  brand: string
  capacity: string
  hourlyRate: string
  dailyRate: string
  depositAmount: string
  latitude: string
  longitude: string
  registrationDocUrl: string
  insuranceDocUrl: string
}

export function validateOwnerVehicleFormStrings(
  d: OwnerVehicleFormStrings,
  photoUrls: string[],
): string | null {
  if (!d.stationId || !Number.isInteger(Number(d.stationId)) || Number(d.stationId) <= 0) {
    return 'Chọn trạm giao / nhận xe.'
  }
  if (!d.licensePlate.trim()) return 'Nhập biển số xe.'
  if (!d.name.trim()) return 'Nhập tên hiển thị xe (ví dụ: Toyota Vios 2022).'
  if (!d.brand.trim()) return 'Nhập hãng / dòng xe.'
  const cap = parseOptionalInt(d.capacity)
  if (d.capacity.trim() && cap == null) return 'Số chỗ phải là số nguyên dương hoặc để trống.'
  const h = parseRequiredMoney(d.hourlyRate, 'Giá theo giờ')
  if (!h.ok) return h.error
  const dly = parseRequiredMoney(d.dailyRate, 'Giá theo ngày')
  if (!dly.ok) return dly.error
  const dep = parseRequiredMoney(d.depositAmount, 'Tiền cọc')
  if (!dep.ok) return dep.error
  if (!d.registrationDocUrl.trim()) return 'Nhập URL giấy đăng ký / đăng kiểm.'
  if (!d.insuranceDocUrl.trim()) return 'Nhập URL giấy bảo hiểm.'
  if (photoUrls.length < 3) return 'Cần ít nhất 3 URL ảnh xe (mỗi dòng một URL).'
  const lat = parseOptionalDouble(d.latitude)
  const lng = parseOptionalDouble(d.longitude)
  if (d.latitude.trim() && lat == null) return 'Vĩ độ không hợp lệ.'
  if (d.longitude.trim() && lng == null) return 'Kinh độ không hợp lệ.'
  if (
    (d.latitude.trim() && !d.longitude.trim()) ||
    (!d.latitude.trim() && d.longitude.trim())
  ) {
    return 'Nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.'
  }
  return null
}
