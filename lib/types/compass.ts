export interface Node {
  id: string
  type: "goal" | "user" | "predicted" | "actual"
  text: string
  confidence?: number // Only for predicted nodes
  fromNodeId: string | null // null if start node
  speaker?: "user" | "other" // optional speaker identification
  position?: { x: number; y: number } // For visualization
  isActive?: boolean // Is this the current active node
  isHighlighted?: boolean // For visual emphasis
}

export interface Beam {
  id: string
  fromNodeId: string
  toNodeId: string
  thickness: number // determined by confidence
  isActive?: boolean // Is this the current active path
}

export interface CompassState {
  nodes: Node[]
  beams: Beam[]
  currentNodeId: string | null
  goal: string
  isRecording: boolean
  isProcessing: boolean
  mode: "tracking" | "guided"
  layout: "radial" | "vertical" | "horizontal"
  colorScheme: "default" | "business" | "professional" | "creative"
  highlightDecisions: boolean
  highlightQuestions: boolean
  expandLevel: number
  zoomLevel: number
  viewportOffset: { x: number; y: number }
}

export interface CompassActions {
  addNode: (node: Partial<Node>) => string // Returns the new node ID
  updateNode: (id: string, updates: Partial<Node>) => void
  removeNode: (id: string) => void
  addBeam: (beam: Partial<Beam>) => string // Returns the new beam ID
  updateBeam: (id: string, updates: Partial<Beam>) => void
  removeBeam: (id: string) => void
  setCurrentNode: (nodeId: string) => void
  setGoal: (goal: string) => void
  setMode: (mode: "tracking" | "guided") => void
  setLayout: (layout: "radial" | "vertical" | "horizontal") => void
  setColorScheme: (scheme: "default" | "business" | "professional" | "creative") => void
  setHighlightDecisions: (highlight: boolean) => void
  setHighlightQuestions: (highlight: boolean) => void
  setExpandLevel: (level: number) => void
  setZoomLevel: (level: number) => void
  setViewportOffset: (offset: { x: number; y: number }) => void
  resetCompass: () => void
  startRecording: () => void
  stopRecording: () => void
  generatePredictions: (text: string) => Promise<void>
  matchResponse: (text: string) => Promise<void>
}

export type CompassStore = CompassState & CompassActions
