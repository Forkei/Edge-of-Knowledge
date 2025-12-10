'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Home,
  Sparkles,
  Microscope,
  FlaskConical,
  HelpCircle,
  Compass,
  Atom,
  Lightbulb
} from 'lucide-react'
import { Tab, KnowledgeDepth, useExplorationStore } from '@/lib/store'

interface GraphNode {
  id: string
  title: string
  type: Tab['type']
  depth: KnowledgeDepth
  isExplored: boolean
  isCurrent: boolean
  isFrontier: boolean
  parentId: string | null
  x: number
  y: number
  angle: number
  level: number
}

interface GraphEdge {
  from: GraphNode
  to: GraphNode
}

const DEPTH_COLORS: Record<KnowledgeDepth, string> = {
  known: '#3b82f6',
  investigated: '#06b6d4',
  debated: '#eab308',
  unknown: '#a855f7',
  frontier: '#ec4899',
}

const DEPTH_GLOW_COLORS: Record<KnowledgeDepth, string> = {
  known: 'rgba(59, 130, 246, 0.4)',
  investigated: 'rgba(6, 182, 212, 0.4)',
  debated: 'rgba(234, 179, 8, 0.4)',
  unknown: 'rgba(168, 85, 247, 0.4)',
  frontier: 'rgba(236, 72, 153, 0.5)',
}

const TYPE_ICONS: Record<string, typeof Microscope> = {
  start: Compass,
  science: Microscope,
  unknown: HelpCircle,
  experiment: FlaskConical,
  paper: Atom,
  custom: Lightbulb,
}

// Calculate radial positions for nodes
function calculateLayout(tabs: Tab[], activeTabId: string): { nodes: GraphNode[], edges: GraphEdge[] } {
  if (tabs.length === 0) return { nodes: [], edges: [] }

  const centerX = 200
  const centerY = 150
  const baseRadius = 100
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Build tree structure
  const startTab = tabs.find(t => t.id === 'start')
  if (!startTab) return { nodes: [], edges: [] }

  // First pass: calculate levels and group by parent
  const nodesByParent: Map<string, Tab[]> = new Map()
  const levels: Map<string, number> = new Map()

  levels.set('start', 0)
  nodesByParent.set('', [startTab])

  tabs.forEach(tab => {
    if (tab.id === 'start') return
    const parent = tab.parentId || 'start'
    if (!nodesByParent.has(parent)) {
      nodesByParent.set(parent, [])
    }
    nodesByParent.get(parent)!.push(tab)
  })

  // BFS to assign levels
  const queue = ['start']
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const level = levels.get(nodeId)!
    const children = nodesByParent.get(nodeId) || []
    children.forEach(child => {
      levels.set(child.id, level + 1)
      queue.push(child.id)
    })
  }

  // Second pass: calculate positions
  const processNode = (tab: Tab, parentNode: GraphNode | null, angleStart: number, angleSpan: number) => {
    const level = levels.get(tab.id) || 0
    const children = nodesByParent.get(tab.id) || []

    let x: number, y: number, angle: number

    if (level === 0) {
      // Center node
      x = centerX
      y = centerY
      angle = 0
    } else {
      // Calculate position on radial arc
      const radius = baseRadius + (level - 1) * 70
      angle = angleStart + angleSpan / 2
      x = centerX + Math.cos(angle) * radius
      y = centerY + Math.sin(angle) * radius
    }

    const node: GraphNode = {
      id: tab.id,
      title: tab.title,
      type: tab.type,
      depth: tab.depth,
      isExplored: !!tab.content || tab.id === 'start',
      isCurrent: tab.id === activeTabId,
      isFrontier: tab.content?.isFrontier || false,
      parentId: tab.parentId,
      x,
      y,
      angle,
      level,
    }

    nodes.push(node)

    if (parentNode) {
      edges.push({ from: parentNode, to: node })
    }

    // Process children with distributed angles
    if (children.length > 0) {
      const childAngleSpan = level === 0 ? Math.PI * 2 : angleSpan
      const childAngleStart = level === 0 ? -Math.PI / 2 : angleStart
      const anglePerChild = childAngleSpan / children.length

      children.forEach((child, i) => {
        const childStart = childAngleStart + i * anglePerChild
        processNode(child, node, childStart, anglePerChild)
      })
    }
  }

  processNode(startTab, null, 0, Math.PI * 2)

  return { nodes, edges }
}

// Generate curved path between two points
function generateCurvedPath(from: GraphNode, to: GraphNode): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Control point for bezier curve
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2

  // Perpendicular offset for curve
  const perpX = -dy / dist * (dist * 0.2)
  const perpY = dx / dist * (dist * 0.2)

  const ctrlX = midX + perpX
  const ctrlY = midY + perpY

  return `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`
}

