'use client'

interface Props {
  maskUrl: string
  opacity?: number
}

export default function SegMaskOverlay({ maskUrl, opacity = 0.5 }: Props) {
  return (
    <img
      src={maskUrl}
      alt="Segmentation mask"
      className="absolute inset-0 w-full h-full object-contain mix-blend-screen pointer-events-none rounded-xl transition-opacity duration-300"
      style={{ opacity }}
    />
  )
}
