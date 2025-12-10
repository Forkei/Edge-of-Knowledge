'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, BookOpen } from 'lucide-react'
import { ScientificTerm } from '@/lib/text-parser'
import { useExplorationStore } from '@/lib/store'

interface TermTooltipProps {
  term: ScientificTerm
  children: ReactNode
  parentTabId?: string
}

export default function TermTooltip({ term, children, parentTabId }: TermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<'above' | 'below'>('below')
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const { addTab, initialAnalysis } = useExplorationStore()

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // Prefer below, but switch to above if not enough space
      setPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'above' : 'below')
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // Close on escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Handle "Explore More" click
  const handleExploreMore = async () => {
    setIsOpen(false)

    const tabId = `term-${term.term.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`

    // Add tab in loading state
    addTab({
      id: tabId,
      title: term.term,
      type: 'custom',
      parentId: parentTabId || 'start',
    })

    // Fetch content for this term
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchType: 'custom',
          branchId: `term-${term.term}`,
          branchTitle: term.term,
          context: initialAnalysis?.identification.name || term.term,
          searchQuery: term.searchQuery || term.term,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to explore term')
      }

      const content = await response.json()
      useExplorationStore.getState().updateTabContent(tabId, content)
    } catch (error) {
      useExplorationStore.getState().setTabError(
        tabId,
        error instanceof Error ? error.message : 'Failed to explore term'
      )
    }
  }

  return (
    <span className="relative inline">
      {/* Trigger */}
      <span
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-accent underline decoration-dotted decoration-accent/50 underline-offset-2 cursor-pointer hover:text-accent-glow hover:decoration-accent transition-colors"
      >
        {children}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: position === 'below' ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'below' ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 left-1/2 -translate-x-1/2 w-72 sm:w-80 ${
              position === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
            }`}
          >
            {/* Arrow */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-surface border-border rotate-45 ${
                position === 'below'
                  ? '-top-1.5 border-l border-t'
                  : '-bottom-1.5 border-r border-b'
              }`}
            />

            {/* Content */}
            <div className="relative bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between p-3 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent flex-shrink-0" />
                  <h4 className="font-semibold text-white text-sm capitalize">
                    {term.term}
                  </h4>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-muted hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Definition */}
              <div className="p-3 pt-2">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {term.definition}
                </p>

                {/* Category badge if available */}
                {term.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">
                    {term.category}
                  </span>
                )}
              </div>

              {/* Action */}
              <div className="px-3 pb-3">
                <button
                  onClick={handleExploreMore}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>Explore This Concept</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// Wrapper component to render parsed text with tooltips
interface ParsedTextProps {
  text: string
  terms: ScientificTerm[]
  parentTabId?: string
}

export function ParsedText({ text, terms, parentTabId }: ParsedTextProps) {
  // Import here to avoid circular dependencies
  const { parseTermsInText } = require('@/lib/text-parser')

  const segments = parseTermsInText(text, terms)

  return (
    <>
      {segments.map((segment: { type: string; content: string; term?: ScientificTerm }, i: number) =>
        segment.type === 'term' && segment.term ? (
          <TermTooltip key={i} term={segment.term} parentTabId={parentTabId}>
            {segment.content}
          </TermTooltip>
        ) : (
          <span key={i}>{segment.content}</span>
        )
      )}
    </>
  )
}
