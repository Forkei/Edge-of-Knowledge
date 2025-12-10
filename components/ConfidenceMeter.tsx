'use client'

interface ConfidenceMeterProps {
  confidence: number // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function ConfidenceMeter({
  confidence,
  showLabel = false,
  size = 'md',
}: ConfidenceMeterProps) {
  // Clamp confidence between 0 and 100
  const clampedConfidence = Math.max(0, Math.min(100, confidence))

  // Determine color based on confidence
  const getColor = () => {
    if (clampedConfidence >= 80) return 'bg-green-500'
    if (clampedConfidence >= 60) return 'bg-yellow-500'
    if (clampedConfidence >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getTextColor = () => {
    if (clampedConfidence >= 80) return 'text-green-400'
    if (clampedConfidence >= 60) return 'text-yellow-400'
    if (clampedConfidence >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  // Generate the bar segments (10 segments for cleaner look)
  const totalSegments = 10
  const filledSegments = Math.round(clampedConfidence / 10)

  const barWidth = size === 'sm' ? 'w-12' : 'w-20'
  const segmentHeight = size === 'sm' ? 'h-1.5' : 'h-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex items-center gap-2">
      {/* Visual bar */}
      <div className={`flex gap-0.5 ${barWidth}`}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 ${segmentHeight} rounded-sm transition-colors ${
              i < filledSegments ? getColor() : 'bg-surface'
            }`}
          />
        ))}
      </div>

      {/* Percentage text */}
      <span className={`${textSize} font-medium ${getTextColor()}`}>
        {clampedConfidence}%
      </span>

      {/* Optional label */}
      {showLabel && (
        <span className={`${textSize} text-muted`}>confidence</span>
      )}
    </div>
  )
}
