'use client'

import { DetectionItem } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface Props {
  detections: DetectionItem[]
  imageWidth?: number
  imageHeight?: number
  confidence: number
  imageOpacity: number
  maskOpacity: number
  onImageOpacityChange: (v: number) => void
  onMaskOpacityChange: (v: number) => void
}

interface ClassSummary {
  label: string
  count: number
  area: number
  pct: number
  avgConf: number
  color: string
}

export default function ResultsSummary({ detections, imageWidth, imageHeight, confidence, imageOpacity, maskOpacity, onImageOpacityChange, onMaskOpacityChange }: Props) {
  const filtered = detections.filter(d => d.confidence >= confidence)
  if (filtered.length === 0) return null

  const totalPixels = (imageWidth ?? 1) * (imageHeight ?? 1)

  // Deduplicate pixel_area per class (each bbox of same class has the full class pixel count)
  const classAreaMap = new Map<string, number>()
  for (const d of filtered) {
    classAreaMap.set(d.label, Math.max(classAreaMap.get(d.label) ?? 0, d.pixel_area))
  }
  const totalDetectedArea = Array.from(classAreaMap.values()).reduce((s, a) => s + a, 0)
  const coveragePct = Math.min(totalDetectedArea / totalPixels * 100, 100)
  const uncoveredPct = 100 - coveragePct

  // Group by class — pixel_area is per-class (same value for all bboxes of a class), so take max not sum
  const classMap = new Map<string, ClassSummary>()
  for (const d of filtered) {
    const existing = classMap.get(d.label)
    if (existing) {
      existing.count++
      existing.area = Math.max(existing.area, d.pixel_area)
      existing.avgConf += d.confidence
    } else {
      classMap.set(d.label, {
        label: d.label,
        count: 1,
        area: d.pixel_area,
        pct: 0,
        avgConf: d.confidence,
        color: `rgb(${d.color.join(',')})`,
      })
    }
  }

  const classes = Array.from(classMap.values())
    .map(c => ({ ...c, avgConf: c.avgConf / c.count, pct: c.area / totalPixels * 100 }))
    .sort((a, b) => b.area - a.area)

  // Donut chart data
  const pieData = classes.map(c => ({ name: c.label, value: parseFloat(c.pct.toFixed(2)), color: c.color }))
  if (uncoveredPct > 0.1) {
    pieData.push({ name: 'Uncovered', value: parseFloat(uncoveredPct.toFixed(2)), color: '#f3f4f6' })
  }

  // Bar chart data (top 10)
  const barData = classes.slice(0, 10).map(c => ({
    name: c.label.length > 10 ? c.label.slice(0, 10) + '…' : c.label,
    coverage: parseFloat(c.pct.toFixed(2)),
    confidence: parseFloat((c.avgConf * 100).toFixed(1)),
    color: c.color,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Class Distribution - Donut Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Class Distribution</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{classes.length} classes · {filtered.length} regions</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative w-[180px] h-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-gray-800">{classes.length}</span>
              <span className="text-[10px] text-gray-400">classes</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
            {classes.map(cls => (
              <div key={cls.label} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-gray-50 transition-colors">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cls.color }} />
                <span className="text-[11px] text-gray-700 capitalize flex-1 truncate">{cls.label}</span>
                <span className="text-[11px] font-semibold text-gray-600 tabular-nums">{cls.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coverage Analysis - Bar Chart + Stats + Layers */}
      <div className="card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Coverage Analysis</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Area distribution by class</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] font-semibold text-green-700">{coveragePct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Coverage ring gauge */}
        <div className="flex items-center gap-5 mb-4">
          <div className="relative w-[72px] h-[72px] shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke="#10b981" strokeWidth="4"
                strokeDasharray={`${coveragePct * 0.88} 88`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-gray-700">{coveragePct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2">
            <StatCard label="Total Area" value={`${(totalDetectedArea / 1000000).toFixed(2)}M px`} />
            <StatCard label="Classes" value={`${classes.length}`} />
            <StatCard label="Regions" value={`${filtered.length}`} />
            <StatCard label="Avg Conf" value={`${(filtered.reduce((s, d) => s + d.confidence, 0) / filtered.length * 100).toFixed(0)}%`} />
          </div>
        </div>

        {/* Horizontal bar chart */}
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={70} />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Layers control */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Layers</p>
          <div className="space-y-3">
            <LayerSlider label="Image" value={imageOpacity} onChange={onImageOpacityChange} />
            <LayerSlider label="Mask" value={maskOpacity} onChange={onMaskOpacityChange} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-bold text-gray-700 mt-0.5">{value}</p>
    </div>
  )
}

function LayerSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-gray-600 font-medium">{label}</span>
        <span className="text-[11px] text-gray-700 font-semibold tabular-nums">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={value * 100}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
      />
    </div>
  )
}
