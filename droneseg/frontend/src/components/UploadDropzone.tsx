'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
}

export default function UploadDropzone({ onUpload, loading }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onUpload(accepted[0])
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-150
        ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-700 font-medium">
            {isDragActive ? 'Drop image here' : 'Drop drone image or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPEG or PNG, up to 50 MB</p>
        </div>
      </div>
    </div>
  )
}
