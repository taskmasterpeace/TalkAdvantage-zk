import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import type { TrackingStore, ThoughtSegment, ExpansionItem } from "../types/tracking"
import { generateExpansions, detectTopicDrift } from "../services/expansion-engine"
import { useSettingsStore } from "../settings-store"
import { useCompassStore } from "../store/compass-store"

interface TrackingModeActions {
  startTracking: () => void
  stopTracking: () => void
  addThought: (text: string) => Promise<void>
  setExpansions: (items: ExpansionItem[]) => void
  resetTracking: () => void
  clearExpansions: () => void
}

const initialState = {
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
    set({ isTracking: true })
    
    // Create initial goal node in compass store
    const compassStore = useCompassStore.getState()
    if (!compassStore.goal) {
      compassStore.setGoal("Track conversation flow and topics")
      const goalNodeId = compassStore.addNode({
        type: "goal",
        text: "Track conversation flow and topics",
        fromNodeId: null,
        isActive: true
      })
      compassStore.setCurrentNode(goalNodeId)
    }
  },

  stopTracking: () => {
    // Clear any existing silence timeout
    if (get().silenceTimeout) {
      clearTimeout(get().silenceTimeout)
    }
    set({ isTracking: false, silenceTimeout: null })
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

    // Add the thought to the compass visualization
    const compassStore = useCompassStore.getState()
    const currentCompassNodeId = compassStore.currentNodeId

    if (currentCompassNodeId) {
      // Add the thought as a node
      const thoughtNodeId = compassStore.addNode({
        type: "user",
        text,
        fromNodeId: currentCompassNodeId,
        speaker: "user",
        isActive: true
      })

      // Add a beam connecting the nodes
      compassStore.addBeam({
        fromNodeId: currentCompassNodeId,
        toNodeId: thoughtNodeId,
        thickness: 1,
        isActive: true
      })

      // Set this as the current node
      compassStore.setCurrentNode(thoughtNodeId)
    }

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

      // Add expansion nodes to the compass visualization
      if (expansions.length > 0 && compassStore.currentNodeId) {
        expansions.forEach((expansion) => {
          // Add the expansion as a predicted node
          const expansionNodeId = compassStore.addNode({
            type: "predicted",
            text: expansion.text,
            fromNodeId: compassStore.currentNodeId,
            speaker: "other",
            expandedTalkingPoints: expansion.points,
            intent: expansion.intent,
            confidence: 0.8
          })

          // Add a beam connecting to the expansion
          compassStore.addBeam({
            fromNodeId: compassStore.currentNodeId!,
            toNodeId: expansionNodeId,
            thickness: 0.8,
            isActive: false
          })
        })
      }

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

    // Reset the compass visualization
    const compassStore = useCompassStore.getState()
    compassStore.resetCompass()
  },

  clearExpansions: () => {
    set({ expansions: [] })
  },
}))
