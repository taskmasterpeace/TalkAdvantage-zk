import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeOption = "light" | "dark" | "system"
export type AudioQualityOption = "low" | "medium" | "high"
export type StorageLocationType = "local" | "cloud"
export type QuestionType =
  | "YES_NO"
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_CHOICE_FILL"
  | "SPEAKER_IDENTIFICATION"
  | "MEETING_TYPE"
  | "OPEN_ENDED"

interface SettingsState {
  // General Settings
  theme: ThemeOption
  autoSave: boolean
  audioQuality: AudioQualityOption
  volume: number

  // Recording Settings
  silenceDetection: {
    enabled: boolean
    thresholdMinutes: number
    autoStopSeconds: number
  }

  // Widget Settings
  enableDragDrop: boolean
  widgetPositions: Record<string, { x: number, y: number }>
  widgetSizes: Record<string, { width: number, height: number }>
  minimizedWidgets: string[]
  maximizedWidget: string | null

  // API Keys
  assemblyAIKey: string
  openRouterKey: string

  // AI Model Settings
  aiBaseURL: string
  aiProvider: "openai" | "openrouter" | "custom"
  aiModel: string
  aiRefererURL: string
  aiSiteName: string

  // System Props
  systemProps: {
    curiosityEngine: {
      enabled: boolean
      questionCount: number
      allowedQuestionTypes: QuestionType[]
      customizableGuidelines: string
      autoGenerateOnAnalysis: boolean
    }
    conversationCompass: {
      enabled: boolean
      visualizationType: "tree" | "flow" | "network"
      autoUpdateOnAnalysis: boolean
      // Guided Conversations settings
      guidedConversations: {
        enabled: boolean
        predictionPrompt: string
        goalEvaluationPrompt: string
        defaultGoal: string
        maxPredictions: number
      }
      // Tracking Mode settings
      trackingMode: {
        enabled: boolean
        expansionPrompt: string
        topicDriftThreshold: number
        silenceTimeoutSeconds: number
        maxThoughtsHistory: number
      }
    }
  }

  // Storage Settings
  storageLocation: StorageLocationType

  // Methods
  setTheme: (theme: ThemeOption) => void
  setAutoSave: (autoSave: boolean) => void
  setAudioQuality: (quality: AudioQualityOption) => void
  setVolume: (volume: number) => void
  setAssemblyAIKey: (key: string) => void
  setOpenRouterKey: (key: string) => void
  setAIBaseURL: (url: string) => void
  setAIProvider: (provider: "openai" | "openrouter" | "custom") => void
  setAIModel: (model: string) => void
  setAIRefererURL: (url: string) => void
  setAISiteName: (name: string) => void
  setStorageLocation: (location: StorageLocationType) => void

  // System Props Methods
  setCuriosityEngineEnabled: (enabled: boolean) => void
  setCuriosityEngineQuestionCount: (count: number) => void
  setCuriosityEngineAllowedQuestionTypes: (types: QuestionType[]) => void
  setCuriosityEngineCustomizableGuidelines: (guidelines: string) => void
  setCuriosityEngineAutoGenerateOnAnalysis: (auto: boolean) => void
  setConversationCompassEnabled: (enabled: boolean) => void
  setConversationCompassVisualizationType: (type: "tree" | "flow" | "network") => void
  setConversationCompassAutoUpdateOnAnalysis: (auto: boolean) => void

  // Guided Conversations methods
  setGuidedConversationsEnabled: (enabled: boolean) => void
  setGuidedConversationsPredictionPrompt: (prompt: string) => void
  setGuidedConversationsGoalEvaluationPrompt: (prompt: string) => void
  setGuidedConversationsDefaultGoal: (goal: string) => void
  setGuidedConversationsMaxPredictions: (count: number) => void

  // Tracking Mode methods
  setTrackingModeEnabled: (enabled: boolean) => void
  setTrackingModeExpansionPrompt: (prompt: string) => void
  setTrackingModeTopicDriftThreshold: (threshold: number) => void
  setTrackingModeSilenceTimeoutSeconds: (seconds: number) => void
  setTrackingModeMaxThoughtsHistory: (count: number) => void

  // Silence Detection Methods
  setSilenceDetectionEnabled: (enabled: boolean) => void
  setSilenceThresholdMinutes: (minutes: number) => void
  setSilenceAutoStopSeconds: (seconds: number) => void

