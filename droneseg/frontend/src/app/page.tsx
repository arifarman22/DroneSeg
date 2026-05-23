'use client'

import { useState, useCallback, useEffect } from 'react'
import MapViewer from '@/components/MapViewer'
import UploadDropzone from '@/components/UploadDropzone'
import DashboardStats from '@/components/DashboardStats'
import DetectionPanel from '@/components/DetectionPanel'

import ResultsSummary from '@/components/ResultsSummary'
import { uploadImage, runDetection, getImageFileUrl, getMaskUrl, healthCheck } from '@/lib/api'
import { UploadResponse, DetectResponse, DetectionItem } from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function HomePage() {
  const [uploaded, setUploaded] = useState<UploadResponse | null>(null)
  const [detection, setDetection] = useState<DetectResponse | null>(null)
  const [confidence, setConfidence] = useState(0.5)
  const [imageOpacity, setImageOpacity] = useState(0.9)
  const [maskOpacity, setMaskOpacity] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleClasses, setVisibleClasses] = useState<Set<string>>(new Set())
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'controls' | 'results'>('controls')

  useEffect(() => {
    healthCheck().then(r => setModelReady(r.model_loaded)).catch(() => setModelReady(false))
  }, [])

  const handleUpload = async (file: File) => {
    setError(null)
    setDetection(null)
    setLoading(true)
    try {
      const res = await uploadImage(file)
      setUploaded(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDetect = async () => {
    if (!uploaded) return
    setError(null)
    setLoading(true)
    try {
      const res = await runDetection(uploaded.image_id, confidence)
      setDetection(res)
      setVisibleClasses(new Set(res.detections.map(d => d.label)))
      setActiveTab('results')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleClass = useCallback((label: string) => {
    setVisibleClasses(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const handleExportGeoJson = async () => {
    if (!detection) return
    const url = `${API}/api/v1/export/geojson/${detection.detection_id}?min_lng=-73.99&min_lat=40.74&max_lng=-73.97&max_lat=40.76`
    try {
      const res = await fetch(url)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `detection_${detection.detection_id}.geojson`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      setError('Failed to export GeoJSON')
    }
  }

  const filteredDetections: DetectionItem[] = detection
    ? detection.detections.filter(d => d.confidence >= confidence)
    : []

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50">
      {/* Stats bar */}
      <div className="px-5 py-3 bg-white border-b border-gray-200">
        <DashboardStats uploaded={uploaded} detection={detection} modelReady={modelReady} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image + Analytics + Map */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Image Viewer */}
          <div className="relative min-h-[300px] bg-gray-900 flex items-center justify-center overflow-hidden">
            {uploaded ? (
              <div className="relative w-full h-[350px] flex items-center justify-center">
                <img
                  src={getImageFileUrl(uploaded.image_id)}
                  alt="Uploaded drone image"
                  className="max-w-full max-h-full object-contain"
                  style={{ opacity: imageOpacity }}
                />
                {detection && (
                  <img
                    src={getMaskUrl(detection.detection_id)}
                    alt="Segmentation mask"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ opacity: maskOpacity, mixBlendMode: 'screen' }}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-16">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 text-gray-600">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-sm">Upload an image to get started</p>
              </div>
            )}
          </div>

          {/* Analytics panel */}
          {detection && filteredDetections.length > 0 && (
            <div className="border-t border-gray-200 bg-white">
              <div className="p-5">
                <ResultsSummary
                  detections={filteredDetections}
                  imageWidth={uploaded?.width}
                  imageHeight={uploaded?.height}
                  confidence={confidence}
                  imageOpacity={imageOpacity}
                  maskOpacity={maskOpacity}
                  onImageOpacityChange={setImageOpacity}
                  onMaskOpacityChange={setMaskOpacity}
                />
              </div>
            </div>
          )}

          {/* Map */}
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-600">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Geospatial View</h3>
              </div>
              <span className="text-[11px] text-gray-400">Detection overlay on map</span>
            </div>
            <div className="relative h-[300px]">
              <MapViewer
                imageUrl={uploaded ? getImageFileUrl(uploaded.image_id) : undefined}
                maskUrl={detection ? getMaskUrl(detection.detection_id) : undefined}
                imageOpacity={imageOpacity}
                maskOpacity={maskOpacity}
                detections={filteredDetections}
                visibleClasses={visibleClasses}
                imageWidth={uploaded?.width}
                imageHeight={uploaded?.height}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-[360px] border-l border-gray-200 flex flex-col bg-white">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'controls'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Controls
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'results'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Classes {detection ? `(${new Set(detection.detections.map(d => d.label)).size})` : ''}
            </button>
          </div>

          {activeTab === 'controls' ? (
            <div className="flex-1 overflow-y-auto">
              {/* Upload */}
              <div className="p-5 border-b border-gray-100">
                <p className="section-title mb-3">Upload Image</p>
                <UploadDropzone onUpload={handleUpload} loading={loading} />
                {uploaded && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span className="text-sm text-gray-800 truncate">{uploaded.filename}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 ml-5">
                      {uploaded.width}×{uploaded.height} · {(uploaded.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Confidence */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title">Confidence Threshold</p>
                  <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded tabular-nums">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={100} value={confidence * 100}
                  onChange={e => setConfidence(Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">0%</span>
                  <span className="text-[10px] text-gray-400">100%</span>
                </div>
              </div>

              {/* Run button */}
              <div className="p-5 border-b border-gray-100">
                <button
                  onClick={handleDetect}
                  disabled={!uploaded || loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Processing...
                    </span>
                  ) : 'Run Segmentation'}
                </button>

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                {detection && !loading && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-0.5">
                      ✓ Segmentation complete
                    </p>
                    <p className="text-[11px] text-blue-600">
                      {detection.detections.length} detections in {detection.inference_time_ms}ms
                    </p>
                  </div>
                )}
              </div>

              {/* Export */}
              {detection && (
                <div className="p-5">
                  <p className="section-title mb-3">Export</p>
                  <button onClick={handleExportGeoJson} className="btn-secondary w-full flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export GeoJSON
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5">
              <DetectionPanel
                detections={detection?.detections || []}
                visibleClasses={visibleClasses}
                onToggleClass={handleToggleClass}
                confidence={confidence}
                onConfidenceChange={setConfidence}
                onExportGeoJson={handleExportGeoJson}
                loading={loading}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

