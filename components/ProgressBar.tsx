'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Brain, CheckCircle } from 'lucide-react'

interface ProgressStep {
  id: string
  label: string
  icon: React.ReactNode
  duration: number // estimated ms
}

const ANALYZE_STEPS: ProgressStep[] = [
  { id: 'identify', label: 'Identifying observation...', icon: <Search className="w-4 h-4" />, duration: 2000 },
  { id: 'search', label: 'Searching scientific papers...', icon: <Sparkles className="w-4 h-4" />, duration: 2500 },
  { id: 'analyze', label: 'Analyzing with AI...', icon: <Brain className="w-4 h-4" />, duration: 4000 },
  { id: 'complete', label: 'Ready to explore!', icon: <CheckCircle className="w-4 h-4" />, duration: 500 },
]

const EXPLORE_STEPS: ProgressStep[] = [
  { id: 'search', label: 'Searching literature...', icon: <Search className="w-4 h-4" />, duration: 1500 },
  { id: 'frontier', label: 'Detecting research frontier...', icon: <Sparkles className="w-4 h-4" />, duration: 1000 },
  { id: 'generate', label: 'Generating exploration paths...', icon: <Brain className="w-4 h-4" />, duration: 3500 },
  { id: 'complete', label: 'Exploration ready!', icon: <CheckCircle className="w-4 h-4" />, duration: 500 },
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
  const steps = mode === 'analyze' ? ANALYZE_STEPS : EXPLORE_STEPS

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      setProgress(0)
      return
    }

    let stepIndex = 0
    let stepProgress = 0
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0)
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 100

      // Calculate which step we should be on
      let accumulated = 0
      for (let i = 0; i < steps.length; i++) {
        accumulated += steps[i].duration
        if (elapsed < accumulated) {
          stepIndex = i
          const stepStart = accumulated - steps[i].duration
          stepProgress = ((elapsed - stepStart) / steps[i].duration) * 100
          break
        }
      }

      setCurrentStep(stepIndex)
      setProgress(Math.min((elapsed / totalDuration) * 100, 95)) // Cap at 95% until actually complete

      // Loop back if still loading after all steps
      if (elapsed >= totalDuration) {
        elapsed = totalDuration - steps[steps.length - 1].duration - 500
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading, steps])

  if (!isLoading) return null

  const currentStepData = steps[currentStep]

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
          transition={{ duration: 0.3 }}
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
          key={currentStep}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-accent"
        >
          <motion.div
            animate={{ rotate: currentStep < steps.length - 1 ? 360 : 0 }}
            transition={{ duration: 2, repeat: currentStep < steps.length - 1 ? Infinity : 0, ease: 'linear' }}
          >
            {currentStepData.icon}
          </motion.div>
          <span>{currentStepData.label}</span>
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
              i < currentStep
                ? 'bg-accent'
                : i === currentStep
                ? 'bg-accent'
                : 'bg-white/20'
            }`}
            animate={i === currentStep ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.5, repeat: i === currentStep ? Infinity : 0 }}
          />
        ))}
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
