'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Compass, ArrowDown, Github, Sparkles } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import { useExplorationStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const [imageData, setImageData] = useState<{
    base64: string
    mimeType: string
    preview: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    setOriginalObservation,
    setInitialAnalysis,
    setInitialLoading,
    setInitialError,
    startNewExploration,
  } = useExplorationStore()

  const handleImageSelect = (data: { base64: string; mimeType: string; preview: string }) => {
    if (data.base64) {
      setImageData(data)
      setError(null)
    } else {
      setImageData(null)
      setError(null)
    }
  }

  const handleAnalyze = async (context?: string) => {
    if (!imageData) return

    setIsLoading(true)
    setError(null)

    // Generate exploration ID
    const explorationId = `exp-${Date.now()}`

    // Set up store for exploration
    startNewExploration(explorationId)
    setOriginalObservation(imageData.base64, imageData.mimeType, context || '')
    setInitialLoading(true)

    // Navigate to explore page immediately
    router.push(`/explore/${explorationId}`)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData.base64,
          mimeType: imageData.mimeType,
          context,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setInitialAnalysis(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setInitialError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-void">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-accent/5 via-transparent to-unknown/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-accent" />
            <span className="font-semibold text-white">Edge of Knowledge</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-white transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">Edge of Knowledge</span>
            </h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Where your curiosity meets the frontier of science
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <p className="text-sm text-muted">
              Point at anything curious. Navigate the map of human knowledge.
            </p>
            <ArrowDown className="w-5 h-5 text-muted animate-bounce" />
          </motion.div>
        </div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ImageUpload
            onImageSelect={handleImageSelect}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            selectedImage={imageData?.preview || null}
          />
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid md:grid-cols-3 gap-6 text-center"
        >
          <div className="p-6 rounded-2xl bg-surface/50 border border-border">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">The Science</h3>
            <p className="text-sm text-muted">
              Discover how things work at a fundamental level
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-surface/50 border border-border">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">The Unknown</h3>
            <p className="text-sm text-muted">
              Find genuine mysteries at the frontier
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-surface/50 border border-border">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Investigate</h3>
            <p className="text-sm text-muted">
              Try experiments you can do yourself
            </p>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <h2 className="text-lg font-semibold text-white mb-6">How It Works</h2>
          {/* Mobile: vertical stack, Desktop: horizontal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-sm text-muted">
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border w-full sm:w-auto">
              1. Upload
            </span>
            <span className="text-accent hidden sm:block">→</span>
            <span className="text-accent sm:hidden">↓</span>
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border w-full sm:w-auto">
              2. Choose a path
            </span>
            <span className="text-accent hidden sm:block">→</span>
            <span className="text-accent sm:hidden">↓</span>
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border w-full sm:w-auto">
              3. Go deeper
            </span>
            <span className="text-accent hidden sm:block">→</span>
            <span className="text-accent sm:hidden">↓</span>
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border w-full sm:w-auto">
              4. Build knowledge
            </span>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted">
          <p>
            Built with curiosity for the{' '}
            <a
              href="https://www.kaggle.com/competitions/vibe-code-with-gemini-3"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Kaggle Gemini Competition
            </a>
          </p>
          <p className="mt-1">Powered by Gemini 3 Pro • Semantic Scholar • Real Science</p>
        </div>
      </footer>
    </main>
  )
}
