'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Github, Sparkles, LogOut, Shuffle, BookOpen, Search, Zap } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import { LandingDemo } from '@/components/LandingDemo'
import { useExplorationStore } from '@/lib/store'
import { getRandomTopic } from '@/lib/surprise-topics'
import { startStreamingAnalyze } from '@/lib/use-streaming-analyze'

export default function Home() {
  const router = useRouter()
  const [imageData, setImageData] = useState<{
    base64: string
    mimeType: string
    preview: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSurpriseLoading, setIsSurpriseLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)

  // Example discoveries data with images
  const exampleDiscoveries = [
    {
      topic: 'Butterfly wings',
      path: 'Butterfly wings → Photonic crystals → Unsolved: Genetic encoding',
      teaser: 'Explore how butterfly wing scales create iridescent colors',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=120&h=80&fit=crop&q=80'
    },
    {
      topic: 'Crystals',
      path: 'Crystals → Piezoelectricity → Frontier: Quantum effects',
      teaser: 'Discover the electrical properties of crystalline structures',
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=120&h=80&fit=crop&q=80'
    },
    {
      topic: 'Lightning',
      path: 'Lightning → Plasma physics → Mystery: Ball lightning',
      teaser: 'Investigate the science behind electrical storms',
      image: 'https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?w=120&h=80&fit=crop&q=80'
    },
    {
      topic: 'Spider silk',
      path: 'Spider silk → Protein structure → Unknown: Self-assembly',
      teaser: 'Learn about nature\'s strongest material',
      image: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=120&h=80&fit=crop&q=80'
    },
    {
      topic: 'Northern lights',
      path: 'Northern lights → Solar wind → Frontier: Prediction',
      teaser: 'Explore the aurora borealis phenomenon',
      image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=120&h=80&fit=crop&q=80'
    },
    {
      topic: 'Honeycomb',
      path: 'Honeycomb → Structural efficiency → Debate: Optimization',
      teaser: 'Discover why bees build hexagonal cells',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=80&fit=crop&q=80'
    },
  ]

  // Auto-rotate carousel (7 seconds - slower for readability)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % exampleDiscoveries.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [exampleDiscoveries.length])

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

    const explorationId = `exp-${Date.now()}`
    startNewExploration(explorationId)
    setOriginalObservation(imageData.base64, imageData.mimeType, context || '')

    // Start streaming analyze in background (don't await - let it run while navigating)
    // The streaming function updates the global store which the explore page reads
    startStreamingAnalyze({
      image: imageData.base64,
      mimeType: imageData.mimeType,
      context,
    }).finally(() => {
      setIsLoading(false)
    })

    // Navigate to explore page - it will show progress from the store
    router.push(`/explore/${explorationId}`)
  }

  const handleSurpriseMe = async () => {
    setIsSurpriseLoading(true)
    setError(null)

    const topic = getRandomTopic()
    const explorationId = `exp-${Date.now()}`

    startNewExploration(explorationId)
    setOriginalObservation('', '', topic.name) // No image, just topic
    setInitialLoading(true)

    router.push(`/explore/${explorationId}`)

    try {
      const response = await fetch('/api/surprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.name,
          teaser: topic.teaser,
          category: topic.category,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setInitialAnalysis(data)
    } catch (err) {
      setInitialError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSurpriseLoading(false)
    }
  }

  const handleExampleClick = async (example: typeof exampleDiscoveries[0]) => {
    setIsSurpriseLoading(true)
    setError(null)

    const explorationId = `exp-${Date.now()}`

    startNewExploration(explorationId)
    setOriginalObservation('', '', example.topic)
    setInitialLoading(true)

    router.push(`/explore/${explorationId}`)

    try {
      const response = await fetch('/api/surprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: example.topic,
          teaser: example.teaser,
          category: 'science',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setInitialAnalysis(data)
    } catch (err) {
      setInitialError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSurpriseLoading(false)
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
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Forkei/Edge-of-Knowledge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button
              onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' })
                router.push('/login')
                router.refresh()
              }}
              className="text-muted hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">Edge of Knowledge</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-2">
              Upload any image. Discover what science knows—and doesn't know—about it.
            </p>
            <p className="text-sm text-muted/70 max-w-xl mx-auto">
              Follow your curiosity from established facts → active debates → unsolved mysteries
            </p>
          </motion.div>
        </div>

        {/* Demo + Upload Section */}
        <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
          {/* Left: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-sm font-medium text-muted mb-3 text-center lg:text-left">
              See how it works
            </h2>
            <LandingDemo />
          </motion.div>

          {/* Right: Upload + Surprise */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-sm font-medium text-muted mb-3 text-center lg:text-left">
              Start exploring
            </h2>

            <ImageUpload
              onImageSelect={handleImageSelect}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              selectedImage={imageData?.preview || null}
            />

            {/* Surprise Me Button */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted mb-2">or try a random fascinating topic</p>
              <button
                onClick={handleSurpriseMe}
                disabled={isSurpriseLoading || isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:border-purple-500/50 hover:text-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSurpriseLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    <span>Finding something amazing...</span>
                  </>
                ) : (
                  <>
                    <Shuffle className="w-4 h-4" />
                    <span>Surprise Me</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Value Proposition Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12"
        >
          <div className="p-5 md:p-6 rounded-2xl bg-surface/50 border border-border hover:border-blue-500/30 transition-colors group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Real Science</h3>
            <p className="text-sm text-muted">
              Backed by 200M+ academic papers from Semantic Scholar. Not AI hallucinations—actual research.
            </p>
          </div>

          <div className="p-5 md:p-6 rounded-2xl bg-surface/50 border border-border hover:border-purple-500/30 transition-colors group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Endless Paths</h3>
            <p className="text-sm text-muted">
              Follow your curiosity down branching rabbit holes. Each click opens new questions to explore.
            </p>
          </div>

          <div className="p-5 md:p-6 rounded-2xl bg-surface/50 border border-border hover:border-pink-500/30 transition-colors group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-pink-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Find Frontiers</h3>
            <p className="text-sm text-muted">
              Reach genuine mysteries that science hasn't solved yet. You'll know when you've hit the edge.
            </p>
          </div>
        </motion.div>

        {/* Example Discoveries Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-sm font-medium text-muted mb-4">Example discoveries — click to explore</h2>

          {/* Carousel Container */}
          <div className="relative max-w-2xl mx-auto">
            {/* Main Carousel Item */}
            <div className="h-28 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.button
                  key={currentExampleIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => handleExampleClick(exampleDiscoveries[currentExampleIndex])}
                  disabled={isSurpriseLoading || isLoading}
                  className="group px-4 py-3 rounded-2xl bg-gradient-to-r from-surface/80 to-surface/50 border border-border hover:border-accent/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    {/* Image thumbnail */}
                    <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-border group-hover:ring-accent/50 transition-all">
                      <img
                        src={exampleDiscoveries[currentExampleIndex].image}
                        alt={exampleDiscoveries[currentExampleIndex].topic}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white group-hover:text-accent transition-colors">
                        {exampleDiscoveries[currentExampleIndex].path}
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {exampleDiscoveries[currentExampleIndex].teaser}
                      </div>
                    </div>
                  </div>
                </motion.button>
              </AnimatePresence>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-3">
              {exampleDiscoveries.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentExampleIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentExampleIndex
                      ? 'bg-accent w-6'
                      : 'bg-border hover:bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50">
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
