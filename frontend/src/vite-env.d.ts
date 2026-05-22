/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** OAuth 2.0 Web client ID (Google Console); trung voi OAUTH_GOOGLE_ID phia backend. */
  readonly VITE_OAUTH_GOOGLE_ID?: string
  /** Đồng bộ với app.owner-vehicle-upload.max-file-size-bytes (mặc định 6291456) */
  readonly VITE_MAX_VEHICLE_PHOTO_BYTES?: string
}
