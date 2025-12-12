'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
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
  Lightbulb,
  Plus
} from 'lucide-react'
import { Tab, KnowledgeDepth, useExplorationStore, BranchOption, Door } from '@/lib/store'
import { startStreamingExplore } from '@/lib/use-streaming-explore'

interface GraphNode {
  id: string
  title: string
  type: Tab['type'] | 'potential'
  depth: KnowledgeDepth
  isExplored: boolean
  isCurrent: boolean
  isFrontier: boolean
  isPotential: boolean // New: unexplored branch option
  parentId: string | null
  x: number
  y: number
  angle: number
  level: number
  branchData?: BranchOption | Door // Data needed to explore this branch
}

interface GraphEdge {
  from: GraphNode
  to: GraphNode
  isPotential: boolean
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
  potential: Plus,
}

const TYPE_DEPTH_MAP: Record<string, KnowledgeDepth> = {
  science: 'investigated',
  unknown: 'unknown',
  experiment: 'investigated',
  paper: 'known',
  custom: 'debated',
}

// Calculate radial positions for nodes including potential branches
function calculateLayout(
  tabs: Tab[],
  activeTabId: string,
  initialAnalysis: { doors: Door[] } | null
): { nodes: GraphNode[], edges: GraphEdge[] } {
  if (tabs.length === 0) return { nodes: [], edges: [] }

  const centerX = 200
  const centerY = 150
  const baseRadius = 85
  const radiusStep = 65
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const processedPotentialIds = new Set<string>()

  const startTab = tabs.find(t => t.id === 'start')
  if (!startTab) return { nodes: [], edges: [] }

  // Build explored nodes map
  const exploredNodeIds = new Set(tabs.map(t => t.id))

  // First pass: calculate levels for explored tabs
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

  // Collect all potential branches from explored nodes
  interface PotentialBranch {
    parentId: string
    parentLevel: number
    branch: BranchOption | Door
    isDoor: boolean
  }
  const potentialBranches: PotentialBranch[] = []

  // Add doors from initial analysis (branches from start)
  if (initialAnalysis?.doors) {
    initialAnalysis.doors.forEach(door => {
      // Check if this door has already been explored
      const isExplored = tabs.some(t => t.parentId === 'start' && t.type === door.id)
      if (!isExplored) {
        potentialBranches.push({
          parentId: 'start',
          parentLevel: 0,
          branch: door,
          isDoor: true,
        })
      }
    })
  }

  // Add branches from explored tabs
  tabs.forEach(tab => {
    if (tab.content?.branches) {
      tab.content.branches.forEach(branch => {
        // Check if this branch has already been explored
        const isExplored = tabs.some(t => t.parentId === tab.id && t.title === branch.title)
        if (!isExplored) {
          potentialBranches.push({
            parentId: tab.id,
            parentLevel: levels.get(tab.id) || 0,
            branch,
            isDoor: false,
          })
        }
      })
    }
  })

  // Group potential branches by parent
  const potentialByParent: Map<string, PotentialBranch[]> = new Map()
  potentialBranches.forEach(pb => {
    if (!potentialByParent.has(pb.parentId)) {
      potentialByParent.set(pb.parentId, [])
    }
    potentialByParent.get(pb.parentId)!.push(pb)
  })

  // Second pass: calculate positions
  const processNode = (
    tab: Tab,
    parentNode: GraphNode | null,
    angleStart: number,
    angleSpan: number
  ) => {
    const level = levels.get(tab.id) || 0
    const exploredChildren = nodesByParent.get(tab.id) || []
    const potentialChildren = potentialByParent.get(tab.id) || []
    const totalChildren = exploredChildren.length + potentialChildren.length

    let x: number, y: number, angle: number

    if (level === 0) {
      x = centerX
      y = centerY
      angle = 0
    } else {
      const radius = baseRadius + (level - 1) * radiusStep
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
      isPotential: false,
      parentId: tab.parentId,
      x,
      y,
      angle,
      level,
    }

    nodes.push(node)

    if (parentNode) {
      edges.push({ from: parentNode, to: node, isPotential: false })
    }

    // Calculate angles for all children (explored + potential)
    if (totalChildren > 0) {
      const childAngleSpan = level === 0 ? Math.PI * 2 : Math.min(angleSpan, Math.PI * 0.8)
      const childAngleStart = level === 0 ? -Math.PI / 2 : angleStart + (angleSpan - childAngleSpan) / 2
      const anglePerChild = childAngleSpan / totalChildren

      let childIndex = 0

      // Process explored children
      exploredChildren.forEach((child) => {
        const childStart = childAngleStart + childIndex * anglePerChild
        processNode(child, node, childStart, anglePerChild)
        childIndex++
      })

      // Process potential children
      potentialChildren.forEach((pb) => {
        const childStart = childAngleStart + childIndex * anglePerChild
        const childLevel = level + 1
        const childRadius = baseRadius + (childLevel - 1) * radiusStep
        const childAngle = childStart + anglePerChild / 2
        const childX = centerX + Math.cos(childAngle) * childRadius
        const childY = centerY + Math.sin(childAngle) * childRadius

        const potentialId = `potential-${pb.parentId}-${pb.branch.id || pb.branch.title}`

        if (!processedPotentialIds.has(potentialId)) {
          processedPotentialIds.add(potentialId)

          const branchType = pb.isDoor
            ? (pb.branch as Door).id
            : (pb.branch as BranchOption).type

          const potentialNode: GraphNode = {
            id: potentialId,
            title: pb.branch.title,
            type: branchType as Tab['type'],
            depth: TYPE_DEPTH_MAP[branchType] || 'investigated',
            isExplored: false,
            isCurrent: false,
            isFrontier: false,
            isPotential: true,
            parentId: pb.parentId,
            x: childX,
            y: childY,
            angle: childAngle,
            level: childLevel,
            branchData: pb.branch,
          }

          nodes.push(potentialNode)
          edges.push({ from: node, to: potentialNode, isPotential: true })
        }

        childIndex++
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

  if (dist === 0) return `M ${from.x} ${from.y}`

  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2

  // Curve outward from center
  const perpX = -dy / dist * (dist * 0.15)
  const perpY = dx / dist * (dist * 0.15)

  const ctrlX = midX + perpX
  const ctrlY = midY + perpY

  return `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`
}

export function ExplorationMap() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    initialAnalysis,
    addTab,
    updateTabContent,
    setTabError,
  } = useExplorationStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null)

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Reset zoom/pan when tabs change significantly
  useEffect(() => {
    if (tabs.length <= 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [tabs.length])

  // Prevent page scroll when wheeling over the map
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)))
    }

    svg.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheelNative)
  }, [isExpanded]) // Re-attach when expanded state changes

  // Pan handlers (drag) - works with any mouse button
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start drag on left click (but not on nodes - they have their own click handler)
    if (e.button === 0) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
        dist: 0,
      }
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartRef.current = { x: pan.x, y: pan.y, dist }
    }
  }, [pan])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      })
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = dist / touchStartRef.current.dist
      setZoom(prev => Math.max(0.5, Math.min(3, prev * scale)))
      touchStartRef.current.dist = dist
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null
  }, [])

  // Reset zoom/pan
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const { nodes, edges } = useMemo(
    () => calculateLayout(tabs, activeTabId, initialAnalysis),
    [tabs, activeTabId, initialAnalysis]
  )

  const currentTab = tabs.find(t => t.id === activeTabId)
  const currentDepth = currentTab?.depth || 'known'
  const centerLabel = initialAnalysis?.identification?.name || 'Edge of Knowledge'

  // Handle clicking on explored node
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.isPotential) {
      // Trigger exploration for this potential branch
      handleExploreBranch(node)
    } else {
      setActiveTab(node.id)
    }
  }, [setActiveTab])

  // Handle exploring a potential branch
  const handleExploreBranch = async (node: GraphNode) => {
    if (!node.branchData || loadingNodeId) return

    const tabId = `${node.type}-${Date.now()}`
    setLoadingNodeId(node.id)

    // Add tab (will be in loading state)
    addTab({
      id: tabId,
      title: node.branchData.title,
      type: node.type as Tab['type'],
      parentId: node.parentId,
    })

    const parentTab = tabs.find(t => t.id === node.parentId)
    const context = parentTab?.content?.headline || initialAnalysis?.identification?.name || ''

    // Start streaming exploration
    await startStreamingExplore(tabId, {
      branchType: node.type,
      branchTitle: node.branchData.title,
      context,
      originalAnalysis: initialAnalysis,
    })

    setLoadingNodeId(null)
  }

  if (nodes.length === 0) return null

  return (
    <div className="border-b border-border/50 bg-gradient-to-b from-surface/50 to-void/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <Breadcrumb tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTab} />
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <DepthBadge depth={currentDepth} />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
              title={isExpanded ? 'Collapse map' : 'Expand map'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Knowledge Graph */}
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
                  {/* Background glow */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-20"
                      style={{ backgroundColor: DEPTH_COLORS[currentDepth] }}
                    />
                  </div>

                  {/* SVG Graph */}
                  <svg
                    ref={svgRef}
                    viewBox="0 0 400 300"
                    className={`w-full h-[320px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <defs>
                      {/* Gradients for edges */}
                      {Object.entries(DEPTH_COLORS).map(([depth, color]) => (
                        <linearGradient key={depth} id={`gradient-${depth}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                          <stop offset="50%" stopColor={color} stopOpacity="0.7" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                        </linearGradient>
                      ))}
                      {/* Dashed gradient for potential edges */}
                      {Object.entries(DEPTH_COLORS).map(([depth, color]) => (
                        <linearGradient key={`potential-${depth}`} id={`gradient-potential-${depth}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
                          <stop offset="50%" stopColor={color} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                        </linearGradient>
                      ))}
                      {/* Glow filters */}
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

                    {/* Transform group for zoom/pan */}
                    <g transform={`translate(${pan.x / 2}, ${pan.y / 2}) scale(${zoom})`} style={{ transformOrigin: '200px 150px' }}>
                    {/* Edges - potential first (behind), then explored */}
                    <g className="edges">
                      {edges.filter(e => e.isPotential).map((edge, i) => (
                        <motion.path
                          key={`${edge.from.id}-${edge.to.id}`}
                          d={generateCurvedPath(edge.from, edge.to)}
                          fill="none"
                          stroke={`url(#gradient-potential-${edge.to.depth})`}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray="4 4"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.5 }}
                          transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                        />
                      ))}
                      {edges.filter(e => !e.isPotential).map((edge, i) => (
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

                    {/* Nodes - potential first (behind), then explored */}
                    <g className="nodes">
                      {nodes.filter(n => n.isPotential).map((node, i) => (
                        <GraphNodeComponent
                          key={node.id}
                          node={node}
                          onClick={() => handleNodeClick(node)}
                          delay={0.3 + i * 0.03}
                          isLoading={loadingNodeId === node.id}
                        />
                      ))}
                      {nodes.filter(n => !n.isPotential).map((node, i) => (
                        <GraphNodeComponent
                          key={node.id}
                          node={node}
                          centerLabel={node.level === 0 ? centerLabel : undefined}
                          onClick={() => handleNodeClick(node)}
                          delay={i * 0.05}
                          isLoading={false}
                        />
                      ))}
                    </g>
                    </g>
                  </svg>

                  {/* Zoom controls */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <button
                      onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
                      className="w-7 h-7 flex items-center justify-center bg-surface/80 hover:bg-surface border border-border/50 rounded-lg text-sm text-muted hover:text-white transition-colors"
                      title="Zoom in"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
                      className="w-7 h-7 flex items-center justify-center bg-surface/80 hover:bg-surface border border-border/50 rounded-lg text-sm text-muted hover:text-white transition-colors"
                      title="Zoom out"
                    >
                      −
                    </button>
                    {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                      <button
                        onClick={resetView}
                        className="w-7 h-7 flex items-center justify-center bg-surface/80 hover:bg-surface border border-border/50 rounded-lg text-xs text-muted hover:text-white transition-colors"
                        title="Reset view"
                      >
                        ⟳
                      </button>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Explored
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full border border-dashed border-gray-500 bg-transparent" />
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      Frontier
                    </span>
                  </div>

                  {/* Hint */}
                  <div className="absolute bottom-3 right-3 text-xs text-muted/60">
                    Click nodes • Scroll to zoom • Drag to pan
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
  isLoading,
}: {
  node: GraphNode
  centerLabel?: string
  onClick: () => void
  delay: number
  isLoading?: boolean
}) {
  const Icon = TYPE_ICONS[node.isPotential ? node.type : node.type] || Lightbulb
  const color = DEPTH_COLORS[node.depth]
  const glowColor = DEPTH_GLOW_COLORS[node.depth]

  const isCenter = node.level === 0
  const nodeRadius = isCenter ? 26 : node.isPotential ? 14 : 16
  const iconSize = isCenter ? 14 : node.isPotential ? 10 : 11

  const displayTitle = node.title.length > 14 ? node.title.slice(0, 11) + '...' : node.title

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: node.isPotential ? 0.7 : 1, scale: 1 }}
      whileHover={{ scale: 1.1, opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Pulsing ring for current/frontier/loading */}
      {(node.isCurrent || node.isFrontier || isLoading) && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={nodeRadius + 6}
          fill="none"
          stroke={isLoading ? '#fbbf24' : color}
          strokeWidth="2"
          opacity="0.4"
          animate={{
            r: [nodeRadius + 6, nodeRadius + 12, nodeRadius + 6],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{ duration: isLoading ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Glow background */}
      {!node.isPotential && (
        <circle
          cx={node.x}
          cy={node.y}
          r={nodeRadius + 3}
          fill={glowColor}
          filter="url(#glow-strong)"
          opacity={node.isCurrent ? 0.7 : 0.3}
        />
      )}

      {/* Main circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius}
        fill={node.isPotential ? 'rgba(30, 30, 40, 0.8)' : `${color}20`}
        stroke={color}
        strokeWidth={node.isCurrent ? 3 : node.isPotential ? 1.5 : 2}
        strokeDasharray={node.isPotential ? '3 2' : undefined}
        filter={node.isCurrent && !node.isPotential ? `url(#glow-${node.depth})` : undefined}
        opacity={node.isPotential ? 0.6 : 1}
      />

      {/* Icon */}
      <foreignObject
        x={node.x - iconSize / 2}
        y={node.y - iconSize / 2}
        width={iconSize}
        height={iconSize}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: node.isPotential ? `${color}99` : color }}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Icon style={{ width: iconSize, height: iconSize }} />
            </motion.div>
          ) : (
            <Icon style={{ width: iconSize, height: iconSize }} />
          )}
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={node.x}
        y={node.y + nodeRadius + 12}
        textAnchor="middle"
        fill={node.isCurrent ? '#ffffff' : node.isPotential ? '#6b7280' : '#9ca3af'}
        fontSize={isCenter ? 10 : 8}
        fontWeight={node.isCurrent ? 600 : 400}
        className="select-none pointer-events-none"
      >
        {isCenter ? (centerLabel?.slice(0, 18) || 'Start') : displayTitle}
      </text>

      {/* Frontier sparkle */}
      {node.isFrontier && !node.isPotential && (
        <motion.text
          x={node.x + nodeRadius - 2}
          y={node.y - nodeRadius + 4}
          fontSize="8"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨
        </motion.text>
      )}

      {/* "+" indicator for potential nodes */}
      {node.isPotential && (
        <text
          x={node.x + nodeRadius - 1}
          y={node.y - nodeRadius + 5}
          fontSize="8"
          fill={color}
          fontWeight="bold"
          opacity="0.7"
        >
          +
        </text>
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
          {i > 0 && <span className="text-muted/50 mx-1 text-sm">→</span>}
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
            {tab.content?.isFrontier && <Sparkles className="w-3 h-3 text-pink-400" />}
          </button>
        </div>
      ))}
    </div>
  )
}

// Depth badge component
function DepthBadge({ depth }: { depth: KnowledgeDepth }) {
  const color = DEPTH_COLORS[depth]
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
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

// Mini map export
export function MiniMap() {
  const { tabs } = useExplorationStore()
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
