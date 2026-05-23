'use client'

import { ImageRecord } from '@/types'
import { getImageFileUrl, getMaskUrl } from '@/lib/api'

interface Props {
  images: ImageRecord[]
}

export default function HistoryList({ images }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {images.map(img => {
        const hasDetection = img.detections && img.detections.length > 0
        const detection = hasDetection ? img.detections![0] : null
        const detectionCount = detection?.detectionsJson?.detections?.length || 0

        return (
          <div key={img.id} className="card-hover overflow-hidden group">
            {/* Image preview */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
              <img
                src={getImageFileUrl(img.id)}
                alt={img.originalFilename}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              {detection && (
                <img
                  src={getMaskUrl(detection.id)}
                  alt="mask"
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                />
              )}
              <div className="absolute top-3 right-3">
                {hasDetection ? (
                  <span className="px-2 py-1 text-[11px] font-medium bg-green-100 text-green-700 rounded-md">
                    Processed
                  </span>
                ) : (
                  <span className="px-2 py-1 text-[11px] font-medium bg-amber-100 text-amber-700 rounded-md">
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-800 truncate">{img.originalFilename}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {img.width && img.height && (
                  <span className="text-xs text-gray-400">{img.width} × {img.height}</span>
                )}
                <span className="text-xs text-gray-400">{(img.sizeBytes / 1024).toFixed(0)} KB</span>
                {detection && (
                  <span className="text-xs text-gray-400">{detection.inferenceTimeMs}ms</span>
                )}
              </div>
              {detection && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium text-primary-600">{detectionCount} classes</span>
                  <div className="flex -space-x-0.5 ml-auto">
                    {detection.detectionsJson?.detections?.slice(0, 6).map((d: any, i: number) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: `rgb(${d.color?.join(',') || '150,150,150'})` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-3">
                {new Date(img.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
