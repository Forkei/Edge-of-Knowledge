'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, FlaskConical, HelpCircle, Sparkles, ChevronRight } from 'lucide-react'

const DEMO_STEPS = [
  {
    id: 'upload',
    title: 'Upload anything curious',
    content: null,
  },
  {
    id: 'doors',
    title: 'Choose your path',
    content: null,
  },
  {
    id: 'explore',
    title: 'Go deeper',
    content: null,
  },
  {
    id: 'frontier',
    title: 'Reach the frontier!',
    content: null,
  },
]

export function LandingDemo() {
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setStep((s) => (s + 1) % DEMO_STEPS.length)
    }, 3000)

    return () => clearInterval(timer)
  }, [isPlaying])

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Demo container */}
      <div className="relative bg-surface/80 backdrop-blur border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-void/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-muted ml-2">Edge of Knowledge</span>
        </div>

        {/* Demo content */}
        <div className="relative h-72 sm:h-80">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <DemoUpload key="upload" />
            )}
            {step === 1 && (
              <DemoDoors key="doors" />
            )}
            {step === 2 && (
              <DemoExplore key="explore" />
            )}
            {step === 3 && (
              <DemoFrontier key="frontier" />
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-3 border-t border-border/50">
          {DEMO_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-accent'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step label */}
      <motion.p
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-sm text-muted mt-3"
      >
        {DEMO_STEPS[step].title}
      </motion.p>
    </div>
  )
}

function DemoUpload() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        {/* Fake image */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-2 border-dashed border-orange-500/50 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Camera className="w-12 h-12 text-orange-400/70" />
          </motion.div>
        </div>

        {/* Upload indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent rounded-full text-xs text-white whitespace-nowrap"
        >
          Butterfly wing uploaded
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function DemoDoors() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center p-4"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {[
          { icon: FlaskConical, label: 'The Science', color: 'blue', delay: 0 },
          { icon: HelpCircle, label: 'The Unknown', color: 'purple', delay: 0.1 },
          { icon: Sparkles, label: 'Experiment', color: 'green', delay: 0.2 },
        ].map((door, i) => (
          <motion.div
            key={door.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: door.delay }}
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${
              i === 0
                ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/50'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <door.icon className={`w-6 h-6 mb-2 ${
              door.color === 'blue' ? 'text-blue-400' :
              door.color === 'purple' ? 'text-purple-400' : 'text-green-400'
            }`} />
            <p className="text-sm font-medium text-white">{door.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function DemoExplore() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 p-4 overflow-hidden"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted mb-4">
        <span>Start</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-blue-400">Science</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-cyan-400">Structural Color</span>
      </div>

      {/* Content preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-semibold text-white">
          Nanoscale Light Manipulation
        </h3>
        <p className="text-sm text-muted line-clamp-2">
          Microscopic structures bend light through interference patterns, creating iridescent colors without any pigment...
        </p>

        {/* Branch options */}
        <div className="flex gap-2 pt-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300"
          >
            Photonic Crystals →
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-muted"
          >
            Evolution of Color →
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DemoFrontier() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        {/* Frontier badge */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(236, 72, 153, 0.3)',
              '0 0 40px rgba(236, 72, 153, 0.5)',
              '0 0 20px rgba(236, 72, 153, 0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-pink-500/50 mb-4"
        >
          <Sparkles className="w-5 h-5 text-pink-400" />
          <span className="text-pink-300 font-medium">FRONTIER REACHED</span>
        </motion.div>

        <h3 className="text-lg font-semibold text-white mb-2">
          Genetic Control of Nanostructures
        </h3>
        <p className="text-sm text-muted max-w-xs mx-auto">
          You've found a genuine mystery! Only 3 papers exist on this topic.
        </p>

        {/* Celebration particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#ec4899', '#a855f7', '#6366f1', '#f59e0b'][i % 4],
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                y: [0, -30],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
