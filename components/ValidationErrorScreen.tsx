'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Camera, Sparkles, RefreshCw, ImageOff, Sun, Focus, FileQuestion, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getRandomTopic } from '@/lib/surprise-topics'
import { useExplorationStore } from '@/lib/store'

type ValidationIssue = 'blur' | 'exposure' | 'multiple_subjects' | 'non_scientific' | 'ambiguous'

interface ValidationErrorScreenProps {
  issue: ValidationIssue
  suggestion?: string
  partialIdentification?: string
}

const ISSUE_CONFIG: Record<ValidationIssue, {
  icon: React.ReactNode
  title: string
  message: string
}> = {
  blur: {
    icon: <Focus className="w-8 h-8" />,
    title: "A bit blurry",
    message: "The image is too blurry for me to identify clearly. A sharper photo would help!",
  },
  exposure: {
    icon: <Sun className="w-8 h-8" />,
    title: "Hard to see",
    message: "The lighting makes it hard to see what's there. Try an image with better lighting.",
  },
  multiple_subjects: {
    icon: <Focus className="w-8 h-8" />,
    title: "Too many things",
    message: "I see several things in this image. Try focusing on just one subject for a deeper exploration.",
  },
  non_scientific: {
    icon: <FileQuestion className="w-8 h-8" />,
    title: "Not quite right",
    message: "This looks like text, a screenshot, or something I can't explore scientifically. Try a photo of something in nature!",
  },
  ambiguous: {
    icon: <HelpCircle className="w-8 h-8" />,
    title: "Not sure what to explore",
    message: "I can't find a clear scientific angle to explore here. Try something more specific!",
  },
}

export default function ValidationErrorScreen({
  issue,
  suggestion,
  partialIdentification,
}: ValidationErrorScreenProps) {
  const router = useRouter()
  const { startNewExploration, setOriginalObservation, setInitialAnalysis, setInitialLoading } = useExplorationStore()

  const config = ISSUE_CONFIG[issue] || ISSUE_CONFIG.ambiguous

  const handleTryAgain = () => {
    router.push('/')
  }

  const handleSurpriseMe = async () => {
    const topic = getRandomTopic()
    const explorationId = `exp-${Date.now()}`

    startNewExploration(explorationId)
    setOriginalObservation('', '', topic.name)
    setInitialLoading(true)

    router.push(`/explore/${explorationId}`)

    try {
      const response = await fetch('/api/surprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.name }),
      })

      if (!response.ok) {
        throw new Error('Failed to start surprise exploration')
      }

      const analysis = await response.json()
      setInitialAnalysis(analysis)
    } catch (error) {
      useExplorationStore.getState().setInitialError(
        error instanceof Error ? error.message : 'Failed to start exploration'
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6"
      >
        {config.icon}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-3"
      >
        {config.title}
      </motion.h2>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-400 max-w-md mb-4"
      >
        {config.message}
      </motion.p>

      {/* Suggestion if provided */}
      {suggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-start gap-2 bg-surface border border-border rounded-lg p-4 max-w-md mb-6"
        >
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 text-left">{suggestion}</p>
        </motion.div>
      )}

      {/* Partial identification if available */}
      {partialIdentification && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted mb-6"
        >
          I think I see: <span className="text-gray-300">{partialIdentification}</span>
        </motion.p>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <button
          onClick={handleTryAgain}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-border hover:border-accent/50 rounded-xl text-white font-medium transition-all duration-200"
        >
          <Camera className="w-5 h-5" />
          <span>Try Another Image</span>
        </button>

        <button
          onClick={handleSurpriseMe}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-pink-500/50 rounded-xl text-white font-medium transition-all duration-200"
        >
          <Sparkles className="w-5 h-5 text-pink-400" />
          <span>Surprise Me Instead</span>
        </button>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.8 }}
        className="absolute inset-0 pointer-events-none overflow-hidden -z-10"
      >
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </motion.div>
    </motion.div>
  )
}
