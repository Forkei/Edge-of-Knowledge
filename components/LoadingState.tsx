'use client'

import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

interface LoadingStateProps {
  message: string
  subMessage?: string
}

export default function LoadingState({ message, subMessage }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      {/* Animated search icon */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-6"
      >
        <Search className="w-8 h-8 text-accent" />
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-surface rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-accent-glow"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Messages */}
      <p className="text-white font-medium mb-1">{message}</p>
      {subMessage && (
        <p className="text-sm text-muted">{subMessage}</p>
      )}
    </motion.div>
  )
}
