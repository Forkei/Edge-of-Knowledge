'use client'

import { motion } from 'framer-motion'
import { Microscope, Sparkles, FlaskConical, FileText, ArrowRight } from 'lucide-react'
import { BranchOption, useExplorationStore } from '@/lib/store'

const branchIcons = {
  science: Microscope,
  unknown: Sparkles,
  experiment: FlaskConical,
  paper: FileText,
  custom: Sparkles,
}

const branchColors = {
  science: 'from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-400/40',
  unknown: 'from-purple-500/10 to-pink-500/5 border-purple-500/20 hover:border-purple-400/40',
  experiment: 'from-green-500/10 to-emerald-500/5 border-green-500/20 hover:border-green-400/40',
  paper: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-400/40',
  custom: 'from-gray-500/10 to-gray-500/5 border-gray-500/20 hover:border-gray-400/40',
}

const branchIconColors = {
  science: 'text-blue-400',
  unknown: 'text-purple-400',
  experiment: 'text-green-400',
  paper: 'text-amber-400',
  custom: 'text-gray-400',
}

interface BranchCardProps {
  branch: BranchOption
  parentTabId: string
  delay?: number
}

export default function BranchCard({ branch, parentTabId, delay = 0 }: BranchCardProps) {
  const { addTab, initialAnalysis } = useExplorationStore()

  const Icon = branchIcons[branch.type] || Sparkles
  const colorClass = branchColors[branch.type] || branchColors.custom
  const iconColorClass = branchIconColors[branch.type] || branchIconColors.custom

  const handleClick = async () => {
    const tabId = `${branch.id}-${Date.now()}`

    // Add tab in loading state
    addTab({
      id: tabId,
      title: branch.title,
      type: branch.type,
      parentId: parentTabId,
    })

    // Fetch content
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchType: branch.type,
          branchId: branch.id,
          branchTitle: branch.title,
          context: initialAnalysis?.identification.name,
          originalAnalysis: initialAnalysis,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to explore branch')
      }

      const content = await response.json()
      useExplorationStore.getState().updateTabContent(tabId, content)
    } catch (error) {
      useExplorationStore.getState().setTabError(
        tabId,
        error instanceof Error ? error.message : 'Failed to explore'
      )
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={handleClick}
      className={`group relative bg-gradient-to-br ${colorClass} border rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02]`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg bg-surface/50 flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white mb-1 truncate">
            {branch.title}
          </h4>
          <p className="text-sm text-muted line-clamp-2">
            {branch.teaser}
          </p>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-muted" />
      </div>
    </motion.button>
  )
}
