import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchStations, stationLabel, type StationDto } from '../api/stations'
import {
  ensureGoogleMapsConfigured,
  loadGoogleMapsLibrary,
} from '../lib/googleMapsLoader'
import './MapStationPage.css'

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 }
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

function toFriendlyMapError(raw: string): string {
  const msg = raw.trim()
  const low = msg.toLowerCase()
  if (low.includes('permission denied') || low.includes('referer')) {
    return 'Permission denied: API key bị chặn bởi HTTP referrer hoặc giới hạn ứng dụng/API chưa khớp.'
  }
  if (low.includes('apinotactivatedmaperror') || low.includes('api not activated')) {
    return 'ApiNotActivatedMapError: cần bật Maps JavaScript API cho đúng project chứa API key.'
  }
  return msg
}

export default function MapStationPage() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim()
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const [origin, setOrigin] = useState('')
  const [stations, setStations] = useState<StationDto[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('ALL')
  const [mapBootKey, setMapBootKey] = useState(0)

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  const filteredStations = useMemo(
    () => {
      const q = searchText.trim().toLowerCase()
      return stations.filter((s) => {
        const st = String(s.status ?? '').toUpperCase()
        if (statusFilter !== 'ALL' && st !== statusFilter) return false
        if (!q) return true
        return (
          stationLabel(s).toLowerCase().includes(q) ||
          String(s.address ?? '')
            .toLowerCase()
            .includes(q) ||
          String(s.hotline ?? '')
            .toLowerCase()
            .includes(q)
        )
      })
    },
    [stations, searchText, statusFilter],
  )

  const stationsWithCoords = useMemo(
    () =>
      filteredStations.filter(
        (s) =>
          s.latitude != null &&
          s.longitude != null &&
          Number.isFinite(Number(s.latitude)) &&
          Number.isFinite(Number(s.longitude)),
      ),
    [filteredStations],
  )

  const stationsWithoutCoords = useMemo(
    () =>
      filteredStations.filter(
        (s) =>
          s.latitude == null ||
          s.longitude == null ||
          !Number.isFinite(Number(s.latitude)) ||
          !Number.isFinite(Number(s.longitude)),
      ),
    [filteredStations],
  )

  useEffect(() => {
    let cancelled = false
    setLoadingStations(true)
    setDataError(null)
    void fetchStations()
      .then((list) => {
        if (!cancelled) setStations(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDataError(
            err instanceof Error
              ? err.message
              : 'Không tải được danh sách trạm từ API.',
          )
          setStations([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStations(false)
      })
    return () => {
      cancelled = true
    }
  }, [mapBootKey])

  useEffect(() => {
    mapRef.current = null
    infoWindowRef.current = null
    for (const mk of markersRef.current) mk.setMap(null)
    markersRef.current = []
    if (mapElRef.current) mapElRef.current.replaceChildren()

    if (!apiKey) {
      setMapError(
        'Thiếu VITE_GOOGLE_MAPS_API_KEY trong frontend/.env.local. Thêm key rồi khởi động lại npm run dev.',
      )
      return
    }
    if (!mapElRef.current || mapRef.current) return

    let cancelled = false
    setMapError(null)

    ensureGoogleMapsConfigured(apiKey, mapId)
    void loadGoogleMapsLibrary()
      .then((mapsLib) => {
        if (cancelled || !mapElRef.current) return
        const opts: google.maps.MapOptions = {
          center: DEFAULT_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }
        if (mapId) opts.mapId = mapId
        mapRef.current = new mapsLib.Map(mapElRef.current, opts)
        infoWindowRef.current = new google.maps.InfoWindow()
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const raw =
            err instanceof Error ? err.message : 'Không thể khởi tạo Google Maps.'
          setMapError(toFriendlyMapError(raw))
        }
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, mapId, mapBootKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const info = infoWindowRef.current ?? new google.maps.InfoWindow()
    infoWindowRef.current = info

    for (const mk of markersRef.current) mk.setMap(null)
    markersRef.current = []

    if (stationsWithCoords.length === 0) {
      map.setCenter(DEFAULT_CENTER)
      map.setZoom(11)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    for (const s of stationsWithCoords) {
      const position = {
        lat: Number(s.latitude),
        lng: Number(s.longitude),
      }
      const title = stationLabel(s)
      const status = String(s.status ?? '').toUpperCase() || 'UNKNOWN'
      const marker = new google.maps.Marker({
        map,
        position,
        title,
      })
      const hotline = s.hotline ? `<div>📞 ${s.hotline}</div>` : ''
      const address = s.address ? `<div>📍 ${s.address}</div>` : ''
      const html = `
        <div style="min-width:220px;line-height:1.45">
          <div style="font-weight:700;margin-bottom:4px">${title}</div>
          ${address}
          ${hotline}
          <div style="margin-top:6px;font-size:12px;color:#475569">Trạng thái: ${status}</div>
        </div>
      `
      marker.addListener('click', () => {
        info.setContent(html)
        info.open({ map, anchor: marker })
      })
      markersRef.current.push(marker)
      bounds.extend(position)
    }

    if (stationsWithCoords.length === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(15)
    } else {
      map.fitBounds(bounds, 56)
    }
  }, [stationsWithCoords])

  const focusStation = (station: StationDto) => {
    const map = mapRef.current
    if (!map || station.latitude == null || station.longitude == null) return
    const position = { lat: Number(station.latitude), lng: Number(station.longitude) }
    map.panTo(position)
    map.setZoom(16)
    const mk = markersRef.current.find(
      (m) =>
        Math.abs((m.getPosition()?.lat() ?? 0) - position.lat) < 1e-9 &&
        Math.abs((m.getPosition()?.lng() ?? 0) - position.lng) < 1e-9,
    )
    if (mk && infoWindowRef.current) {
      google.maps.event.trigger(mk, 'click')
    }
  }

  return (
    <div className="map-station-page">
      <header className="map-station-header">
        <h1>Bản đồ trạm</h1>
        <nav className="map-station-nav" aria-label="Điều hướng">
          <a href="/">Trang chủ</a>
          <a href="/rent">Thuê xe</a>
        </nav>
      </header>

      <main className="map-station-layout">
        <section className="map-wrap" aria-label="Google Maps">
          {origin ? (
            <p className="map-banner map-banner--info" role="status">
              Origin hiện tại: <code>{origin}</code>. Nếu key bị chặn, thêm HTTP referrer:
              <code>{` ${origin}/*`}</code>
            </p>
          ) : null}
          {mapError ? (
            <div className="map-banner map-banner--err" role="alert">
              <div>{mapError}</div>
              <button
                type="button"
                className="map-retry-btn"
                onClick={() => setMapBootKey((x) => x + 1)}
              >
                Thử lại
              </button>
            </div>
          ) : null}
          {loadingStations ? (
            <p className="map-banner map-banner--info" role="status">
              Đang tải danh sách trạm từ API...
            </p>
          ) : null}
          <div ref={mapElRef} className="map-canvas" />
        </section>

        <aside className="panel-wrap" aria-label="Danh sách trạm">
          <h2 className="panel-title">Danh sách trạm</h2>
          <p className="panel-subtitle">
            Marker chỉ hiển thị với trạm có đủ latitude/longitude.
          </p>
          <div className="panel-filters">
            <input
              type="search"
              className="panel-search"
              placeholder="Tìm theo tên/địa chỉ/hotline..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className="panel-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {dataError ? (
            <p className="map-banner map-banner--err" role="alert">
              {dataError}
            </p>
          ) : null}

          <p className="panel-subtitle">
            Đang hiển thị: {stationsWithCoords.length} trạm có tọa độ /{' '}
            {stationsWithoutCoords.length} trạm thiếu tọa độ.
          </p>
          <ul className="station-list">
            {stationsWithCoords.map((s) => (
              <li key={s.id} className="station-item">
                <button type="button" onClick={() => focusStation(s)}>
                  <p className="station-name">{stationLabel(s)}</p>
                  <p className="station-address">{s.address ?? 'Không có địa chỉ'}</p>
                </button>
              </li>
            ))}
          </ul>

          {stationsWithoutCoords.length > 0 ? (
            <div className="panel-note">
              {stationsWithoutCoords.length} trạm chưa có tọa độ, chưa thể vẽ marker.
              <ul className="missing-list">
                {stationsWithoutCoords.map((s) => (
                  <li key={s.id}>{stationLabel(s)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  )
}
