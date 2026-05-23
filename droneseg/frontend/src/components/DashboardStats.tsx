'use client'

import { DetectResponse } from '@/types'

interface Props {
  detection: DetectResponse | null
  uploaded: boolean
  modelStatus: { loaded: boolean; name: string } | null
}

export default function DashboardStats({ detection, uploaded, modelStatus }: Props) {
  const totalDetections = detection?.detections.length ?? 0
  const uniqueClasses = detection ? new Set(detection.detections.map(d => d.label)).size : 0
  const avgConfidence = detection && totalDetections > 0
    ? (detection.detections.reduce((s, d) => s + d.confidence, 0) / totalDetections * 100).toFixed(1)
    : '—'
  const totalPixelArea = detection
    ? detection.detections.reduce((s, d) => s + d.pixel_area, 0)
    : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Detections"
        value={totalDetections.toString()}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h18" />
          </svg>
        }
        color="blue"
      />
      <StatCard
        label="Classes Found"
        value={uniqueClasses.toString()}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        }
        color="green"
      />
      <StatCard
        label="Avg Confidence"
        value={avgConfidence === '—' ? '—' : `${avgConfidence}%`}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        }
        color="amber"
      />
      <StatCard
        label="Inference"
        value={detection ? `${detection.inference_time_ms}ms` : '—'}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        }
        color="purple"
      />
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>
          <p className="text-[11px] text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