export function ExplorationMap() {
  const { tabs, activeTabId, setActiveTab, initialAnalysis } = useExplorationStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const { nodes, edges } = useMemo(
    () => calculateLayout(tabs, activeTabId),
    [tabs, activeTabId]
  )

  const currentTab = tabs.find(t => t.id === activeTabId)
  const currentDepth = currentTab?.depth || 'known'

  // Get the subject name for center label
  const centerLabel = initialAnalysis?.identification?.name || 'Edge of Knowledge'

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    setActiveTab(nodeId)
  }, [setActiveTab])

  // Don't render if no nodes
  if (nodes.length === 0) return null

  return (
    <div className="border-b border-border/50 bg-gradient-to-b from-surface/50 to-void/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Header with breadcrumb and controls */}
        <div className="flex items-center justify-between py-2">
          {/* Breadcrumb */}
          <Breadcrumb tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTab} />

          {/* Expand/collapse + depth indicator */}
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <DepthBadge depth={currentDepth} />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
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

        {/* Expanded: Knowledge Graph */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="py-4">
                <div className="relative bg-gradient-to-br from-void via-surface/30 to-void rounded-2xl border border-border/50 overflow-hidden">
                  {/* Background glow effects */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-30"
                      style={{ backgroundColor: DEPTH_COLORS[currentDepth] }}
                    />
                  </div>

                  {/* SVG Graph */}
                  <svg
                    viewBox="0 0 400 300"
                    className="w-full h-[300px]"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Gradient definitions */}
                    <defs>
                      {Object.entries(DEPTH_COLORS).map(([depth, color]) => (
                        <linearGradient key={depth} id={`gradient-${depth}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                        </linearGradient>
                      ))}
                      {Object.entries(DEPTH_COLORS).map(([depth, color]) => (
                        <filter key={`glow-${depth}`} id={`glow-${depth}`} x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      ))}
                      <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Connection lines */}
                    <g className="edges">
                      {edges.map((edge, i) => (
                        <motion.path
                          key={`${edge.from.id}-${edge.to.id}`}
                          d={generateCurvedPath(edge.from, edge.to)}
                          fill="none"
                          stroke={`url(#gradient-${edge.to.depth})`}
                          strokeWidth="2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          filter={edge.to.isCurrent ? `url(#glow-${edge.to.depth})` : undefined}
                        />
                      ))}
                    </g>

                    {/* Nodes */}
                    <g className="nodes">
                      {nodes.map((node, i) => (
                        <GraphNodeComponent
                          key={node.id}
                          node={node}
                          centerLabel={node.level === 0 ? centerLabel : undefined}
                          onClick={() => handleNodeClick(node.id)}
                          delay={i * 0.05}
                        />
                      ))}
                    </g>
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Known
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Unknown
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      Frontier
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Graph node component
function GraphNodeComponent({
  node,
  centerLabel,
  onClick,
  delay,
}: {
  node: GraphNode
  centerLabel?: string
  onClick: () => void
  delay: number
}) {
  const Icon = TYPE_ICONS[node.type] || Lightbulb
  const color = DEPTH_COLORS[node.depth]
  const glowColor = DEPTH_GLOW_COLORS[node.depth]

  const isCenter = node.level === 0
  const nodeRadius = isCenter ? 28 : 18
  const iconSize = isCenter ? 16 : 12

  // Truncate title for display
  const displayTitle = node.title.length > 15 ? node.title.slice(0, 12) + '...' : node.title

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Outer glow for current/frontier nodes */}
      {(node.isCurrent || node.isFrontier) && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={nodeRadius + 8}
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.3"
          animate={{
            r: [nodeRadius + 8, nodeRadius + 14, nodeRadius + 8],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Glow background */}
      <circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius + 4}
        fill={glowColor}
        filter="url(#glow-strong)"
        opacity={node.isCurrent ? 0.8 : 0.4}
      />

      {/* Main node circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius}
        fill={`${color}20`}
        stroke={color}
        strokeWidth={node.isCurrent ? 3 : 2}
        filter={node.isCurrent ? `url(#glow-${node.depth})` : undefined}
      />

      {/* Inner gradient overlay */}
      <circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius - 2}
        fill="url(#nodeGradient)"
        opacity="0.5"
      />

      {/* Icon */}
      <foreignObject
        x={node.x - iconSize / 2}
        y={node.y - iconSize / 2}
        width={iconSize}
        height={iconSize}
      >
        <div className="w-full h-full flex items-center justify-center" style={{ color }}>
          <Icon style={{ width: iconSize, height: iconSize }} />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={node.x}
        y={node.y + nodeRadius + 14}
        textAnchor="middle"
        fill={node.isCurrent ? '#ffffff' : '#9ca3af'}
        fontSize={isCenter ? 11 : 9}
        fontWeight={node.isCurrent ? 600 : 400}
        className="select-none"
      >
        {isCenter ? (centerLabel?.slice(0, 20) || 'Start') : displayTitle}
      </text>

      {/* Frontier sparkle */}
      {node.isFrontier && (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          <text
            x={node.x + nodeRadius - 2}
            y={node.y - nodeRadius + 6}
            fontSize="10"
          >
            ✨
          </text>
        </motion.g>
      )}
    </motion.g>
  )
}

// Breadcrumb component
function Breadcrumb({
  tabs,
  activeTabId,
  onSelect,
}: {
  tabs: Tab[]
  activeTabId: string
  onSelect: (id: string) => void
}) {
  // Build path from start to current
  const path = useMemo(() => {
    const result: Tab[] = []
    let currentId = activeTabId
    while (currentId) {
      const tab = tabs.find(t => t.id === currentId)
      if (tab) {
        result.unshift(tab)
        currentId = tab.parentId || ''
      } else {
        break
      }
    }
    return result
  }, [tabs, activeTabId])

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {path.map((tab, i) => (
        <div key={tab.id} className="flex items-center">
          {i > 0 && (
            <span className="text-muted/50 mx-1 text-sm">→</span>
          )}
          <button
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${
              tab.id === activeTabId
                ? 'bg-white/10 text-white shadow-sm'
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
            <span className="max-w-[100px] truncate">{tab.title}</span>
            {tab.content?.isFrontier && (
              <Sparkles className="w-3 h-3 text-pink-400" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}

// Depth badge component
function DepthBadge({ depth }: { depth: KnowledgeDepth }) {
  const color = DEPTH_COLORS[depth]
  const bgColor = `${color}20`

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: bgColor,
        color: color,
      }}
    >
      <motion.span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {depth.charAt(0).toUpperCase() + depth.slice(1)}
    </div>
  )
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
