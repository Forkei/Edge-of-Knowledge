'use client'

import { motion } from 'framer-motion'
import { X, Sparkles, Microscope, FlaskConical, FileText, HelpCircle } from 'lucide-react'
import { useExplorationStore, Tab } from '@/lib/store'

const tabIcons = {
  start: Sparkles,
  science: Microscope,
  unknown: HelpCircle,
  experiment: FlaskConical,
  paper: FileText,
  custom: Sparkles,
}

const tabColors = {
  start: 'bg-accent/20 border-accent/50 text-accent',
  science: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  unknown: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  experiment: 'bg-green-500/20 border-green-500/50 text-green-400',
  paper: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  custom: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
}

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useExplorationStore()

  return (
    <div className="sticky top-0 z-10 bg-void/90 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tabIcons[tab.type] || Sparkles
            const isActive = tab.id === activeTabId
            const colorClass = tabColors[tab.type] || tabColors.custom

            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex-shrink-0"
              >
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isActive
                      ? colorClass
                      : 'bg-surface/50 border-border text-muted hover:text-white hover:border-border/80'
                  }`}
                >
                  {/* Loading indicator */}
                  {tab.loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-void"
                    />
                  )}

                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {tab.type === 'start' ? '✦ Start' : tab.title}
                  </span>

                  {/* Close button (not for start tab) - using span to avoid nested button hydration error */}
                  {tab.id !== 'start' && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTab(tab.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          removeTab(tab.id)
                        }
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
