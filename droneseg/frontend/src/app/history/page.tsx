'use client'

import { useEffect, useState } from 'react'
import HistoryList from '@/components/HistoryList'
import { getHistory } from '@/lib/api'
import { ImageRecord } from '@/types'

export default function HistoryPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(data => setImages(data.images))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Detection History</h1>
        <p className="text-sm text-gray-500 mt-1">Browse all processed drone imagery and segmentation results.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <svg className="w-6 h-6 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      ) : images.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No images processed yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a drone image from the workspace to get started.</p>
        </div>
      ) : (
        <HistoryList images={images} />
      )}
    </div>
  )
}
