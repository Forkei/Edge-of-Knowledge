'use client'

import { motion } from 'framer-motion'

// Base skeleton component with shimmer effect
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/5 rounded ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ translateX: ['−100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// Skeleton for the initial analysis/entry point
export function EntryPointSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Image and identification */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Image skeleton */}
        <Skeleton className="w-full sm:w-48 h-48 rounded-2xl flex-shrink-0" />

        {/* Text content */}
        <div className="flex-1 space-y-4">
          {/* Title */}
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          {/* Confidence badge */}
          <Skeleton className="h-6 w-24 rounded-full" />
          {/* One-liner */}
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Door cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-surface/50 border border-border">
            <Skeleton className="h-12 w-12 rounded-full mb-4" />
            <Skeleton className="h-6 w-2/3 rounded mb-2" />
            <Skeleton className="h-4 w-full rounded mb-1" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for exploration tab content
export function ExplorationSkeleton() {
  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
      </div>

      {/* Knowledge map */}
      <div className="p-4 rounded-xl bg-surface/50 border border-border">
        <Skeleton className="h-5 w-32 rounded mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
      </div>

      {/* Citations */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-surface/30 border border-border/50">
            <Skeleton className="h-4 w-full rounded mb-2" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>

      {/* Branch cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-surface/50 border border-border">
            <Skeleton className="h-5 w-3/4 rounded mb-2" />
            <Skeleton className="h-4 w-full rounded mb-1" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for tab bar
export function TabBarSkeleton() {
  return (
    <div className="flex gap-2 p-2 overflow-x-auto">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-lg flex-shrink-0" />
      ))}
    </div>
  )
}

// Inline loading indicator for buttons/small areas
export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <span className="flex items-center gap-2">
      <motion.span
        className="flex gap-1"
        initial="hidden"
        animate="visible"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-current rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.span>
      <span>{text}</span>
    </span>
  )
}
