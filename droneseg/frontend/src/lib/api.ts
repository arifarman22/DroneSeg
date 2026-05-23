import { UploadResponse, DetectResponse, ImageRecord } from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/api/upload/`, { method: 'POST', body: form })
  return handleResponse<UploadResponse>(res)
}

export async function runDetection(imageId: string, confidence: number): Promise<DetectResponse> {
  const res = await fetch(`${API}/api/detect/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_id: imageId, confidence_threshold: confidence }),
  })
  return handleResponse<DetectResponse>(res)
}

export async function getHistory(): Promise<{ images: ImageRecord[]; total: number }> {
  const res = await fetch(`${API}/api/v1/history/`)
  return handleResponse<{ images: ImageRecord[]; total: number }>(res)
}

export async function getImageDetail(imageId: string): Promise<ImageRecord> {
  const res = await fetch(`${API}/api/v1/history/${imageId}`)
  return handleResponse<ImageRecord>(res)
}

export async function exportGeoJson(detectionId: string, bounds?: [number, number, number, number]): Promise<any> {
  const params = bounds
    ? `?min_lng=${bounds[0]}&min_lat=${bounds[1]}&max_lng=${bounds[2]}&max_lat=${bounds[3]}`
    : ''
  const res = await fetch(`${API}/api/v1/export/geojson/${detectionId}${params}`)
  return handleResponse<any>(res)
}

export function getMaskUrl(detectionId: string): string {
  return `${API}/api/detect/mask/${detectionId}`
}

export function getImageFileUrl(imageId: string): string {
  return `${API}/api/v1/history/${imageId}/file`
}

export async function healthCheck(): Promise<{ status: string; model_loaded: boolean }> {
  const res = await fetch(`${API}/api/health`)
  return handleResponse<{ status: string; model_loaded: boolean }>(res)
}
