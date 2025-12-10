'use client'

import { motion } from 'framer-motion'

interface HorizonLineProps {
  className?: string
}

export default function HorizonLine({ className = '' }: HorizonLineProps) {
  return (
    <div className={`relative w-full h-16 ${className}`}>
      {/* Main glow line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2"
      >
        {/* Core line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #f472b6 20%, #ec4899 50%, #f472b6 80%, transparent 100%)',
          }}
        />

        {/* Primary glow */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 horizon-glow"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(244,114,182,0.6) 20%, rgba(236,72,153,0.8) 50%, rgba(244,114,182,0.6) 80%, transparent 100%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Secondary diffuse glow */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(244,114,182,0.3) 25%, rgba(236,72,153,0.4) 50%, rgba(244,114,182,0.3) 75%, transparent 95%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Tertiary wide glow */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent 10%, rgba(244,114,182,0.2) 30%, rgba(236,72,153,0.25) 50%, rgba(244,114,182,0.2) 70%, transparent 90%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Upward gradient fade */}
      <div
        className="absolute inset-x-0 bottom-1/2 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(244,114,182,0.08) 0%, transparent 100%)',
        }}
      />

      {/* Downward gradient fade */}
      <div
        className="absolute inset-x-0 top-1/2 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(244,114,182,0.05) 0%, transparent 100%)',
        }}
      />
    </div>
  )
}
