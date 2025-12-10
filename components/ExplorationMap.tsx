'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Home, Sparkles } from 'lucide-react'
import { Tab, KnowledgeDepth, useExplorationStore } from '@/lib/store'

interface TreeNode {
  id: string
  title: string
  type: Tab['type']
  depth: KnowledgeDepth
  children: TreeNode[]
  isExplored: boolean
  isCurrent: boolean
  isFrontier: boolean
}

const DEPTH_COLORS: Record<KnowledgeDepth, string> = {
  known: '#3b82f6',      // blue
  investigated: '#06b6d4', // cyan
  debated: '#eab308',     // yellow
  unknown: '#a855f7',     // purple
  frontier: '#ec4899',    // pink
}

const DEPTH_BG_COLORS: Record<KnowledgeDepth, string> = {
  known: 'rgba(59, 130, 246, 0.15)',
  investigated: 'rgba(6, 182, 212, 0.15)',
  debated: 'rgba(234, 179, 8, 0.15)',
  unknown: 'rgba(168, 85, 247, 0.15)',
  frontier: 'rgba(236, 72, 153, 0.15)',
}

export function ExplorationMap() {
  const { tabs, activeTabId, setActiveTab } = useExplorationStore()
  const [isExpanded, setIsExpanded] = useState(true)

  // Build tree structure from tabs
  const tree = useMemo(() => buildTree(tabs, activeTabId), [tabs, activeTabId])

  // Get current path for breadcrumb
  const currentPath = useMemo(() => {
    const path: Tab[] = []
    let currentId = activeTabId
    while (currentId) {
      const tab = tabs.find(t => t.id === currentId)
      if (tab) {
        path.unshift(tab)
        currentId = tab.parentId || ''
      } else {
        break
      }
    }
    return path
  }, [tabs, activeTabId])

  const currentTab = tabs.find(t => t.id === activeTabId)
  const currentDepth = currentTab?.depth || 'known'

  return (
    <div className="border-b border-border/50 bg-surface/30 backdrop-blur-sm">
      {/* Collapsed: Breadcrumb view */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between py-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {currentPath.map((tab, i) => (
              <div key={tab.id} className="flex items-center">
                {i > 0 && (
                  <span className="text-muted/50 mx-1">→</span>
                )}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm whitespace-nowrap transition-colors ${
                    tab.id === activeTabId
                      ? 'bg-white/10 text-white'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.id === 'start' ? (
                    <Home className="w-3.5 h-3.5" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: DEPTH_COLORS[tab.depth] }}
                    />
                  )}
                  <span className="max-w-[120px] truncate">{tab.title}</span>
                  {tab.content?.isFrontier && (
                    <Sparkles className="w-3 h-3 text-pink-400" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Expand/collapse + depth indicator */}
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            {/* Depth badge */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{
                backgroundColor: DEPTH_BG_COLORS[currentDepth],
                color: DEPTH_COLORS[currentDepth],
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: DEPTH_COLORS[currentDepth] }}
              />
              {currentDepth}
            </div>

            {/* Expand button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-white/10 text-muted hover:text-white transition-colors"
              title={isExpanded ? 'Collapse map' : 'Expand map'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded: Tree view */}
        <AnimatePresence>
          {isExpanded && tree && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-4 pt-2 pl-1">
                <TreeView
                  node={tree}
                  onSelect={setActiveTab}
                  level={0}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TreeView({
  node,
  onSelect,
  level,
}: {
  node: TreeNode
  onSelect: (id: string) => void
  level: number
}) {
  const hasChildren = node.children.length > 0

  return (
    <div className="relative">
      {/* Node */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.05 }}
        onClick={() => onSelect(node.id)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          node.isCurrent
            ? 'bg-white/10 ring-2 ring-offset-2 ring-offset-void'
            : 'hover:bg-white/5'
        }`}
        style={{
          marginLeft: level * 24,
          ...(node.isCurrent && {
            ringColor: DEPTH_COLORS[node.depth],
          }),
        }}
      >
        {/* Connection line */}
        {level > 0 && (
          <div
            className="absolute left-0 top-1/2 w-4 h-px"
            style={{
              marginLeft: -12,
              backgroundColor: `${DEPTH_COLORS[node.depth]}40`,
            }}
          />
        )}

        {/* Node indicator */}
        <div
          className={`relative w-3 h-3 rounded-full flex-shrink-0 ${
            node.isCurrent ? 'ring-2 ring-white/30' : ''
          }`}
          style={{ backgroundColor: DEPTH_COLORS[node.depth] }}
        >
          {node.isFrontier && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: DEPTH_COLORS.frontier }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Title */}
        <span
          className={`text-sm truncate max-w-[150px] ${
            node.isCurrent ? 'text-white font-medium' : 'text-muted'
          } ${!node.isExplored ? 'opacity-50' : ''}`}
        >
          {node.title}
        </span>

        {/* Frontier badge */}
        {node.isFrontier && (
          <Sparkles className="w-3 h-3 text-pink-400 flex-shrink-0" />
        )}

        {/* Unexplored indicator */}
        {!node.isExplored && (
          <span className="text-xs text-muted/50">?</span>
        )}
      </motion.button>

      {/* Children */}
      {hasChildren && (
        <div className="relative mt-1">
          {/* Vertical connection line */}
          <div
            className="absolute left-0 top-0 w-px"
            style={{
              marginLeft: level * 24 + 18,
              height: 'calc(100% - 16px)',
              backgroundColor: `${DEPTH_COLORS[node.depth]}20`,
            }}
          />

          {node.children.map((child) => (
            <TreeView
              key={child.id}
              node={child}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function buildTree(tabs: Tab[], activeTabId: string): TreeNode | null {
  const startTab = tabs.find(t => t.id === 'start')
  if (!startTab) return null

  const buildNode = (tab: Tab): TreeNode => {
    const children = tabs
      .filter(t => t.parentId === tab.id)
      .map(buildNode)

    return {
      id: tab.id,
      title: tab.title,
      type: tab.type,
      depth: tab.depth,
      children,
      isExplored: !!tab.content || tab.id === 'start',
      isCurrent: tab.id === activeTabId,
      isFrontier: tab.content?.isFrontier || false,
    }
  }

  return buildNode(startTab)
}

// Mini map for corner display (optional)
export function MiniMap() {
  const { tabs, activeTabId, setActiveTab } = useExplorationStore()

  const exploredCount = tabs.filter(t => t.content || t.id === 'start').length
  const frontierCount = tabs.filter(t => t.content?.isFrontier).length

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-surface/90 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
        <div className="text-xs text-muted mb-2">Exploration</div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{exploredCount}</div>
            <div className="text-xs text-muted">explored</div>
          </div>
          {frontierCount > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-pink-400">{frontierCount}</div>
              <div className="text-xs text-muted">frontiers</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
