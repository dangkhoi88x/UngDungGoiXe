import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchStations, stationLabel, type StationDto } from '../api/stations'
import TopNav from '../components/TopNav'
import './MapStationPage.css'

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

const stationMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function MapStationPage() {
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<number, LeafletMarker>>(new Map())

  const [stations, setStations] = useState<StationDto[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('ALL')
  const [mapBootKey, setMapBootKey] = useState(0)

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
    if (!mapElRef.current || mapRef.current) return

    setMapError(null)
    const map = L.map(mapElRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      scrollWheelZoom: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const marker of markersRef.current.values()) marker.remove()
    markersRef.current.clear()

    if (stationsWithCoords.length === 0) {
      map.setView(DEFAULT_CENTER, 11)
      return
    }

    const bounds: [number, number][] = []
    for (const s of stationsWithCoords) {
      const position: [number, number] = [Number(s.latitude), Number(s.longitude)]
      const title = stationLabel(s)
      const status = String(s.status ?? '').toUpperCase() || 'UNKNOWN'
      const marker = L.marker(position, {
        icon: stationMarkerIcon,
        title,
      })
      const hotline = s.hotline ? `<div>📞 ${s.hotline}</div>` : ''
      const address = s.address ? `<div>📍 ${s.address}</div>` : ''
      marker
        .bindPopup(
          `
        <div style="min-width:220px;line-height:1.45">
          <div style="font-weight:700;margin-bottom:4px">${title}</div>
          ${address}
          ${hotline}
          <div style="margin-top:6px;font-size:12px;color:#475569">Trạng thái: ${status}</div>
        </div>
      `,
        )
        .addTo(map)
      markersRef.current.set(s.id, marker)
      bounds.push(position)
    }

    if (stationsWithCoords.length === 1) {
      map.setView(bounds[0], 15)
    } else {
      map.fitBounds(bounds, { padding: [56, 56] })
    }
  }, [stationsWithCoords])

  const focusStation = (station: StationDto) => {
    const map = mapRef.current
    if (!map || station.latitude == null || station.longitude == null) return
    const position: [number, number] = [
      Number(station.latitude),
      Number(station.longitude),
    ]
    if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) return
    map.setView(position, 16)
    markersRef.current.get(station.id)?.openPopup()
  }

  return (
    <div className="map-station-page">
      <TopNav solid />

      <main className="map-station-layout">
        <header className="map-station-head">
          <h1>Bản đồ trạm</h1>
          <p>Xem vị trí trạm theo bản đồ và lọc nhanh theo trạng thái.</p>
        </header>
        <section className="map-wrap" aria-label="OpenStreetMap">
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
