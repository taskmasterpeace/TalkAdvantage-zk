export interface ThoughtSegment {
  id: string
  text: string
  timestamp: number
}

export interface ExpansionItem {
  id: string
  text: string
  points: string[]
  intent: string
  type: "question" | "example" | "topic" | "reflection"
}

export interface TrackingModeState {
  isTracking: boolean
  isProcessing: boolean
  currentThought: ThoughtSegment | null
  previousThoughts: ThoughtSegment[]
  expansions: ExpansionItem[]
  topicTag: string | null
  lastProcessedTimestamp: number
  silenceTimeout: ReturnType<typeof setTimeout> | null
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
