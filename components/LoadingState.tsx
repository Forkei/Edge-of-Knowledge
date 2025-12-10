'use client'

import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { ProgressBar } from './ProgressBar'

interface LoadingStateProps {
  message: string
  subMessage?: string
  mode?: 'analyze' | 'explore'
}

export default function LoadingState({ message, subMessage, mode = 'analyze' }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      {/* Animated compass icon */}
      <motion.div
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center mb-8 border border-accent/30"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Compass className="w-10 h-10 text-accent" />
        </motion.div>
      </motion.div>

      {/* Progress bar with steps */}
      <ProgressBar isLoading={true} mode={mode} />

      {/* Messages */}
      <div className="mt-6 text-center">
        <p className="text-white font-medium mb-1">{message}</p>
        {subMessage && (
          <p className="text-sm text-muted">{subMessage}</p>
        )}
      </div>
    </motion.div>
  )
}
