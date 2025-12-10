'use client'

import { Flame, ThermometerSun, Thermometer, Snowflake } from 'lucide-react'

type HeatLevel = 'hot' | 'warm' | 'cold' | 'dormant'

interface ResearchHeatProps {
  heat: HeatLevel
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const heatConfig = {
  hot: {
    icon: Flame,
    label: 'Hot',
    description: 'Active research',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  warm: {
    icon: ThermometerSun,
    label: 'Warm',
    description: 'Recent activity',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  cold: {
    icon: Thermometer,
    label: 'Cool',
    description: 'Limited recent work',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  dormant: {
    icon: Snowflake,
    label: 'Dormant',
    description: 'No recent papers',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
}

export default function ResearchHeat({
  heat,
  showLabel = false,
  size = 'md',
}: ResearchHeatProps) {
  const config = heatConfig[heat]
  const Icon = config.icon

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full ${config.bgColor}`}
      title={config.description}
    >
      <Icon className={`${iconSize} ${config.color}`} />
      {showLabel && (
        <span className={`${textSize} font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  )
}
