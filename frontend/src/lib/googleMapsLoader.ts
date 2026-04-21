import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false

/**
 * Configure Google Maps loader once per browser session.
 */
export function ensureGoogleMapsConfigured(apiKey: string, mapId?: string): void {
  if (configured) return
  const mapIds = mapId && mapId.trim() ? [mapId.trim()] : undefined
  setOptions({
    key: apiKey,
    v: 'weekly',
    authReferrerPolicy: 'origin',
    mapIds,
  })
  configured = true
}

export async function loadGoogleMapsLibrary() {
  return importLibrary('maps')
}
