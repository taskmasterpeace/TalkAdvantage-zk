import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { CompassState, Node as CompassNode, Beam as CompassBeam } from "@/lib/types/compass"
import { generatePredictionsFromAPI } from "../services/prediction-engine"

interface CompassStore extends CompassState {
  setZoomLevel: (level: number) => void
  setViewportOffset: (offset: { x: number; y: number }) => void
  setGoal: (goal: string) => void
  addNode: (node: Omit<CompassNode, "id">) => string
  updateNode: (id: string, updates: Partial<CompassNode>) => void
  setCurrentNode: (id: string) => void
  setProcessing: (isProcessing: boolean) => void
  setMode: (mode: "tracking" | "guided" | "visualization") => void
  setLayout: (layout: "radial" | "vertical" | "horizontal") => void
  setColorScheme: (scheme: "default" | "business" | "professional" | "creative") => void
  setHighlightDecisions: (highlight: boolean) => void
  setHighlightQuestions: (highlight: boolean) => void
  setExpandLevel: (level: number) => void
  resetCompass: () => void
  generatePredictions: (input: string) => void
  matchResponse: (response: string) => void
  addBeam: (beam: Omit<CompassBeam, "id">) => string
  updateBeam: (id: string, updates: Partial<CompassBeam>) => void
  removeBeam: (id: string) => void
}

const initialState: Omit<CompassStore, keyof CompassState> = {
  setZoomLevel: () => {},
  setViewportOffset: () => {},
  setGoal: () => {},
  addNode: () => "",
  updateNode: () => {},
  setCurrentNode: () => {},
  setProcessing: () => {},
  setMode: () => {},
  resetCompass: () => {},
  generatePredictions: () => {},
  matchResponse: () => {},
  addBeam: () => "",
  updateBeam: () => {},
  removeBeam: () => {},
}

export const useCompassStore = create<CompassStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      beams: [],
      currentNodeId: null,
      goal: "",
      isRecording: false,
      isProcessing: false,
      mode: "guided",
      layout: "radial",
      colorScheme: "default",
      highlightDecisions: true,
      highlightQuestions: true,
      expandLevel: 1,
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      ...initialState,

      setZoomLevel: (level: number) => {
        set({ zoomLevel: level })
      },

      setViewportOffset: (offset: { x: number; y: number }) => {
        set({ viewportOffset: offset })
      },

      addNode: (nodeData: Omit<CompassNode, "id">) => {
        const id = uuidv4()
        const newNode: CompassNode = {
          id,
          type: nodeData.type || "user",
          text: nodeData.text || "",
          fromNodeId: nodeData.fromNodeId,
          speaker: nodeData.speaker || "user",
          confidence: nodeData.confidence,
          position: nodeData.position,
          isActive: nodeData.isActive || false,
          isHighlighted: nodeData.isHighlighted || false,
          expandedTalkingPoints: nodeData.expandedTalkingPoints,
          intent: nodeData.intent,
          goalProximity: nodeData.goalProximity,
        }

        set((state) => ({
          nodes: [...state.nodes, newNode],
          currentNodeId: nodeData.isActive ? id : state.currentNodeId,
        }))

        // If this is a goal node, create initial beams
        if (nodeData.type === "goal") {
          // No beams needed for goal node as it's the root
        } else if (nodeData.fromNodeId) {
          // Create a beam from the parent node to this node
          get().addBeam({
            fromNodeId: nodeData.fromNodeId,
            toNodeId: id,
            thickness: nodeData.type === "predicted" ? 0.8 : 1,
            isActive: nodeData.isActive || false,
          })
        }

        return id
      },

      updateNode: (id: string, updates: Partial<CompassNode>) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
        }))
      },

      removeNode: (id: string) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          beams: state.beams.filter((beam) => beam.fromNodeId !== id && beam.toNodeId !== id),
          currentNodeId:
            state.currentNodeId === id ? state.nodes.find((n) => n.id !== id)?.id || null : state.currentNodeId,
        }))
      },

      addBeam: (beamData: Omit<CompassBeam, "id">) => {
        const id = uuidv4()
        const newBeam: CompassBeam = {
          id,
          fromNodeId: beamData.fromNodeId,
          toNodeId: beamData.toNodeId,
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

      setGoal: (goal: string) => {
        set({ goal })

        // If this is a new goal, create a goal node
        if (goal && get().nodes.length === 0) {
          const goalNodeId = get().addNode({
            type: "goal",
            text: goal,
            fromNodeId: null,
            isActive: true,
            speaker: "system"
          })
          set({ currentNodeId: goalNodeId })
        }
      },

      setMode: (mode: "tracking" | "guided" | "visualization") => set({ mode }),
      setLayout: (layout: "radial" | "vertical" | "horizontal") => set({ layout }),
      setColorScheme: (scheme: "default" | "business" | "professional" | "creative") => set({ colorScheme }),
      setHighlightDecisions: (highlightDecisions) => set({ highlightDecisions }),
      setHighlightQuestions: (highlightQuestions) => set({ highlightQuestions }),
      setExpandLevel: (expandLevel) => set({ expandLevel }),
      setZoomLevel: (level: number) => set({ zoomLevel }),
      setViewportOffset: (offset: { x: number; y: number }) => set({ viewportOffset }),

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

      // Helper function to build conversation history from nodes
      buildConversationHistory: (nodes: CompassNode[], currentNodeId: string): string => {
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
    }),
    {
      name: "compass-store",
    }
  )
)

// Helper function to find the best match among predictions
function findBestMatch(text: string, predictions: CompassNode[]): CompassNode | undefined {
  let bestMatch: CompassNode | undefined = undefined
  let bestConfidence = 0

  predictions.forEach((prediction) => {
    const confidence = calculateConfidence(text, prediction.text)
    if (confidence > bestConfidence) {
      bestConfidence = confidence
      bestMatch = prediction
    }
  })

  return bestMatch
}

// Helper function to calculate confidence between two strings
function calculateConfidence(text1: string, text2: string): number {
  // Implement your confidence calculation logic here
  return 0.5 // Placeholder return, actual implementation needed
}