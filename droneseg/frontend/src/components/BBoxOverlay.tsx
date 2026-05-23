'use client'

import { DetectionItem } from '@/types'

interface Props {
  detections: DetectionItem[]
  imageWidth: number
  imageHeight: number
  visibleClasses?: Set<string>
}

export default function BBoxOverlay({ detections, imageWidth, imageHeight, visibleClasses }: Props) {
  const visible = detections.filter(d => !visibleClasses || visibleClasses.has(d.label))

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {visible.map((d, i) => (
        <g key={i}>
          <rect
            x={d.bbox.x}
            y={d.bbox.y}
            width={d.bbox.width}
            height={d.bbox.height}
            fill={`rgba(${d.color.join(',')}, 0.06)`}
            stroke={`rgb(${d.color.join(',')})`}
            strokeWidth={Math.max(imageWidth * 0.0015, 1.5)}
            rx={2}
          />
          <rect
            x={d.bbox.x}
            y={Math.max(0, d.bbox.y - 16)}
            width={d.label.length * 6.5 + 12}
            height={16}
            fill={`rgb(${d.color.join(',')})`}
            fillOpacity={0.85}
            rx={3}
          />
          <text
            x={d.bbox.x + 5}
            y={Math.max(0, d.bbox.y - 4)}
            fontSize={10}
            fill="white"
            fontFamily="Montserrat, sans-serif"
            fontWeight={300}
          >
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
