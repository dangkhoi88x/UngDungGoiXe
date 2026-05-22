import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchStations, stationLabel, type StationDto } from '../api/stations'
import TopNav from '../components/TopNav'
import './MapStationPage.css'

const DEFAULT_CENTER: L.LatLngExpression = [10.7769, 106.7009]
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

type MarkerEntry = {
  marker: L.Marker
  stationId: number
}

function stationCoords(station: StationDto): L.LatLngExpression | null {
  if (station.latitude == null || station.longitude == null) {
    return null
  }
  const lat = Number(station.latitude)
  const lng = Number(station.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  return [lat, lng]
}

function popupHtml(station: StationDto): string {
  const title = stationLabel(station)
  const status = String(station.status ?? '').toUpperCase() || 'UNKNOWN'
  const hotline = station.hotline ? `<div>Phone: ${station.hotline}</div>` : ''
  const address = station.address ? `<div>${station.address}</div>` : ''
  return `
    <div class="map-popup">
      <div class="map-popup__title">${title}</div>
      ${address}
      ${hotline}
      <div class="map-popup__status">Trang thai: ${status}</div>
    </div>
  `
}

export default function MapStationPage() {
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<MarkerEntry[]>([])

  const [stations, setStations] = useState<StationDto[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('ALL')

  const filteredStations = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return stations.filter((s) => {
      const st = String(s.status ?? '').toUpperCase()
      if (statusFilter !== 'ALL' && st !== statusFilter) return false
      if (!q) return true
      return (
        stationLabel(s).toLowerCase().includes(q) ||
        String(s.address ?? '').toLowerCase().includes(q) ||
        String(s.hotline ?? '').toLowerCase().includes(q)
      )
    })
  }, [stations, searchText, statusFilter])

  const stationsWithCoords = useMemo(
    () => filteredStations.filter((s) => stationCoords(s) != null),
    [filteredStations],
  )

  const stationsWithoutCoords = useMemo(
    () => filteredStations.filter((s) => stationCoords(s) == null),
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
  }, [])

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = L.map(mapElRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    const markersLayer = L.layerGroup().addTo(map)
    mapRef.current = map
    markersLayerRef.current = markersLayer

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      markersRef.current = []
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    markersLayer.clearLayers()
    markersRef.current = []

    if (stationsWithCoords.length === 0) {
      map.setView(DEFAULT_CENTER, 11)
      return
    }

    const bounds = L.latLngBounds([])
    for (const station of stationsWithCoords) {
      const coords = stationCoords(station)
      if (!coords) continue
      const marker = L.marker(coords)
        .bindPopup(popupHtml(station))
        .addTo(markersLayer)
      markersRef.current.push({ marker, stationId: station.id })
      bounds.extend(coords)
    }

    if (bounds.isValid()) {
      if (stationsWithCoords.length === 1) {
        map.setView(bounds.getCenter(), 15)
      } else {
        map.fitBounds(bounds, { padding: [56, 56] })
      }
    }
  }, [stationsWithCoords])

  const focusStation = useCallback((station: StationDto) => {
    const map = mapRef.current
    const coords = stationCoords(station)
    if (!map || !coords) return

    map.flyTo(coords, 16, { duration: 0.7 })
    const entry = markersRef.current.find((item) => item.stationId === station.id)
    entry?.marker.openPopup()
  }, [])

  return (
    <div className="map-station-page">
      <TopNav solid />

      <main className="map-station-layout">
        <header className="map-station-head">
          <h1>Bản đồ trạm</h1>
          <p>Xem vị trí trạm bằng OpenStreetMap và lọc nhanh theo trạng thái.</p>
        </header>
        <section className="map-wrap" aria-label="OpenStreetMap">
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
            Chọn một trạm để chuyển bản đồ tới đúng vị trí.
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
