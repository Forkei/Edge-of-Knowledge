'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AnalyzeProgressEvent } from '@/lib/store'

interface AnalyzeProgressProps {
  events: AnalyzeProgressEvent[]
  isComplete: boolean
}

const stageIcons: Record<AnalyzeProgressEvent['stage'], string> = {
  starting: '🚀',
  identifying: '🔬',
  searching: '🔍',
  'found-papers': '📄',
  analyzing: '🧠',
  complete: '✅',
  error: '❌',
}

const stageColors: Record<AnalyzeProgressEvent['stage'], string> = {
  starting: 'text-blue-400',
  identifying: 'text-cyan-400',
  searching: 'text-purple-400',
  'found-papers': 'text-amber-400',
  analyzing: 'text-pink-400',
  complete: 'text-emerald-400',
  error: 'text-red-400',
}

export default function AnalyzeProgress({ events, isComplete }: AnalyzeProgressProps) {
  const latestEvent = events[events.length - 1]
  const papersFound = latestEvent?.papersFound || 0

  // Get search queries from events
  const searchQueries = events
    .filter(e => e.searchQueries)
    .flatMap(e => e.searchQueries || [])

  // Calculate progress based on stage
  const getProgress = () => {
    if (!latestEvent) return 5
    switch (latestEvent.stage) {
      case 'starting': return 5
      case 'identifying': return 20
      case 'searching': return 40
      case 'found-papers': return 60
      case 'analyzing': return 80
      case 'complete': return 100
      default: return 50
    }
  }

  return (
    <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {isComplete ? 'Analysis Complete' : 'Analyzing Your Image...'}
        </h3>
        {papersFound > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400">📄</span>
            <span className="text-sm text-muted">{papersFound} papers found</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-4">
        <motion.div
          className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'}`}
          initial={{ width: '0%' }}
          animate={{ width: `${getProgress()}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Search queries preview */}
      {searchQueries.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">Searching for:</p>
          <div className="flex flex-wrap gap-2">
            {searchQueries.slice(0, 3).map((query, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300"
              >
                {query}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {events.slice(-6).map((event, idx) => (
            <motion.div
              key={`${event.stage}-${idx}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-2 text-sm ${
                idx === events.length - 1 ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <span className={`${stageColors[event.stage]} flex-shrink-0`}>
                {stageIcons[event.stage]}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-muted">{event.message}</span>
                {event.detail && (
                  <span className="text-muted/60 ml-1">— {event.detail}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Animated dots for active state */}
      {!isComplete && (
        <div className="flex items-center justify-center mt-4 gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-accent"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
