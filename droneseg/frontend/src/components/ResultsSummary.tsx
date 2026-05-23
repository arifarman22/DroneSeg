'use client'

import { DetectionItem } from '@/types'

interface Props {
  detections: DetectionItem[]
  imageWidth?: number
  imageHeight?: number
}

export default function ResultsSummary({ detections, imageWidth, imageHeight }: Props) {
  if (detections.length === 0) return null

  const totalPixels = (imageWidth ?? 1) * (imageHeight ?? 1)

  // Group by class
  const classMap = new Map<string, { count: number; area: number; confidence: number; color: number[] }>()
  for (const d of detections) {
    const existing = classMap.get(d.label)
    if (existing) {
      existing.count++
      existing.area += d.pixel_area
      existing.confidence += d.confidence
    } else {
      classMap.set(d.label, { count: 1, area: d.pixel_area, confidence: d.confidence, color: d.color })
    }
  }

  const sorted = Array.from(classMap.entries())
    .map(([label, data]) => ({ label, ...data, avgConf: data.confidence / data.count }))
    .sort((a, b) => b.area - a.area)

  const maxArea = sorted[0]?.area ?? 1

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">Segmentation Breakdown</p>
        <span className="text-[11px] text-gray-400">{sorted.length} classes</span>
      </div>
      <div className="space-y-2.5">
        {sorted.map(cls => {
          const pct = totalPixels > 0 ? (cls.area / totalPixels * 100) : 0
          return (
            <div key={cls.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: `rgb(${cls.color.join(',')})` }}
                  />
                  <span className="text-sm text-gray-700 capitalize">{cls.label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{pct.toFixed(1)}%</span>
                  <span className="tabular-nums">{(cls.avgConf * 100).toFixed(0)}% conf</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(cls.area / maxArea) * 100}%`,
                    backgroundColor: `rgb(${cls.color.join(',')})`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
