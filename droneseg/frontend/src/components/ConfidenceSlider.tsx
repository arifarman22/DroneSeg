'use client'

interface Props {
  value: number
  onChange: (v: number) => void
  label?: string
}

export default function ConfidenceSlider({ value, onChange, label = 'Confidence' }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">{label}</span>
        <span className="text-xs text-white/80 font-normal tabular-nums">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full h-1 bg-surface-overlay rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-accent
                   [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(99,102,241,0.4)]
                   [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  )
}
