'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Compass, ArrowLeft } from 'lucide-react'
import { useExplorationStore } from '@/lib/store'
import ExplorationCanvas from '@/components/ExplorationCanvas'

export default function ExplorePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const {
    explorationId,
    originalImage,
    initialAnalysis,
    initialLoading,
    initialError,
  } = useExplorationStore()

  // If no exploration data, redirect to home
  useEffect(() => {
    if (!originalImage && !initialLoading) {
      router.push('/')
    }
  }, [originalImage, initialLoading, router])

  if (!originalImage) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted"
        >
          Loading exploration...
        </motion.div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-void">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-accent/5 via-transparent to-unknown/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-border/50 bg-void/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-muted hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">New Observation</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-accent" />
              <span className="font-medium text-white">Edge of Knowledge</span>
            </div>
          </div>
        </div>
      </header>

      {/* Exploration Canvas */}
      <div className="relative z-10">
        <ExplorationCanvas />
      </div>
    </main>
  )
}
