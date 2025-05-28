export interface Node {
  id: string
  type: "goal" | "user" | "predicted" | "actual"
  text: string
  confidence?: number // Only for predicted nodes
  fromNodeId: string | null // null if start node
  speaker?: "user" | "other" | "system" // optional speaker identification
  position?: { x: number; y: number } // For visualization
  isActive?: boolean // Is this the current active node
  isHighlighted?: boolean // For visual emphasis
  expandedTalkingPoints?: string[] // Additional talking points for the node
  intent?: string // The conversational intent of the node
  goalProximity?: number // How close this node is to achieving the goal (0-1)
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
  mode: "tracking" | "guided" | "visualization"
  layout: "radial" | "vertical" | "horizontal"
  colorScheme: "default" | "business" | "professional" | "creative"
  highlightDecisions: boolean
  highlightQuestions: boolean
  expandLevel: number
  zoomLevel: number
  viewportOffset: { x: number; y: number }
  setZoomLevel: (level: number) => void
  setViewportOffset: (offset: { x: number; y: number }) => void
}

export interface CompassActions {
  addNode: (node: Omit<Node, "id">) => string // Returns the new node ID
  updateNode: (id: string, updates: Partial<Node>) => void
  removeNode: (id: string) => void
  addBeam: (beam: Omit<Beam, "id">) => string // Returns the new beam ID
  updateBeam: (id: string, updates: Partial<Beam>) => void
  removeBeam: (id: string) => void
  setCurrentNode: (nodeId: string) => void
  setGoal: (goal: string) => void
  setMode: (mode: "tracking" | "guided" | "visualization") => void
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
