'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Sparkles, TrendingUp, Award } from 'lucide-react'
import { useExplorationStore, KnowledgeDepth } from '@/lib/store'

interface Stats {
  totalExplorations: number
  frontiersFound: number
  maxDepth: KnowledgeDepth
  sessionsCount: number
}

const DEPTH_ORDER: KnowledgeDepth[] = ['known', 'investigated', 'debated', 'unknown', 'frontier']

const DEPTH_LABELS: Record<KnowledgeDepth, string> = {
  known: 'Known',
  investigated: 'Investigated',
  debated: 'Debated',
  unknown: 'Unknown',
  frontier: 'Frontier',
}

// Load stats from localStorage
function loadStats(): Stats {
  if (typeof window === 'undefined') {
    return { totalExplorations: 0, frontiersFound: 0, maxDepth: 'known', sessionsCount: 0 }
  }
  try {
    const stored = localStorage.getItem('eok_stats')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
  return { totalExplorations: 0, frontiersFound: 0, maxDepth: 'known', sessionsCount: 0 }
}

// Save stats to localStorage
function saveStats(stats: Stats) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('eok_stats', JSON.stringify(stats))
  } catch (e) {
    console.error('Failed to save stats:', e)
  }
}

export function ExplorationStats() {
  const { tabs } = useExplorationStore()
  const [stats, setStats] = useState<Stats>(loadStats)
  const [showBadge, setShowBadge] = useState(false)

  // Update stats when tabs change
  useEffect(() => {
    const exploredTabs = tabs.filter(t => t.content || t.id === 'start')
    const frontierTabs = tabs.filter(t => t.content?.isFrontier)

    // Find max depth reached
    let maxDepth: KnowledgeDepth = 'known'
    for (const tab of tabs) {
      if (tab.content) {
        const tabDepthIndex = DEPTH_ORDER.indexOf(tab.depth)
        const maxDepthIndex = DEPTH_ORDER.indexOf(maxDepth)
        if (tabDepthIndex > maxDepthIndex) {
          maxDepth = tab.depth
        }
      }
    }

    // Check for new frontier discovery
    const previousFrontiers = stats.frontiersFound
    const currentFrontiers = frontierTabs.length

    setStats(prev => {
      const newStats = {
        ...prev,
        totalExplorations: Math.max(prev.totalExplorations, exploredTabs.length),
        frontiersFound: Math.max(prev.frontiersFound, currentFrontiers),
        maxDepth: DEPTH_ORDER.indexOf(maxDepth) > DEPTH_ORDER.indexOf(prev.maxDepth) ? maxDepth : prev.maxDepth,
      }
      saveStats(newStats)
      return newStats
    })

    // Show badge animation for new frontier
    if (currentFrontiers > previousFrontiers && previousFrontiers > 0) {
      setShowBadge(true)
      setTimeout(() => setShowBadge(false), 3000)
    }
  }, [tabs])

  // Don't show if no exploration yet
  if (stats.totalExplorations === 0 && tabs.length <= 1) {
    return null
  }

  const currentExplored = tabs.filter(t => t.content || t.id === 'start').length
  const currentFrontiers = tabs.filter(t => t.content?.isFrontier).length

  return (
    <>
      {/* Achievement badge popup */}
      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-pink-500/50 rounded-full text-pink-300 shadow-lg shadow-pink-500/20">
              <Award className="w-5 h-5" />
              <span className="font-medium">Frontier Discovered!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 px-4 text-xs sm:text-sm">
        {/* Explored count */}
        <div className="flex items-center gap-1.5 text-muted">
          <Compass className="w-4 h-4 text-accent" />
          <span>
            <motion.span
              key={currentExplored}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-medium text-white"
            >
              {currentExplored}
            </motion.span>
            {' '}explored
          </span>
        </div>

        {/* Frontiers found */}
        {currentFrontiers > 0 && (
          <div className="flex items-center gap-1.5 text-muted">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>
              <motion.span
                key={currentFrontiers}
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-medium text-pink-400"
              >
                {currentFrontiers}
              </motion.span>
              {' '}frontier{currentFrontiers !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Max depth reached */}
        <div className="hidden sm:flex items-center gap-1.5 text-muted">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span>
            Deepest:{' '}
            <span className="font-medium text-purple-400">
              {DEPTH_LABELS[stats.maxDepth]}
            </span>
          </span>
        </div>
      </div>
    </>
  )
}

// Compact version for header/footer
export function StatsCompact() {
  const { tabs } = useExplorationStore()

  const explored = tabs.filter(t => t.content || t.id === 'start').length
  const frontiers = tabs.filter(t => t.content?.isFrontier).length

  if (explored <= 1) return null

  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="flex items-center gap-1">
        <Compass className="w-3 h-3" />
        {explored}
      </span>
      {frontiers > 0 && (
        <span className="flex items-center gap-1 text-pink-400">
          <Sparkles className="w-3 h-3" />
          {frontiers}
        </span>
      )}
    </div>
  )
}
