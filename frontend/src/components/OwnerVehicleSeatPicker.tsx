import { OWNER_VEHICLE_SEAT_OPTIONS, isOwnerVehicleStandardSeat } from '../lib/ownerVehicleRequestForm'

type Props = {
  value: string
  onChange: (next: string) => void
}

export function OwnerVehicleSeatPicker({ value, onChange }: Props) {
  const trimmed = value.trim()
  const n = trimmed === '' ? null : parseInt(trimmed, 10)
  const legacy =
    n != null &&
    Number.isInteger(n) &&
    n > 0 &&
    !isOwnerVehicleStandardSeat(n)

  return (
    <div className="owreg__field owreg__field--seat">
      <span className="owreg__label">Số chỗ (tùy chọn)</span>
      <div className="owreg__seat-tabs" role="group" aria-label="Chọn số chỗ">
        <button
          type="button"
          className={`owreg__seat-tab${trimmed === '' && !legacy ? ' is-active' : ''}`}
          onClick={() => onChange('')}
        >
          Chưa chọn
        </button>
        {OWNER_VEHICLE_SEAT_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`owreg__seat-tab${trimmed === String(s) ? ' is-active' : ''}`}
            onClick={() => onChange(String(s))}
          >
            {s} chỗ
          </button>
        ))}
      </div>
      {legacy ? (
        <p className="owreg__seat-legacy" role="status">
          Đang lưu <strong>{n} chỗ</strong> (ngoài danh mục). Chọn 5 / 7 / 9 / 16 chỗ phía trên để
          thống nhất với hệ thống.
        </p>
      ) : null}
    </div>
  )
}
