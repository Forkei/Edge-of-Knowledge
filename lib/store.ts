import { create } from 'zustand'

// Types for the exploration canvas

export type KnowledgeDepth = 'known' | 'investigated' | 'debated' | 'unknown' | 'frontier'

export interface Citation {
  paperId: string
  title: string
  authors: string
  year: number
  citationCount?: number
  url?: string
}

export interface Experiment {
  id: string
  title: string
  hypothesis: string
  materials: string[]
  steps: string[]
  expectedOutcome: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface BranchOption {
  id: string
  title: string
  teaser: string
  type: 'science' | 'unknown' | 'experiment' | 'paper' | 'custom'
}

export interface ScientificTerm {
  term: string
  definition: string
  searchQuery?: string
  category?: string
}

export interface RelatedTopic {
  title: string
  teaser: string
  searchQuery: string
}

export interface BranchContent {
  headline: string
  summary: string
  citations: Citation[]
  confidence: number
  researchHeat: 'hot' | 'warm' | 'cold' | 'dormant'
  branches: BranchOption[]
  experiments?: Experiment[]
  // Scientific terms for tooltips
  scientificTerms?: ScientificTerm[]
  // Related topics for discovery
  relatedTopics?: RelatedTopic[]
  // Frontier detection
  isFrontier?: boolean
  frontierReason?: string
  depth?: KnowledgeDepth
}

export interface Tab {
  id: string
  title: string
  type: 'start' | 'science' | 'unknown' | 'experiment' | 'paper' | 'custom'
  parentId: string | null
  content: BranchContent | null
  loading: boolean
  error?: string
  depth: KnowledgeDepth
}

export interface Door {
  id: 'science' | 'unknown' | 'experiment'
  title: string
  teaser: string
  paperHint: 'hot' | 'warm' | 'cold' | 'dormant'
}

export interface InitialAnalysis {
  identification: {
    name: string
    confidence: number
    oneLiner: string
  }
  doors: Door[]
  paperCount: number
  lastStudied: string
  researchActivity: 'hot' | 'warm' | 'cold' | 'dormant'
}

export interface ValidationError {
  issue: 'blur' | 'exposure' | 'multiple_subjects' | 'non_scientific' | 'ambiguous'
  suggestion?: string
  partialIdentification?: string
}

interface ExplorationState {
  // Original observation
  explorationId: string | null
  originalImage: string
  originalMimeType: string
  originalContext: string

  // Initial analysis (entry point)
  initialAnalysis: InitialAnalysis | null
  initialLoading: boolean
  initialError: string | null
  validationError: ValidationError | null

  // Tab management
  tabs: Tab[]
  activeTabId: string

  // Frontier moment
  showFrontierMoment: boolean
  frontierReason: string | null
  pendingFrontierTabId: string | null

  // Current depth (derived from active tab)
  currentDepth: KnowledgeDepth

  // Actions
  setOriginalObservation: (image: string, mimeType: string, context: string) => void
  setInitialAnalysis: (analysis: InitialAnalysis) => void
  setInitialLoading: (loading: boolean) => void
  setInitialError: (error: string | null) => void
  setValidationError: (error: ValidationError | null) => void

  addTab: (tab: Omit<Tab, 'loading' | 'content' | 'depth'> & {
    content?: BranchContent | null
    depth?: KnowledgeDepth
  }) => void
  updateTabContent: (tabId: string, content: BranchContent) => void
  setTabLoading: (tabId: string, loading: boolean) => void
  setTabError: (tabId: string, error: string) => void
  setTabDepth: (tabId: string, depth: KnowledgeDepth) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void

  // Frontier moment
  triggerFrontierMoment: (tabId: string, reason: string) => void
  dismissFrontierMoment: () => void

