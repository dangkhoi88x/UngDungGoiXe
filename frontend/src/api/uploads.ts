import { parseApiErrorFromResponse, unwrapApiData } from './apiResponse'
import { authFetch } from './authFetch'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function uploadTo(
  path: string,
  file: File,
): Promise<string> {
  const fd = new FormData()
  fd.set('file', file)
  const res = await authFetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error(await parseApiErrorFromResponse(res))
  const payload = (await res.json()) as unknown
  const data = unwrapApiData<{ url?: string }>(payload)
  const url = data?.url?.trim()
  if (!url) throw new Error('Phản hồi upload file không hợp lệ.')
  return url
}

export function uploadOwnerVehiclePhoto(file: File): Promise<string> {
  return uploadTo('/uploads/owner-vehicle/photo', file)
}

export function uploadOwnerVehicleDocument(file: File): Promise<string> {
  return uploadTo('/uploads/owner-vehicle/document', file)
}

export async function uploadOwnerVehiclePhotoWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const token = localStorage.getItem('accessToken')?.trim()
  if (!token) {
    throw new Error('Bạn cần đăng nhập trước khi upload.')
  }
  const fd = new FormData()
  fd.set('file', file)

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/uploads/owner-vehicle/photo`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      const percent = Math.max(0, Math.min(100, Math.round((e.loaded * 100) / e.total)))
      onProgress?.(percent)
    }
    xhr.onerror = () => reject(new Error('Không thể kết nối để upload ảnh.'))
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const payload = JSON.parse(xhr.responseText) as unknown
          const wrapped = payload as { message?: unknown; data?: unknown }
          const message =
            typeof wrapped?.message === 'string' && wrapped.message.trim()
              ? wrapped.message
              : `Lỗi ${xhr.status}`
          reject(new Error(message))
          return
        } catch {
          reject(new Error(`Lỗi ${xhr.status}`))
          return
        }
      }
      try {
        const payload = JSON.parse(xhr.responseText) as unknown
        const data = unwrapApiData<{ url?: string }>(payload)
        const url = data?.url?.trim()
        if (!url) {
          reject(new Error('Phản hồi upload ảnh không hợp lệ.'))
          return
        }
        onProgress?.(100)
        resolve(url)
      } catch {
        reject(new Error('Phản hồi upload ảnh không hợp lệ.'))
      }
    }
    xhr.send(fd)
  })
}

