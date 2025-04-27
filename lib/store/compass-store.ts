import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { CompassStore, Node, Beam } from "../types/compass"
import { generatePredictionsFromAPI } from "../services/prediction-engine"

interface CompassState {
  nodes: Node[]
  beams: Beam[]
  currentNodeId: string | null
  goal: string
  isRecording: boolean
  isProcessing: boolean
  mode: "tracking" | "brainstorming"
  layout: "radial" | "grid"
  colorScheme: "default" | "dark"
  highlightDecisions: boolean
  highlightQuestions: boolean
  expandLevel: number
  zoomLevel: number
  viewportOffset: { x: number; y: number }
}

const initialState: CompassState = {
  nodes: [],
  beams: [],
  currentNodeId: null,
  goal: "",
  isRecording: false,
  isProcessing: false,
  mode: "tracking",
  layout: "radial",
  colorScheme: "default",
  highlightDecisions: true,
  highlightQuestions: true,
  expandLevel: 1,
  zoomLevel: 1,
  viewportOffset: { x: 0, y: 0 },
}

export const useCompassStore = create<CompassStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addNode: (nodeData) => {
        const id = nodeData.id || uuidv4()
        const newNode: Node = {
          id,
          type: nodeData.type || "user",
          text: nodeData.text || "",
          fromNodeId: nodeData.fromNodeId || null,
          speaker: nodeData.speaker,
          confidence: nodeData.confidence,
          position: nodeData.position,
          isActive: nodeData.isActive || false,
          isHighlighted: nodeData.isHighlighted || false,
        }

        set((state) => ({
          nodes: [...state.nodes, newNode],
          currentNodeId: nodeData.isActive ? id : state.currentNodeId,
        }))

        return id
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
        }))
      },

      removeNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          beams: state.beams.filter((beam) => beam.fromNodeId !== id && beam.toNodeId !== id),
          currentNodeId:
            state.currentNodeId === id ? state.nodes.find((n) => n.id !== id)?.id || null : state.currentNodeId,
        }))
      },

      addBeam: (beamData) => {
        const id = beamData.id || uuidv4()
        const newBeam: Beam = {
          id,
          fromNodeId: beamData.fromNodeId || "",
          toNodeId: beamData.toNodeId || "",
          thickness: beamData.thickness || 1,
          isActive: beamData.isActive || false,
        }

        set((state) => ({
          beams: [...state.beams, newBeam],
        }))

        return id
      },

      updateBeam: (id, updates) => {
        set((state) => ({
          beams: state.beams.map((beam) => (beam.id === id ? { ...beam, ...updates } : beam)),
        }))
      },

      removeBeam: (id) => {
        set((state) => ({
          beams: state.beams.filter((beam) => beam.id !== id),
        }))
      },

      setCurrentNode: (nodeId) => {
        // First, update all nodes to set isActive to false
        set((state) => ({
          nodes: state.nodes.map((node) => ({
            ...node,
            isActive: node.id === nodeId,
          })),
          currentNodeId: nodeId,
        }))

        // Then, update beams to highlight the active path
        const state = get()
        const currentNode = state.nodes.find((n) => n.id === nodeId)

        if (currentNode && currentNode.fromNodeId) {
          set((state) => ({
            beams: state.beams.map((beam) => ({
              ...beam,
              isActive: beam.fromNodeId === currentNode.fromNodeId && beam.toNodeId === nodeId,
            })),
          }))
        }
      },

      setGoal: (goal) => {
        set({ goal })

        // If this is a new goal, create a goal node
        if (goal && get().nodes.length === 0) {
          const goalNodeId = get().addNode({
            type: "goal",
            text: goal,
            isActive: true,
          })
          set({ currentNodeId: goalNodeId })
        }
      },

      setMode: (mode) => set({ mode }),
      setLayout: (layout) => set({ layout }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setHighlightDecisions: (highlightDecisions) => set({ highlightDecisions }),
      setHighlightQuestions: (highlightQuestions) => set({ highlightQuestions }),
      setExpandLevel: (expandLevel) => set({ expandLevel }),
      setZoomLevel: (zoomLevel) => set({ zoomLevel }),
      setViewportOffset: (viewportOffset) => set({ viewportOffset }),

      resetCompass: () => {
        set({
          ...initialState,
          mode: get().mode, // Preserve the current mode
          layout: get().layout, // Preserve the current layout
          colorScheme: get().colorScheme, // Preserve the color scheme
        })
      },

      startRecording: () => {
        set({ isRecording: true })
      },

      stopRecording: () => {
        set({ isRecording: false })
      },

      generatePredictions: async (text) => {
        const state = get()

        if (!state.currentNodeId || !state.goal) return

        set({ isProcessing: true })

        try {
          // Get the conversation history
          const history = buildConversationHistory(state.nodes, state.currentNodeId)

          // Generate predictions using the API
          const predictions = await generatePredictionsFromAPI(state.goal, history, text)

          // Add prediction nodes
          predictions.forEach((prediction) => {
            const nodeId = get().addNode({
              type: "predicted",
              text: prediction.response,
              confidence: prediction.confidence,
              fromNodeId: state.currentNodeId,
              speaker: "other",
            })

            // Add beam from current node to prediction
            get().addBeam({
              fromNodeId: state.currentNodeId!,
              toNodeId: nodeId,
              thickness: prediction.confidence || 0.5,
            })
          })
        } catch (error) {
          console.error("Error generating predictions:", error)
        } finally {
          set({ isProcessing: false })
        }
      },

      matchResponse: async (text) => {
        const state = get()

        if (!state.currentNodeId) return

        set({ isProcessing: true })

        try {
          // Find predicted nodes connected to the current node
          const predictedNodes = state.nodes.filter(
            (node) => node.type === "predicted" && node.fromNodeId === state.currentNodeId,
          )

          // Find the best match among predictions
          const bestMatch = findBestMatch(text, predictedNodes)

          if (bestMatch) {
            // Update the matched prediction to an actual node
            get().updateNode(bestMatch.id, {
              type: "actual",
              isActive: true,
            })

            // Set this as the current node
            get().setCurrentNode(bestMatch.id)
          } else {
            // No match found, create a new actual node
            const newNodeId = get().addNode({
              type: "actual",
              text,
              fromNodeId: state.currentNodeId,
              speaker: "other",
              isActive: true,
            })

            // Add beam from current node to new node
            get().addBeam({
              fromNodeId: state.currentNodeId,
              toNodeId: newNodeId,
              thickness: 1,
              isActive: true,
            })

            // Set this as the current node
            get().setCurrentNode(newNodeId)
          }
        } catch (error) {
          console.error("Error matching response:", error)
        } finally {
          set({ isProcessing: false })
        }
      },
    }),
    {
      name: "compass-storage",
      partialize: (state) => ({
        goal: state.goal,
        mode: state.mode,
        layout: state.layout,
        colorScheme: state.colorScheme,
        highlightDecisions: state.highlightDecisions,
        highlightQuestions: state.highlightQuestions,
        expandLevel: state.expandLevel,
      }),
    },
  ),
)

