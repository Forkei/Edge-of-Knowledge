'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, ExternalLink } from 'lucide-react'
import { Citation } from '@/lib/store'

interface CitationBadgeProps {
  count: number
  citations?: Citation[]
}

export default function CitationBadge({ count, citations = [] }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Badge button */}
      <button
        onClick={() => citations.length > 0 && setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium transition-colors ${
          citations.length > 0 ? 'hover:bg-amber-500/30 cursor-pointer' : 'cursor-default'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>{count} papers</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-white">
                  Referenced Papers ({count})
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-border transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Paper list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {citations.map((citation) => (
                  <a
                    key={citation.paperId}
                    href={citation.url || `https://www.semanticscholar.org/paper/${citation.paperId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-deep hover:bg-border/50 border border-border rounded-xl transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium group-hover:text-accent transition-colors line-clamp-2">
                          {citation.title}
                        </p>
                        <p className="text-sm text-muted mt-1">
                          {citation.authors}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                          <span>{citation.year}</span>
                          {citation.citationCount !== undefined && (
                            <span>{citation.citationCount} citations</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted flex-shrink-0 group-hover:text-accent transition-colors" />
                    </div>
                  </a>
                ))}

                {citations.length === 0 && (
                  <p className="text-center text-muted py-8">
                    No papers available
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
