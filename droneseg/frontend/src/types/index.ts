export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectionItem {
  label: string
  confidence: number
  bbox: BBox
  pixel_area: number
  color: number[]
}

export interface UploadResponse {
  image_id: string
  image_url: string
  width: number
  height: number
  size_bytes: number
  filename: string
}

export interface DetectResponse {
  detection_id: string
  image_id: string
  model_used: string
  inference_time_ms: number
  mask_url: string
  detections: DetectionItem[]
}

export interface DetectionRecord {
  id: string
  imageId: string
  modelUsed: string
  detectionsJson: { detections: DetectionItem[] }
  maskPath: string | null
  inferenceTimeMs: number
  confidenceThreshold: number
  createdAt: string
}

export interface ImageRecord {
  id: string
  originalFilename: string
  storedFilename: string
  filePath: string
  width: number | null
  height: number | null
  sizeBytes: number
  mimeType: string
  createdAt: string
  detections?: DetectionRecord[]
}