// Helper function to build conversation history from nodes
function buildConversationHistory(nodes: Node[], currentNodeId: string): string {
  const history: string[] = []
  let nodeId: string | null = currentNodeId

  // Build history in reverse (from current node back to goal)
  while (nodeId) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) break

    // Add to history if it's a user or actual node (not predictions)
    if (node.type === "user" || node.type === "actual") {
      const speaker = node.speaker === "user" ? "User" : "Other"
      history.unshift(`${speaker}: ${node.text}`)
    }

    nodeId = node.fromNodeId
  }

  return history.join("\n")
}

// Helper function to find the best matching prediction
function findBestMatch(text: string, predictions: Node[]): Node | null {
  if (!predictions.length) return null

  // Simple matching algorithm - could be improved with more sophisticated NLP
  const matches = predictions.map((node) => ({
    node,
    score: calculateSimilarity(text.toLowerCase(), node.text.toLowerCase()),
  }))

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score)

  // Return the best match if it's above a threshold
  return matches[0].score > 0.6 ? matches[0].node : null
}

// Simple text similarity function
function calculateSimilarity(a: string, b: string): number {
  // This is a very basic implementation
  // Could be improved with more sophisticated NLP techniques
  const wordsA = a.split(/\s+/)
  const wordsB = b.split(/\s+/)

  let matches = 0
  for (const wordA of wordsA) {
    if (wordsB.includes(wordA)) matches++
  }

  return matches / Math.max(wordsA.length, wordsB.length)
}
