'use client'

import { DetectResponse, UploadResponse } from '@/types'

interface Props {
  uploaded: UploadResponse | null
  detection: DetectResponse | null
  modelReady: boolean | null
}

export default function DashboardStats({ uploaded, detection, modelReady }: Props) {
  const stats = [
    {
      label: 'Model Status',
      value: modelReady === null ? '...' : modelReady ? 'Ready' : 'Offline',
      sub: modelReady ? 'SegFormer-B0' : '',
      color: modelReady ? 'text-green-600' : 'text-red-500',
      bg: modelReady ? 'bg-green-50' : 'bg-red-50',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      label: 'Image',
      value: uploaded ? `${uploaded.width}×${uploaded.height}` : '—',
      sub: uploaded ? `${(uploaded.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'No image',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
        </svg>
      ),
    },
    {
      label: 'Detections',
      value: detection ? detection.detections.length.toString() : '—',
      sub: detection ? `${new Set(detection.detections.map(d => d.label)).size} classes` : 'Not run',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h18" />
        </svg>
      ),
    },
    {
      label: 'Inference',
      value: detection ? `${detection.inference_time_ms}ms` : '—',
      sub: detection ? `${(detection.inference_time_ms / 1000).toFixed(2)}s total` : '',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
      ),
    },
    {
      label: 'Avg Confidence',
      value: detection && detection.detections.length > 0
        ? `${(detection.detections.reduce((s, d) => s + d.confidence, 0) / detection.detections.length * 100).toFixed(1)}%`
        : '—',
      sub: detection && detection.detections.length > 0
        ? `Min ${(Math.min(...detection.detections.map(d => d.confidence)) * 100).toFixed(0)}%`
        : '',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {stats.map(s => (
        <div key={s.label} className="card px-4 py-3 min-w-[150px] flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
          </div>
          <p className={`text-base font-semibold ${s.value === '—' ? 'text-gray-300' : 'text-gray-900'}`}>{s.value}</p>
          {s.sub && <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}
