export interface ThoughtSegment {
  id: string
  text: string
  timestamp: number
  topicTag?: string // Optional: quick topic label
}

export interface ExpansionItem {
  id: string
  type: "follow-up" | "example" | "related-topic" | "reflection"
  text: string
  confidence?: number // optional
}

export interface TrackingModeState {
  isTracking: boolean
  isProcessing: boolean
  currentThought: ThoughtSegment | null
  previousThoughts: ThoughtSegment[]
  expansions: ExpansionItem[]
  topicTag: string | null
  lastProcessedTimestamp: number
  silenceTimeout: number | null
}

export interface TrackingModeActions {
  startTracking: () => void
  stopTracking: () => void
  addThought: (text: string) => Promise<void>
  setExpansions: (items: ExpansionItem[]) => void
  resetTracking: () => void
  clearExpansions: () => void
}

export type TrackingStore = TrackingModeState & TrackingModeActions
