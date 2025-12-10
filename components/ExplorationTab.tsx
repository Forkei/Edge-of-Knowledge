'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Tab, useExplorationStore } from '@/lib/store'
import BranchCard from './BranchCard'
import ConfidenceMeter from './ConfidenceMeter'
import ResearchHeat from './ResearchHeat'
import CitationBadge from './CitationBadge'
import LoadingState from './LoadingState'

interface ExplorationTabProps {
  tab: Tab
}

export default function ExplorationTab({ tab }: ExplorationTabProps) {
  const { setActiveTab, tabs } = useExplorationStore()

  // Find parent tab for back navigation
  const parentTab = tab.parentId ? tabs.find(t => t.id === tab.parentId) : null

  // Loading state
  if (tab.loading) {
    return (
      <LoadingState
        message="Exploring this branch..."
        subMessage="Searching scientific literature and analyzing findings"
      />
    )
  }

  // Error state
  if (tab.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <p className="text-red-400 mb-4">{tab.error}</p>
        <button
          onClick={() => setActiveTab('start')}
          className="px-4 py-2 bg-surface hover:bg-border rounded-lg text-white transition-colors"
        >
          Back to Start
        </button>
      </motion.div>
    )
  }

  // No content yet
  if (!tab.content) {
    return (
      <LoadingState
        message="Loading content..."
        subMessage="Please wait"
      />
    )
  }

  const { content } = tab

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      {parentTab && (
        <button
          onClick={() => setActiveTab(parentTab.id)}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {parentTab.type === 'start' ? 'Start' : parentTab.title}</span>
        </button>
      )}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl p-4 sm:p-6"
      >
        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
          {content.headline}
        </h2>

        {/* Summary */}
        <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6">
          {content.summary}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <CitationBadge count={content.citations.length} citations={content.citations} />
          <ResearchHeat heat={content.researchHeat} showLabel />
          <ConfidenceMeter confidence={content.confidence} showLabel />
        </div>
      </motion.div>

      {/* Experiments section (if available) */}
      {content.experiments && content.experiments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-white">Try It Yourself</h3>
          <div className="grid gap-4">
            {content.experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                  <h4 className="font-semibold text-white">{experiment.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full w-fit ${
                    experiment.difficulty === 'beginner'
                      ? 'bg-green-500/20 text-green-400'
                      : experiment.difficulty === 'intermediate'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {experiment.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                  <span className="text-green-400">Hypothesis:</span> {experiment.hypothesis}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted mb-2">Materials:</p>
                    <ul className="text-gray-400 space-y-1">
                      {experiment.materials.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-muted mb-2">Steps:</p>
                    <ol className="text-gray-400 space-y-1">
                      {experiment.steps.map((s, i) => (
                        <li key={i}>{i + 1}. {s}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted">Expected Outcome:</p>
                  <p className="text-sm text-gray-300">{experiment.expectedOutcome}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Go Deeper section */}
      {content.branches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-white">Go Deeper</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {content.branches.map((branch, index) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                parentTabId={tab.id}
                delay={index * 0.05}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Papers section */}
      {content.citations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-white">Key Papers</h3>
          <div className="space-y-2">
            {content.citations.slice(0, 5).map((citation) => (
              <a
                key={citation.paperId}
                href={citation.url || `https://www.semanticscholar.org/paper/${citation.paperId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-surface hover:bg-deep border border-border rounded-lg transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm sm:text-base line-clamp-2 sm:truncate group-hover:text-accent transition-colors">
                      {citation.title}
                    </p>
                    <p className="text-xs sm:text-sm text-muted line-clamp-1">
                      {citation.authors} • {citation.year}
                      {citation.citationCount !== undefined && ` • ${citation.citationCount} citations`}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted flex-shrink-0 group-hover:text-accent transition-colors mt-0.5" />
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
