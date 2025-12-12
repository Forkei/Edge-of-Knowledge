'use client'

import { useExplorationStore } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { ExplorationMap } from './ExplorationMap'
import { ExplorationStats } from './ExplorationStats'
import EntryPoint from './EntryPoint'
import ExplorationTab from './ExplorationTab'
import LoadingState from './LoadingState'
import DepthBackground from './DepthBackground'
import AmbientParticles from './AmbientParticles'
import FrontierMoment from './FrontierMoment'
import ValidationErrorScreen from './ValidationErrorScreen'
import AnalyzeProgress from './AnalyzeProgress'

export default function ExplorationCanvas() {
  // Use separate selectors for better re-render behavior
  const initialAnalysis = useExplorationStore(state => state.initialAnalysis)
  const initialLoading = useExplorationStore(state => state.initialLoading)
  const initialError = useExplorationStore(state => state.initialError)
  const validationError = useExplorationStore(state => state.validationError)
  const analyzeProgressEvents = useExplorationStore(state => state.analyzeProgressEvents)
  const tabs = useExplorationStore(state => state.tabs)
  const activeTabId = useExplorationStore(state => state.activeTabId)
  const currentDepth = useExplorationStore(state => state.currentDepth)
  const showFrontierMoment = useExplorationStore(state => state.showFrontierMoment)
  const frontierReason = useExplorationStore(state => state.frontierReason)
  const dismissFrontierMoment = useExplorationStore(state => state.dismissFrontierMoment)

  // Show loading state while getting initial analysis
  if (initialLoading) {
    const hasProgressEvents = analyzeProgressEvents && analyzeProgressEvents.length > 0
    console.log(`[ExplorationCanvas] Loading, progressEvents=`, analyzeProgressEvents?.length || 0)

    return (
      <DepthBackground depth="known">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          {hasProgressEvents ? (
            <AnalyzeProgress events={analyzeProgressEvents} isComplete={false} />
          ) : (
            <LoadingState
              message="Analyzing your observation..."
              subMessage="Identifying subject and mapping knowledge landscape"
            />
          )}
        </div>
      </DepthBackground>
    )
  }

  // Show validation error state (image couldn't be processed)
  if (validationError) {
    return (
      <DepthBackground depth="known">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <ValidationErrorScreen
            issue={validationError.issue}
            suggestion={validationError.suggestion}
            partialIdentification={validationError.partialIdentification}
          />
        </div>
      </DepthBackground>
    )
  }

  // Show error state
  if (initialError) {
    return (
      <DepthBackground depth="known">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-red-400 mb-4">{initialError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent hover:bg-accent-glow rounded-lg text-white transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </DepthBackground>
    )
  }

  // No analysis yet
  if (!initialAnalysis) {
    return (
      <DepthBackground depth="known">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <LoadingState
            message="Preparing exploration..."
            subMessage="Setting up your knowledge journey"
          />
        </div>
      </DepthBackground>
    )
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  return (
    <>
      {/* Frontier Moment Overlay */}
      <FrontierMoment
        isVisible={showFrontierMoment}
        reason={frontierReason || undefined}
        onComplete={dismissFrontierMoment}
      />

      {/* Ambient Particles */}
      <AmbientParticles depth={currentDepth} />

      {/* Main Canvas with Depth Background */}
      <DepthBackground depth={currentDepth}>
        <div className="flex flex-col min-h-[calc(100vh-57px)]">
          {/* Exploration Map */}
          <ExplorationMap />

          {/* Stats Bar */}
          <ExplorationStats />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 sm:py-8">
              <AnimatePresence mode="wait">
                {activeTabId === 'start' ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EntryPoint />
                  </motion.div>
                ) : activeTab ? (
                  <motion.div
                    key={activeTab.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExplorationTab tab={activeTab} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DepthBackground>
    </>
  )
}
