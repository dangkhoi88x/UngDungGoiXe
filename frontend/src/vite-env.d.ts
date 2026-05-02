/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** Đồng bộ với app.owner-vehicle-upload.max-file-size-bytes (mặc định 6291456) */
  readonly VITE_MAX_VEHICLE_PHOTO_BYTES?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_MAP_ID?: string
}
