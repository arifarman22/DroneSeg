'use client'

import { useState, useCallback, useEffect } from 'react'
import MapViewer from '@/components/MapViewer'
import UploadDropzone from '@/components/UploadDropzone'
import DetectionPanel from '@/components/DetectionPanel'
import DashboardStats from '@/components/DashboardStats'
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
  const [modelStatus, setModelStatus] = useState<{ loaded: boolean; name: string } | null>(null)

  useEffect(() => {
    healthCheck().then(res => setModelStatus({ loaded: res.model_loaded, name: '' })).catch(() => {})
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
      const labels = new Set(res.detections.map(d => d.label))
      setVisibleClasses(labels)
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top dashboard stats */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500">
              {modelStatus?.loaded
                ? '✓ Model ready'
                : modelStatus === null ? 'Checking model...' : '✗ Model unavailable'}
              {uploaded && ` · ${uploaded.filename} (${uploaded.width}×${uploaded.height})`}
            </p>
          </div>
          {detection && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {detection.model_used.split('/').pop()}
              </span>
            </div>
          )}
        </div>
        <DashboardStats detection={detection} uploaded={!!uploaded} modelStatus={modelStatus} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map + Results */}
        <div className="flex-1 flex flex-col">
          {/* Map */}
          <div className="flex-1 relative bg-gray-100">
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

            {/* Floating opacity controls */}
            {uploaded && (
              <div className="absolute top-4 left-4 z-20 card p-4 w-52">
                <p className="section-title mb-3">Layers</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500">Image</span>
                      <span className="text-xs text-gray-700 tabular-nums">{(imageOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={imageOpacity * 100}
                      onChange={e => setImageOpacity(Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                  {detection && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">Mask</span>
                        <span className="text-xs text-gray-700 tabular-nums">{(maskOpacity * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={maskOpacity * 100}
                        onChange={e => setMaskOpacity(Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom results summary */}
          {detection && filteredDetections.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-white max-h-[240px] overflow-y-auto">
              <ResultsSummary
                detections={filteredDetections}
                imageWidth={uploaded?.width}
                imageHeight={uploaded?.height}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-[380px] border-l border-gray-200 flex flex-col bg-white">
          {/* Upload section */}
          <div className="p-5 border-b border-gray-100">
            <p className="section-title mb-3">Upload Image</p>
            <UploadDropzone onUpload={handleUpload} loading={loading} />
            {uploaded && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{uploaded.filename}</p>
                  <p className="text-xs text-gray-500">{uploaded.width} × {uploaded.height} · {(uploaded.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Run detection */}
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
                <div className="flex items-center gap-2 text-xs text-blue-700 font-medium mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  Completed in {detection.inference_time_ms}ms
                </div>
                <p className="text-xs text-blue-600">
                  {detection.detections.length} detections · {new Set(detection.detections.map(d => d.label)).size} classes
                </p>
              </div>
            )}
          </div>

          {/* Detection panel */}
          <div className="flex-1 overflow-hidden p-5 flex flex-col">
            <p className="section-title mb-3">Detected Classes</p>
            <div className="flex-1 overflow-y-auto">
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
          </div>
        </aside>
      </div>
    </div>
  )
}