  // Reset
  reset: () => void
  startNewExploration: (id: string) => void
}

const initialState = {
  explorationId: null,
  originalImage: '',
  originalMimeType: '',
  originalContext: '',
  initialAnalysis: null,
  initialLoading: false,
  initialError: null,
  validationError: null as ValidationError | null,
  tabs: [] as Tab[],
  activeTabId: 'start',
  showFrontierMoment: false,
  frontierReason: null,
  pendingFrontierTabId: null,
  currentDepth: 'known' as KnowledgeDepth,
}

// Calculate depth based on tab type and content
function calculateDepth(tab: Tab): KnowledgeDepth {
  if (tab.type === 'start') return 'known'

  // If content has explicit depth, use it
  if (tab.content?.depth) return tab.content.depth

  // If frontier detected
  if (tab.content?.isFrontier) return 'frontier'

  // Calculate based on confidence and research heat
  if (tab.content) {
    const { confidence, researchHeat, citations } = tab.content

    if (citations.length <= 2 || researchHeat === 'dormant') return 'frontier'
    if (confidence < 40 || researchHeat === 'cold') return 'unknown'
    if (confidence < 60 || researchHeat === 'warm') return 'debated'
    if (confidence < 80) return 'investigated'
    return 'known'
  }

  // Default based on tab type
  if (tab.type === 'unknown') return 'unknown'
  if (tab.type === 'experiment') return 'investigated'
  return 'investigated'
}

export const useExplorationStore = create<ExplorationState>((set, get) => ({
  ...initialState,

  setOriginalObservation: (image, mimeType, context) => set({
    originalImage: image,
    originalMimeType: mimeType,
    originalContext: context,
  }),

  setInitialAnalysis: (analysis) => set({
    initialAnalysis: analysis,
    initialLoading: false,
    initialError: null,
    // Create the start tab
    tabs: [{
      id: 'start',
      title: 'Start',
      type: 'start',
      parentId: null,
      content: null,
      loading: false,
      depth: 'known',
    }],
    activeTabId: 'start',
    currentDepth: 'known',
  }),

  setInitialLoading: (loading) => set({ initialLoading: loading }),

  setInitialError: (error) => set({ initialError: error, initialLoading: false }),

  setValidationError: (error) => set({ validationError: error, initialLoading: false }),

  addTab: (tab) => {
    const { tabs } = get()
    const existingTab = tabs.find(t => t.id === tab.id)

    if (existingTab) {
      set({ activeTabId: tab.id, currentDepth: existingTab.depth })
      return
    }

    // Determine initial depth based on tab type
    let depth: KnowledgeDepth = tab.depth || 'investigated'
    if (tab.type === 'unknown') depth = 'unknown'
    if (tab.type === 'science') depth = 'investigated'

    const newTab: Tab = {
      ...tab,
      loading: true,
      content: tab.content || null,
      depth,
    }

    set({
      tabs: [...tabs, newTab],
      activeTabId: tab.id,
      currentDepth: depth,
    })
  },

  updateTabContent: (tabId, content) => {
    const { tabs, pendingFrontierTabId } = get()

    // Calculate depth based on content
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    const updatedTab = { ...tab, content, loading: false, error: undefined }
    const newDepth = calculateDepth(updatedTab)
    updatedTab.depth = newDepth

    // Check if frontier should be triggered
    if (content.isFrontier && tabId !== pendingFrontierTabId) {
      set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? updatedTab : t),
        showFrontierMoment: true,
        frontierReason: content.frontierReason || 'No published research specifically addresses this observation.',
        pendingFrontierTabId: tabId,
        currentDepth: newDepth,
      }))
    } else {
      set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? updatedTab : t),
        currentDepth: state.activeTabId === tabId ? newDepth : state.currentDepth,
      }))
    }
  },

  setTabLoading: (tabId, loading) => set((state) => ({
    tabs: state.tabs.map(tab =>
      tab.id === tabId ? { ...tab, loading } : tab
    ),
  })),

  setTabError: (tabId, error) => set((state) => ({
    tabs: state.tabs.map(tab =>
      tab.id === tabId ? { ...tab, error, loading: false } : tab
    ),
  })),

  setTabDepth: (tabId, depth) => set((state) => ({
    tabs: state.tabs.map(tab =>
      tab.id === tabId ? { ...tab, depth } : tab
    ),
    currentDepth: state.activeTabId === tabId ? depth : state.currentDepth,
  })),

  removeTab: (tabId) => {
    if (tabId === 'start') return

    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter(t => t.id !== tabId)

    let newActiveTabId = activeTabId
    let newDepth: KnowledgeDepth = 'known'

    if (activeTabId === tabId) {
      const currentIndex = tabs.findIndex(t => t.id === tabId)
      const previousTab = tabs[currentIndex - 1] || tabs[0]
      newActiveTabId = previousTab?.id || 'start'
      newDepth = previousTab?.depth || 'known'
    } else {
      const activeTab = newTabs.find(t => t.id === activeTabId)
      newDepth = activeTab?.depth || 'known'
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId, currentDepth: newDepth })
  },

  setActiveTab: (tabId) => {
    const { tabs } = get()
    const tab = tabs.find(t => t.id === tabId)
    set({
      activeTabId: tabId,
      currentDepth: tab?.depth || 'known',
    })
  },

  triggerFrontierMoment: (tabId, reason) => set({
    showFrontierMoment: true,
    frontierReason: reason,
    pendingFrontierTabId: tabId,
  }),

  dismissFrontierMoment: () => set({
    showFrontierMoment: false,
    frontierReason: null,
  }),

  reset: () => set(initialState),

  startNewExploration: (id) => set({
    ...initialState,
    explorationId: id,
  }),
}))
