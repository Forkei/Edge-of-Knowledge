'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

interface FrontierMomentProps {
  isVisible: boolean
  reason?: string
  onComplete: () => void
}

export default function FrontierMoment({ isVisible, reason, onComplete }: FrontierMomentProps) {
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setDismissed(false)
    }
  }, [isVisible])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (isVisible && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true)
        onComplete()
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, dismissed, onComplete])

  const handleDismiss = () => {
    setDismissed(true)
    onComplete()
  }

  return (
    <AnimatePresence>
      {isVisible && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: 20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="relative bg-gradient-to-br from-pink-950/90 to-purple-950/90 backdrop-blur-lg border border-pink-500/30 rounded-2xl p-4 shadow-xl shadow-pink-500/10">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-pink-300/60 hover:text-pink-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3 pr-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-pink-200 mb-1">
                  Frontier Reached
                </h3>
                <p className="text-xs text-pink-300/80 leading-relaxed">
                  {reason || "You've reached an area with limited published research."}
                </p>
              </div>
            </div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none" />

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500/50 to-purple-500/50 origin-left rounded-b-2xl"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
