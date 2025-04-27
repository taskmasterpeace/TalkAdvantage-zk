import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import type { TrackingStore, ThoughtSegment, ExpansionItem } from "../types/tracking"
import { generateExpansions, detectTopicDrift } from "../services/expansion-engine"
import { useSettingsStore } from "../settings-store"

interface TrackingModeActions {
  startTracking: () => void
  stopTracking: () => void
  addThought: (text: string) => Promise<void>
  setExpansions: (items: ExpansionItem[]) => void
  resetTracking: () => void
  clearExpansions: () => void
}

const initialState: Omit<TrackingStore, keyof TrackingModeActions> = {
  isTracking: false,
  isProcessing: false,
  currentThought: null,
  previousThoughts: [],
  expansions: [],
  topicTag: null,
  lastProcessedTimestamp: 0,
  silenceTimeout: null,
}

export const useTrackingStore = create<TrackingStore>()((set, get) => ({
  ...initialState,

  startTracking: () => {
    // Clear any existing silence timeout
    if (get().silenceTimeout) {
      clearTimeout(get().silenceTimeout)
    }

    set({
      isTracking: true,
      isProcessing: false,
      currentThought: null,
      expansions: [],
      silenceTimeout: null,
    })
  },

  stopTracking: () => {
    // Clear any existing silence timeout
    if (get().silenceTimeout) {
      clearTimeout(get().silenceTimeout)
    }

    set({
      isTracking: false,
      silenceTimeout: null,
    })
  },

  addThought: async (text: string) => {
    // Don't process if not tracking or already processing
    if (!get().isTracking || get().isProcessing) {
      return
    }

    // Clear any existing silence timeout
    if (get().silenceTimeout) {
      clearTimeout(get().silenceTimeout)
    }

    // Create a new thought segment
    const newThought: ThoughtSegment = {
      id: uuidv4(),
      text,
      timestamp: Date.now(),
    }

    // Check for topic drift if we have a previous thought
    let shouldResetExpansions = false
    const previousThought = get().currentThought

    if (previousThought) {
      // Add the current thought to previous thoughts
      const updatedPreviousThoughts = [...get().previousThoughts, previousThought]

      // Limit the number of previous thoughts based on settings
      const settings = useSettingsStore.getState()
      const maxThoughts = settings.systemProps.conversationCompass.trackingMode.maxThoughtsHistory
      const limitedPreviousThoughts = updatedPreviousThoughts.slice(-maxThoughts)

      set({
        previousThoughts: limitedPreviousThoughts,
      })

      // Check for topic drift
      if (text.trim() !== "") {
        const driftThreshold = settings.systemProps.conversationCompass.trackingMode.topicDriftThreshold
        const hasDrift = await detectTopicDrift(previousThought.text, text, driftThreshold)
        shouldResetExpansions = hasDrift
      }
    }

    // Set the new thought as current
    set({
      currentThought: newThought,
      isProcessing: true,
    })

    // If topic has drifted, clear existing expansions
    if (shouldResetExpansions) {
      set({ expansions: [] })
    }

    try {
      // Generate expansions for the new thought
      const expansions = await generateExpansions(text)

      set({
        expansions,
        lastProcessedTimestamp: Date.now(),
        isProcessing: false,
      })

      // Set up silence timeout
      const settings = useSettingsStore.getState()
      const timeoutSeconds = settings.systemProps.conversationCompass.trackingMode.silenceTimeoutSeconds

      const silenceTimeout = setTimeout(() => {
        // Only stop tracking if we're still tracking and haven't processed anything new
        if (get().isTracking && get().lastProcessedTimestamp === Date.now()) {
          get().stopTracking()
        }
      }, timeoutSeconds * 1000)

      set({ silenceTimeout: silenceTimeout as unknown as number })
    } catch (error) {
      console.error("Error generating expansions:", error)
      set({ isProcessing: false })
    }
  },

  setExpansions: (items: ExpansionItem[]) => {
    set({ expansions: items })
  },

  resetTracking: () => {
    // Clear any existing silence timeout
    if (get().silenceTimeout) {
      clearTimeout(get().silenceTimeout)
    }

    set({
      ...initialState,
      isTracking: get().isTracking, // Preserve tracking state
    })
  },

  clearExpansions: () => {
    set({ expansions: [] })
  },
}))
