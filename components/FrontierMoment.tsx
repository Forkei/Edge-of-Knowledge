'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HorizonLine from './HorizonLine'

interface FrontierMomentProps {
  isVisible: boolean
  reason?: string
  onComplete: () => void
}

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 35,
    size: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
  }))
}

export default function FrontierMoment({ isVisible, reason, onComplete }: FrontierMomentProps) {
  const [showButton, setShowButton] = useState(false)
  const stars = useMemo(() => generateStars(25), [])

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowButton(true), 2500)
      return () => clearTimeout(timer)
    } else {
      setShowButton(false)
    }
  }, [isVisible])

  // Auto-advance after 6 seconds if no interaction
  useEffect(() => {
    if (isVisible && showButton) {
      const timer = setTimeout(onComplete, 4000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, showButton, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: '#030308' }}
        >
          {/* Stars */}
          <div className="absolute inset-0 overflow-hidden">
            {stars.map((star) => (
              <motion.div
                key={star.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.8, scale: 1 }}
                transition={{ delay: 0.5 + star.delay * 0.3, duration: 0.5 }}
                className="absolute rounded-full"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(244,114,182,0.5) 50%, transparent 70%)',
                  boxShadow: '0 0 4px rgba(244,114,182,0.5)',
                  animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Content container */}
          <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-center">
            {/* Horizon line */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-16"
            >
              <HorizonLine />
            </motion.div>

            {/* Main text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="mb-4"
            >
              <span className="text-3xl md:text-4xl font-semibold tracking-wide frontier-text frontier-symbol">
                ✦ FRONTIER DETECTED
              </span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-lg md:text-xl text-gray-300 mb-6"
            >
              You've reached the edge of knowledge.
            </motion.p>

            {/* Reason */}
            {reason && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="text-base text-gray-400 italic mb-12"
              >
                "{reason}"
              </motion.p>
            )}

            {/* CTA Button */}
            <AnimatePresence>
              {showButton && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  onClick={onComplete}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium rounded-xl transition-all duration-300 glow-frontier hover:glow-frontier-intense"
                >
                  Step Into the Unknown
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(244,114,182,0.05) 0%, transparent 100%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
