'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export type KnowledgeDepth = 'known' | 'investigated' | 'debated' | 'unknown' | 'frontier'

interface DepthBackgroundProps {
  depth: KnowledgeDepth
  children: ReactNode
}

const depthConfig: Record<KnowledgeDepth, {
  bg: string
  primary: string
  secondary: string
  glow: string
  intensity: number
}> = {
  known: {
    bg: '#0a1628',
    primary: '#3b82f6',
    secondary: '#1e3a5f',
    glow: 'rgba(59, 130, 246, 0.1)',
    intensity: 0,
  },
  investigated: {
    bg: '#0f1a2e',
    primary: '#06b6d4',
    secondary: '#164e63',
    glow: 'rgba(6, 182, 212, 0.1)',
    intensity: 0.2,
  },
  debated: {
    bg: '#1a1a2e',
    primary: '#eab308',
    secondary: '#422006',
    glow: 'rgba(234, 179, 8, 0.1)',
    intensity: 0.4,
  },
  unknown: {
    bg: '#0d0d1a',
    primary: '#a855f7',
    secondary: '#3b0764',
    glow: 'rgba(168, 85, 247, 0.15)',
    intensity: 0.7,
  },
  frontier: {
    bg: '#050510',
    primary: '#ec4899',
    secondary: '#831843',
    glow: 'rgba(236, 72, 153, 0.2)',
    intensity: 1,
  },
}

export default function DepthBackground({ depth, children }: DepthBackgroundProps) {
  const config = depthConfig[depth]
  const isFrontier = depth === 'frontier'
  const isDeep = depth === 'unknown' || depth === 'frontier'

  return (
    <motion.div
      className="min-h-screen relative overflow-hidden"
      initial={false}
      animate={{ backgroundColor: config.bg }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Base gradient overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{
          background: `radial-gradient(ellipse at 50% 0%, ${config.glow} 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 100%, ${config.glow} 0%, transparent 50%)`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Animated nebula effect for deeper depths */}
      {isDeep && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-30"
            animate={{
              background: [
                `radial-gradient(ellipse at 30% 20%, ${config.glow} 0%, transparent 40%)`,
                `radial-gradient(ellipse at 70% 80%, ${config.glow} 0%, transparent 40%)`,
                `radial-gradient(ellipse at 30% 20%, ${config.glow} 0%, transparent 40%)`,
              ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-20"
            animate={{
              background: [
                `radial-gradient(ellipse at 70% 30%, ${config.secondary}40 0%, transparent 35%)`,
                `radial-gradient(ellipse at 30% 70%, ${config.secondary}40 0%, transparent 35%)`,
                `radial-gradient(ellipse at 70% 30%, ${config.secondary}40 0%, transparent 35%)`,
              ],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Edge glow intensifies with depth */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{
          boxShadow: `inset 0 0 ${100 + config.intensity * 150}px ${config.glow}`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Bottom glow for frontier */}
      {isFrontier && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${config.primary}30 0%, transparent 50%)`,
          }}
        />
      )}

      {/* Pulsing glow for frontier */}
      {isFrontier && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: `radial-gradient(ellipse at center bottom, ${config.primary}20 0%, transparent 40%)`,
          }}
        />
      )}

      {/* Vignette effect - stronger for deeper depths */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{
          background: `radial-gradient(ellipse at center, transparent ${60 - config.intensity * 20}%, rgba(0,0,0,${0.2 + config.intensity * 0.3}) 100%)`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Starfield effect for frontier */}
      {isFrontier && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Depth indicator line at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1"
        initial={false}
        animate={{
          background: `linear-gradient(to right, transparent, ${config.primary}, transparent)`,
          opacity: config.intensity * 0.5,
        }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  )
}
