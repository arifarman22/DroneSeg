'use client'

import { DetectionItem } from '@/types'

interface Props {
  detections: DetectionItem[]
  visibleClasses: Set<string>
  onToggleClass: (label: string) => void
  confidence: number
  onConfidenceChange: (v: number) => void
  onExportGeoJson: () => void
  loading: boolean
}

export default function DetectionPanel({
  detections,
  visibleClasses,
  onToggleClass,
  confidence,
  onConfidenceChange,
  onExportGeoJson,
  loading,
}: Props) {
  const filtered = detections.filter(d => d.confidence >= confidence)

  const classMap = new Map<string, { items: DetectionItem[]; totalArea: number }>()
  for (const d of filtered) {
    const existing = classMap.get(d.label)
    if (existing) {
      existing.items.push(d)
      existing.totalArea += d.pixel_area
    } else {
      classMap.set(d.label, { items: [d], totalArea: d.pixel_area })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Confidence threshold */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Confidence Threshold</span>
          <span className="text-xs font-semibold text-gray-800 tabular-nums bg-gray-100 px-2 py-0.5 rounded">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={confidence * 100}
          onChange={e => onConfidenceChange(Number(e.target.value) / 100)}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">0%</span>
          <span className="text-[10px] text-gray-400">100%</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-gray-500">Running segmentation...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No detections above threshold</p>
          <p className="text-xs text-gray-400 mt-1">Upload an image and run segmentation</p>
        </div>
      )}

      {/* Class list */}
      {!loading && filtered.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {Array.from(classMap.entries()).map(([label, { items, totalArea }]) => {
            const sample = items[0]
            const isVisible = visibleClasses.has(label)
            const avgConf = items.reduce((s, i) => s + i.confidence, 0) / items.length

            return (
              <div
                key={label}
                className={`p-3 rounded-lg border transition-all duration-150 ${
                  isVisible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Visibility toggle */}
                  <button
                    onClick={() => onToggleClass(label)}
                    className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isVisible ? `rgb(${sample.color.join(',')})` : 'white',
                      borderColor: `rgb(${sample.color.join(',')})`,
                    }}
                  >
                    {isVisible && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Class info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate capitalize">{label}</span>
                      <span className="text-xs font-semibold text-gray-600 ml-2 tabular-nums">
                        {(avgConf * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {items.length} region{items.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400">
                        {totalArea.toLocaleString()} px²
                      </span>
                    </div>
                  </div>

                  {/* Color swatch */}
                  <div
                    className="w-6 h-6 rounded shrink-0 border border-gray-200"
                    style={{ backgroundColor: `rgb(${sample.color.join(',')})` }}
                  />
                </div>

                {/* Confidence bar */}
                <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${avgConf * 100}%`,
                      backgroundColor: `rgb(${sample.color.join(',')})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Export button */}
      {!loading && filtered.length > 0 && (
        <div className="pt-4 mt-4 border-t border-gray-100">
          <button onClick={onExportGeoJson} className="btn-secondary w-full flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export GeoJSON
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            {filtered.length} detection{filtered.length > 1 ? 's' : ''} across {classMap.size} class{classMap.size > 1 ? 'es' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
