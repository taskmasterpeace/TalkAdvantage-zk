import { useSettingsStore } from "@/lib/settings-store"

// Define the prediction response type
export interface Prediction {
  response: string
  confidence: number
}

export async function generatePredictionsFromAPI(
  goal: string,
  conversationHistory: string,
  lastUserInput: string,
): Promise<Prediction[]> {
  try {
    const settings = useSettingsStore.getState()

    // Get the prediction prompt template from settings
    const promptTemplate = settings.systemProps.conversationCompass.guidedConversations.predictionPrompt
    const maxPredictions = settings.systemProps.conversationCompass.guidedConversations.maxPredictions || 3

    const response = await fetch("/api/ai/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goal,
        conversationHistory,
        lastUserInput,
        promptTemplate,
        maxPredictions,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to generate predictions")
    }

    return await response.json()
  } catch (error) {
    console.error("Error generating predictions:", error)
    return []
  }
}

export async function evaluateGoalProgress(goal: string, conversationHistory: string): Promise<number> {
  try {
    const settings = useSettingsStore.getState()

    // Get the goal evaluation prompt template from settings
    const promptTemplate = settings.systemProps.conversationCompass.guidedConversations.goalEvaluationPrompt

    const response = await fetch("/api/ai/goal-evaluation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goal,
        conversationHistory,
        promptTemplate,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to evaluate goal progress")
    }

    const data = await response.json()
    return data.progress || 0
  } catch (error) {
    console.error("Error evaluating goal progress:", error)
    return 0
  }
}
