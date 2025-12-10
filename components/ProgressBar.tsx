'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Brain, CheckCircle, Loader2 } from 'lucide-react'

interface ProgressStep {
  id: string
  label: string
  icon: React.ReactNode
  duration: number // estimated ms
}

const ANALYZE_STEPS: ProgressStep[] = [
  { id: 'identify', label: 'Identifying observation...', icon: <Search className="w-4 h-4" />, duration: 3000 },
  { id: 'search', label: 'Searching scientific papers...', icon: <Sparkles className="w-4 h-4" />, duration: 4000 },
  { id: 'analyze', label: 'Analyzing with AI...', icon: <Brain className="w-4 h-4" />, duration: 8000 },
]

const EXPLORE_STEPS: ProgressStep[] = [
  { id: 'search', label: 'Searching literature...', icon: <Search className="w-4 h-4" />, duration: 2500 },
  { id: 'frontier', label: 'Detecting research frontier...', icon: <Sparkles className="w-4 h-4" />, duration: 2000 },
  { id: 'generate', label: 'Generating exploration paths...', icon: <Brain className="w-4 h-4" />, duration: 6000 },
]

interface ProgressBarProps {
  isLoading: boolean
  mode?: 'analyze' | 'explore'
  paperCount?: number
  onComplete?: () => void
}

export function ProgressBar({ isLoading, mode = 'analyze', paperCount, onComplete }: ProgressBarProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isExtended, setIsExtended] = useState(false) // When taking longer than expected
  const steps = mode === 'analyze' ? ANALYZE_STEPS : EXPLORE_STEPS
  const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0)

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      setProgress(0)
      setIsExtended(false)
      return
    }

    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 100

      // Calculate which step we should be on
      let accumulated = 0
      let stepIndex = steps.length - 1 // Default to last step

      for (let i = 0; i < steps.length; i++) {
        accumulated += steps[i].duration
        if (elapsed < accumulated) {
          stepIndex = i
          break
        }
      }

      setCurrentStep(stepIndex)

      // Progress calculation: fast up to 85%, then slow crawl to 98%
      if (elapsed < totalDuration) {
        // Normal progress up to 85%
        setProgress((elapsed / totalDuration) * 85)
      } else {
        // Slow crawl from 85% to 98% over additional time
        setIsExtended(true)
        const extraTime = elapsed - totalDuration
        const slowProgress = 85 + Math.min((extraTime / 20000) * 13, 13) // Crawl to 98% over 20 more seconds
        setProgress(slowProgress)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading, steps, totalDuration])

  if (!isLoading) return null

  const currentStepData = steps[currentStep]

  // Extended state message when taking longer
  const extendedLabel = isExtended ? 'Almost there, finalizing...' : currentStepData.label

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Progress bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <motion.div
          key={isExtended ? 'extended' : currentStep}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-accent"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            {isExtended ? <Loader2 className="w-4 h-4" /> : currentStepData.icon}
          </motion.div>
          <span>{extendedLabel}</span>
        </motion.div>
      </div>

      {/* Paper count if available */}
      {paperCount !== undefined && currentStep >= 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-muted mt-2"
        >
          Found {paperCount} relevant papers
        </motion.p>
      )}

      {/* Step dots */}
      <div className="flex justify-center gap-2 mt-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            className={`w-2 h-2 rounded-full ${
              i <= currentStep ? 'bg-accent' : 'bg-white/20'
            }`}
            animate={i === currentStep && !isExtended ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.5, repeat: i === currentStep && !isExtended ? Infinity : 0 }}
          />
        ))}
        {/* Extra dot for extended state */}
        {isExtended && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-purple-400"
          />
        )}
      </div>
    </motion.div>
  )
}

// Inline progress for buttons/cards
export function InlineProgress({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="flex gap-1"
        initial="hidden"
        animate="visible"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-current rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
      <span className="text-sm">Loading...</span>
    </div>
  )
}
