'use client'

import { motion } from 'framer-motion'
import { Microscope, Sparkles, FlaskConical, FileText, Flame, Snowflake } from 'lucide-react'
import { useExplorationStore, Door } from '@/lib/store'
import ConfidenceMeter from './ConfidenceMeter'
import ResearchHeat from './ResearchHeat'

const doorIcons = {
  science: Microscope,
  unknown: Sparkles,
  experiment: FlaskConical,
}

const doorColors = {
  science: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-400/50',
  unknown: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 hover:border-purple-400/50',
  experiment: 'from-green-500/20 to-emerald-500/10 border-green-500/30 hover:border-green-400/50',
}

const doorIconColors = {
  science: 'text-blue-400',
  unknown: 'text-purple-400',
  experiment: 'text-green-400',
}

export default function EntryPoint() {
  const {
    originalImage,
    initialAnalysis,
    addTab,
    setTabLoading,
  } = useExplorationStore()

  if (!initialAnalysis) return null

  const handleDoorClick = async (door: Door) => {
    const tabId = `${door.id}-${Date.now()}`

    // Add tab (will be in loading state)
    addTab({
      id: tabId,
      title: door.title,
      type: door.id,
      parentId: 'start',
    })

    // Trigger exploration API call
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchType: door.id,
          context: initialAnalysis.identification.name,
          originalAnalysis: initialAnalysis,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to explore branch')
      }

      const content = await response.json()
      useExplorationStore.getState().updateTabContent(tabId, content)
    } catch (error) {
      useExplorationStore.getState().setTabError(
        tabId,
        error instanceof Error ? error.message : 'Failed to explore'
      )
    }
  }

  return (
    <div className="space-y-8">
      {/* Observation Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-surface to-deep border border-border rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
      >
        {/* Image thumbnail */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          <img
            src={`data:image/jpeg;base64,${originalImage}`}
            alt="Observation"
            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-border"
          />
        </div>

        {/* Identification */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white line-clamp-2 sm:truncate">
              {initialAnalysis.identification.name}
            </h1>
            <div className="flex-shrink-0">
              <ConfidenceMeter confidence={initialAnalysis.identification.confidence} />
            </div>
          </div>

          <p className="text-gray-300 mb-4 text-sm sm:text-base">
            {initialAnalysis.identification.oneLiner}
          </p>

          {/* Research stats - wrap on mobile */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted">
              <FileText className="w-4 h-4" />
              <span>{initialAnalysis.paperCount} papers</span>
            </div>
            <div className="text-muted">
              Last: {initialAnalysis.lastStudied}
            </div>
            <ResearchHeat heat={initialAnalysis.researchActivity} />
          </div>
        </div>
      </motion.div>

      {/* Three Doors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {initialAnalysis.doors.map((door, index) => {
          const Icon = doorIcons[door.id]
          return (
            <motion.button
              key={door.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => handleDoorClick(door)}
              className={`group relative bg-gradient-to-br ${doorColors[door.id]} border rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-surface/50 flex items-center justify-center mb-4 ${doorIconColors[door.id]}`}>
                <Icon className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {door.title}
              </h3>

              {/* Teaser */}
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {door.teaser}
              </p>

              {/* Research heat indicator */}
              <div className="flex items-center justify-between">
                <ResearchHeat heat={door.paperHint} size="sm" />
                <span className="text-sm text-muted group-hover:text-white transition-colors">
                  Explore →
                </span>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
