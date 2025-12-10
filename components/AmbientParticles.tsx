'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KnowledgeDepth } from './DepthBackground'

interface AmbientParticlesProps {
  depth: KnowledgeDepth
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  twinkleDuration: number
  twinkleDelay: number
  floatDuration: number
  floatDelay: number
  opacity: number
}

const depthParticleCounts: Record<KnowledgeDepth, number> = {
  known: 0,
  investigated: 8,
  debated: 15,
  unknown: 25,
  frontier: 35,
}

const depthOpacity: Record<KnowledgeDepth, number> = {
  known: 0,
  investigated: 0.3,
  debated: 0.5,
  unknown: 0.7,
  frontier: 1,
}

function generateParticles(count: number, baseOpacity: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 60, // Upper 60% of screen
    size: 2 + Math.random() * 3,
    twinkleDuration: 2 + Math.random() * 4,
    twinkleDelay: Math.random() * 5,
    floatDuration: 6 + Math.random() * 8,
    floatDelay: Math.random() * 5,
    opacity: baseOpacity * (0.5 + Math.random() * 0.5),
  }))
}

export default function AmbientParticles({ depth }: AmbientParticlesProps) {
  const count = depthParticleCounts[depth]
  const baseOpacity = depthOpacity[depth]

  const particles = useMemo(
    () => generateParticles(count, baseOpacity),
    [count, baseOpacity]
  )

  if (count === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: particle.opacity, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, delay: particle.id * 0.02 }}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: depth === 'frontier'
                ? 'radial-gradient(circle, rgba(244,114,182,0.9) 0%, rgba(244,114,182,0) 70%)'
                : 'radial-gradient(circle, rgba(236,72,153,0.7) 0%, rgba(236,72,153,0) 70%)',
              boxShadow: depth === 'frontier'
                ? '0 0 6px rgba(244,114,182,0.5)'
                : '0 0 4px rgba(236,72,153,0.3)',
              animation: `
                twinkle ${particle.twinkleDuration}s ease-in-out ${particle.twinkleDelay}s infinite,
                particleFloat ${particle.floatDuration}s ease-in-out ${particle.floatDelay}s infinite
              `,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
