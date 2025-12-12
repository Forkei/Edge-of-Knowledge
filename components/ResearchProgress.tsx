'use client'

import { motion, AnimatePresence } from 'framer-motion'

export interface ProgressEvent {
  stage: 'starting' | 'thinking' | 'searching' | 'reading' | 'analyzing' | 'generating' | 'complete'
  message: string
  iteration?: number
  toolName?: string
  toolArgs?: Record<string, unknown>
  papersFound?: number
  webResultsFound?: number
  detail?: string
}

interface ResearchProgressProps {
  events: ProgressEvent[]
  isComplete: boolean
}

const stageIcons: Record<ProgressEvent['stage'], string> = {
  starting: '🚀',
  thinking: '🤔',
  searching: '🔍',
  reading: '📖',
  analyzing: '🧠',
  generating: '✍️',
  complete: '✅',
}

const stageColors: Record<ProgressEvent['stage'], string> = {
  starting: 'text-blue-400',
  thinking: 'text-purple-400',
  searching: 'text-cyan-400',
  reading: 'text-amber-400',
  analyzing: 'text-pink-400',
  generating: 'text-green-400',
  complete: 'text-emerald-400',
}

export default function ResearchProgress({ events, isComplete }: ResearchProgressProps) {
  const latestEvent = events[events.length - 1]
  const papersFound = latestEvent?.papersFound || 0
  const webResultsFound = latestEvent?.webResultsFound || 0
  const iteration = latestEvent?.iteration || 0

  return (
    <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {isComplete ? 'Research Complete' : 'Researching...'}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400">📄</span>
            <span className="text-muted">{papersFound} papers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400">🌐</span>
            <span className="text-muted">{webResultsFound} web</span>
          </div>
          {iteration > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">🔄</span>
              <span className="text-muted">Iteration {iteration}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-4">
        <motion.div
          className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500'}`}
          initial={{ width: '0%' }}
          animate={{
            width: isComplete ? '100%' : `${Math.min(10 + iteration * 15, 90)}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Event log */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {events.slice(-8).map((event, idx) => (
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
              <span className="text-muted">
                {event.message}
                {event.detail && (
                  <span className="text-muted/60 ml-1">
                    — {event.detail.slice(0, 50)}...
                  </span>
                )}
              </span>
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