  // Widget Methods
  setEnableDragDrop: (enabled: boolean) => void
  setWidgetPositions: (positions: Record<string, { x: number, y: number }>) => void
  setWidgetPosition: (widgetId: string, position: { x: number, y: number }) => void
  setWidgetSizes: (sizes: Record<string, { width: number, height: number }>) => void
  setWidgetSize: (widgetId: string, size: { width: number, height: number }) => void
  setMinimizedWidgets: (widgets: string[]) => void
  setMaximizedWidget: (widget: string | null) => void
  resetWidgetPositions: () => void
  toggleMinimizeWidget: (widgetId: string) => void

  resetSettings: () => void
}

const defaultSettings = {
  theme: "system" as ThemeOption,
  autoSave: true,
  audioQuality: "high" as AudioQualityOption,
  volume: 80,

  // Widget Settings
  enableDragDrop: true,
  widgetPositions: {},
  widgetSizes: {},
  minimizedWidgets: [
    "ai-insights", 
    "bookmarks", 
    "audio-controls", 
    "analysis-settings", 
    "tags", 
    "conversation-compass-widget", 
    "curiosity-engine-widget"
  ],
  maximizedWidget: null,

  // Default Silence Detection Settings
  silenceDetection: {
    enabled: true,
    thresholdMinutes: 7,
    autoStopSeconds: 30
  },

  assemblyAIKey: "",
  openRouterKey: "",
  aiBaseURL: "https://api.openai.com/v1",
  aiProvider: "openai" as "openai" | "openrouter" | "custom",
  aiModel: "gpt-4o",
  aiRefererURL: typeof window !== "undefined" ? window.location.origin : "",
  aiSiteName: "TalkAdvantage",

  // Default System Props
  systemProps: {
    curiosityEngine: {
      enabled: true,
      questionCount: 3,
      allowedQuestionTypes: [
        "YES_NO",
        "MULTIPLE_CHOICE",
        "MULTIPLE_CHOICE_FILL",
        "SPEAKER_IDENTIFICATION",
        "MEETING_TYPE",
        "OPEN_ENDED",
      ] as QuestionType[],
      customizableGuidelines: `Generate questions that:
- Are relevant to the transcript content
- Help clarify important points
- Uncover underlying context
- Are concise and clear
- Have meaningful multiple choice options when applicable`,
      autoGenerateOnAnalysis: true,
    },
    conversationCompass: {
      enabled: true,
      visualizationType: "tree" as "tree" | "flow" | "network",
      autoUpdateOnAnalysis: true,
      // Default values for guided conversations
      guidedConversations: {
        enabled: true,
        predictionPrompt: `You are an AI conversation strategist helping a user achieve a specific goal.
Based on the conversation so far, predict 2-3 possible responses the other person might say next.
Rate your confidence in each prediction from 0 to 1.

Focus on realistic dialogue that helps progress toward the user's goal.

Input:
- Goal: "{{goal}}"
- Conversation So Far: 
{{conversationHistory}}
- Last User Input: "{{lastUserInput}}"

Output JSON Example:
[
  { "response": "Sure, when are you thinking?", "confidence": 0.9 },
  { "response": "I'll have to check my schedule.", "confidence": 0.7 },
  { "response": "I might be traveling, but maybe.", "confidence": 0.5 }
]

Respond with ONLY the JSON array of predictions.`,
        goalEvaluationPrompt: `You are an AI conversation strategist helping a user achieve a specific goal.
Based on the conversation so far, evaluate how close the user is to achieving their goal.
Return a single number between 0 and 1, where:
- 0 means no progress toward the goal
- 1 means the goal has been fully achieved

Input:
- Goal: "{{goal}}"
- Conversation So Far: 
{{conversationHistory}}

Output Example:
0.75

Respond with ONLY a number between 0 and 1.`,
        defaultGoal: "Schedule a follow-up meeting",
        maxPredictions: 3,
      },
      // Default values for tracking mode
      trackingMode: {
        enabled: true,
        expansionPrompt: `You are an expert conversation assistant helping a user develop and deepen their ideas during a speech or explanation.

Based on the user's last thought, generate expansions in the following format:

1. 1-2 follow-up questions to deepen exploration
2. 1 example, story, or analogy that could strengthen the point
3. 1-2 related topics the speaker could naturally weave in
4. 1 brief reflection or summary that could encourage elaboration

Match the tone of the speaker (professional, casual, deep, assertive, etc).

Output as structured JSON.

Input:
User's latest thought: "{{thought}}"

Output JSON Example:
{
  "followUps": [
    "Can you share an example of a time when a clear vision led to a major success?",
    "How do you balance giving independence without losing alignment?"
  ],
  "example": "You could mention how NASA's Apollo missions had a single clear vision—landing on the moon—which empowered thousands of teams to innovate independently.",
  "relatedTopics": [
    "The psychology of autonomy in teams",
    "How to communicate vision effectively across cultures"
  ],
  "reflection": "It sounds like you're emphasizing trust as a foundation for leadership. Would you agree?"
}

Respond with ONLY the JSON object.`,
        topicDriftThreshold: 0.6, // 0-1 scale, higher means more sensitive to topic changes
        silenceTimeoutSeconds: 30,
        maxThoughtsHistory: 10,
      },
    },
  },

  storageLocation: "local" as StorageLocationType,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setVolume: (volume) => set({ volume }),
      setAssemblyAIKey: (assemblyAIKey) => set({ assemblyAIKey }),
      setOpenRouterKey: (openRouterKey) => set({ openRouterKey }),
      setAIBaseURL: (aiBaseURL) => set({ aiBaseURL }),
      setAIProvider: (aiProvider) => set({ aiProvider }),
      setAIModel: (aiModel) => set({ aiModel }),
      setAIRefererURL: (aiRefererURL) => set({ aiRefererURL }),
      setAISiteName: (aiSiteName) => set({ aiSiteName }),
      setStorageLocation: (storageLocation) => set({ storageLocation }),

      // System Props Methods
      setCuriosityEngineEnabled: (enabled) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            curiosityEngine: {
              ...state.systemProps.curiosityEngine,
              enabled,
            },
          },
        })),
      setCuriosityEngineQuestionCount: (questionCount) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            curiosityEngine: {
              ...state.systemProps.curiosityEngine,
              questionCount,
            },
          },
        })),
      setCuriosityEngineAllowedQuestionTypes: (allowedQuestionTypes) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            curiosityEngine: {
              ...state.systemProps.curiosityEngine,
              allowedQuestionTypes,
            },
          },
        })),
      setCuriosityEngineCustomizableGuidelines: (customizableGuidelines) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            curiosityEngine: {
              ...state.systemProps.curiosityEngine,
              customizableGuidelines,
            },
          },
        })),
      setCuriosityEngineAutoGenerateOnAnalysis: (autoGenerateOnAnalysis) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            curiosityEngine: {
              ...state.systemProps.curiosityEngine,
              autoGenerateOnAnalysis,
            },
          },
        })),
      setConversationCompassEnabled: (enabled) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              enabled,
            },
          },
        })),
      setConversationCompassVisualizationType: (visualizationType) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              visualizationType,
            },
          },
        })),
      setConversationCompassAutoUpdateOnAnalysis: (autoUpdateOnAnalysis) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              autoUpdateOnAnalysis,
            },
          },
        })),

      // Guided Conversations methods
      setGuidedConversationsEnabled: (enabled) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              guidedConversations: {
                ...state.systemProps.conversationCompass.guidedConversations,
                enabled,
              },
            },
          },
        })),
      setGuidedConversationsPredictionPrompt: (predictionPrompt) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              guidedConversations: {
                ...state.systemProps.conversationCompass.guidedConversations,
                predictionPrompt,
              },
            },
          },
        })),
      setGuidedConversationsGoalEvaluationPrompt: (goalEvaluationPrompt) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              guidedConversations: {
                ...state.systemProps.conversationCompass.guidedConversations,
                goalEvaluationPrompt,
              },
            },
          },
        })),
      setGuidedConversationsDefaultGoal: (defaultGoal) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              guidedConversations: {
                ...state.systemProps.conversationCompass.guidedConversations,
                defaultGoal,
              },
            },
          },
        })),
      setGuidedConversationsMaxPredictions: (maxPredictions) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              guidedConversations: {
                ...state.systemProps.conversationCompass.guidedConversations,
                maxPredictions,
              },
            },
          },
        })),

      // Tracking Mode methods
      setTrackingModeEnabled: (enabled) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              trackingMode: {
                ...state.systemProps.conversationCompass.trackingMode,
                enabled,
              },
            },
          },
        })),
      setTrackingModeExpansionPrompt: (expansionPrompt) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              trackingMode: {
                ...state.systemProps.conversationCompass.trackingMode,
                expansionPrompt,
              },
            },
          },
        })),
      setTrackingModeTopicDriftThreshold: (topicDriftThreshold) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              trackingMode: {
                ...state.systemProps.conversationCompass.trackingMode,
                topicDriftThreshold,
              },
            },
          },
        })),
      setTrackingModeSilenceTimeoutSeconds: (silenceTimeoutSeconds) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              trackingMode: {
                ...state.systemProps.conversationCompass.trackingMode,
                silenceTimeoutSeconds,
              },
            },
          },
        })),
      setTrackingModeMaxThoughtsHistory: (maxThoughtsHistory) =>
        set((state) => ({
          systemProps: {
            ...state.systemProps,
            conversationCompass: {
              ...state.systemProps.conversationCompass,
              trackingMode: {
                ...state.systemProps.conversationCompass.trackingMode,
                maxThoughtsHistory,
              },
            },
          },
        })),

      // Silence Detection Setters
      setSilenceDetectionEnabled: (enabled) =>
        set((state) => ({
          silenceDetection: {
            ...state.silenceDetection,
            enabled
          }
        })),

      setSilenceThresholdMinutes: (minutes) =>
        set((state) => ({
          silenceDetection: {
            ...state.silenceDetection,
            thresholdMinutes: minutes
          }
        })),

      setSilenceAutoStopSeconds: (seconds) =>
        set((state) => ({
          silenceDetection: {
            ...state.silenceDetection,
            autoStopSeconds: seconds
          }
        })),

      // Widget Methods
      setEnableDragDrop: (enabled) => set({ enableDragDrop: enabled }),
      setWidgetPositions: (positions) => set({ widgetPositions: positions }),
      setWidgetPosition: (widgetId, position) => set((state) => ({
        widgetPositions: {
          ...state.widgetPositions,
          [widgetId]: position,
        },
      })),
      setWidgetSizes: (sizes) => set({ widgetSizes: sizes }),
      setWidgetSize: (widgetId, size) => set((state) => ({
        widgetSizes: {
          ...state.widgetSizes,
          [widgetId]: size,
        },
      })),
      setMinimizedWidgets: (widgets) => set({ minimizedWidgets: widgets }),
      toggleMinimizeWidget: (widgetId) => set((state) => {
        // Never allow live-text widget to be minimized
        if (widgetId === "live-text") {
          // Remove it from minimized if it's somehow there
          return {
            minimizedWidgets: state.minimizedWidgets.filter((id) => id !== widgetId)
          };
        }
        
        // Normal behavior for other widgets
        return {
          minimizedWidgets: state.minimizedWidgets.includes(widgetId)
            ? state.minimizedWidgets.filter((id) => id !== widgetId)
            : [...state.minimizedWidgets, widgetId],
        };
      }),
      setMaximizedWidget: (widget) => set({ maximizedWidget: widget }),
      resetWidgetPositions: () => set({ 
        widgetPositions: {},
        widgetSizes: {},
        minimizedWidgets: [
          "ai-insights", 
          "bookmarks", 
          "audio-controls", 
          "analysis-settings", 
          "tags", 
          "conversation-compass-widget", 
          "curiosity-engine-widget"
        ],
        maximizedWidget: null,
      }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "talkadvantage-settings",
      partialize: (state) => ({
        theme: state.theme,
        autoSave: state.autoSave,
        audioQuality: state.audioQuality,
        volume: state.volume,
        assemblyAIKey: state.assemblyAIKey,
        openRouterKey: state.openRouterKey,
        aiBaseURL: state.aiBaseURL,
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        aiRefererURL: state.aiRefererURL,
        aiSiteName: state.aiSiteName,
        systemProps: state.systemProps,
        storageLocation: state.storageLocation,
        silenceDetection: state.silenceDetection,
        enableDragDrop: state.enableDragDrop,
        widgetPositions: state.widgetPositions,
        widgetSizes: state.widgetSizes,
        minimizedWidgets: state.minimizedWidgets,
        maximizedWidget: state.maximizedWidget,
      }),
    },
  ),
)
