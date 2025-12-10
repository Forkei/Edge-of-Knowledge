'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export type KnowledgeDepth = 'known' | 'investigated' | 'debated' | 'unknown' | 'frontier'

interface DepthBackgroundProps {
  depth: KnowledgeDepth
  children: ReactNode
}

const depthStyles: Record<KnowledgeDepth, {
  bg: string
  gradient: string
  edgeGlow: string
}> = {
  known: {
    bg: 'bg-[#0a1628]',
    gradient: 'from-[#0a1628] via-[#0a1628] to-[#0f1a2e]',
    edgeGlow: '',
  },
  investigated: {
    bg: 'bg-[#0f1a2e]',
    gradient: 'from-[#0f1a2e] via-[#0f1a2e] to-[#1a1a2e]',
    edgeGlow: '',
  },
  debated: {
    bg: 'bg-[#1a1a2e]',
    gradient: 'from-[#1a1a2e] via-[#151525] to-[#0d0d1a]',
    edgeGlow: 'shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]',
  },
  unknown: {
    bg: 'bg-[#0d0d1a]',
    gradient: 'from-[#0d0d1a] via-[#0a0a15] to-[#050510]',
    edgeGlow: 'shadow-[inset_0_0_150px_rgba(236,72,153,0.08)]',
  },
  frontier: {
    bg: 'bg-[#050510]',
    gradient: 'from-[#050510] via-[#050510] to-[#030308]',
    edgeGlow: 'shadow-[inset_0_0_200px_rgba(244,114,182,0.12)]',
  },
}

export default function DepthBackground({ depth, children }: DepthBackgroundProps) {
  const style = depthStyles[depth]

  return (
    <motion.div
      className={`min-h-screen relative depth-transition ${style.bg} ${style.edgeGlow}`}
      initial={false}
      animate={{
        backgroundColor: depth === 'known' ? '#0a1628' :
                        depth === 'investigated' ? '#0f1a2e' :
                        depth === 'debated' ? '#1a1a2e' :
                        depth === 'unknown' ? '#0d0d1a' : '#050510'
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${style.gradient} pointer-events-none transition-opacity duration-500`}
      />

      {/* Edge glow for deeper depths */}
      {(depth === 'unknown' || depth === 'frontier') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: depth === 'frontier'
              ? 'radial-gradient(ellipse at bottom, rgba(244,114,182,0.1) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at bottom, rgba(236,72,153,0.05) 0%, transparent 50%)'
          }}
        />
      )}

      {/* Vignette effect for frontier */}
      {depth === 'frontier' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)'
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
