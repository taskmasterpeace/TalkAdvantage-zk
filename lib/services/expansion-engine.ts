import { v4 as uuidv4 } from "uuid"
import { useSettingsStore } from "@/lib/settings-store"
import type { ExpansionItem } from "@/lib/types/tracking"

// Interface for the expansion response from the API
interface ExpansionResponse {
  followUps: string[]
  example: string
  relatedTopics: string[]
  reflection: string
}

export async function generateExpansions(thought: string): Promise<ExpansionItem[]> {
  try {
    const settings = useSettingsStore.getState()

    // Get the expansion prompt template from settings
    const promptTemplate = settings.systemProps.conversationCompass.trackingMode.expansionPrompt

    const response = await fetch("/api/ai/expansions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        thought,
        promptTemplate,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to generate expansions")
    }

    const expansionData = (await response.json()) as ExpansionResponse

    // Convert the response to ExpansionItem array
    const expansionItems: ExpansionItem[] = []

    // Add follow-up questions
    if (expansionData.followUps && Array.isArray(expansionData.followUps)) {
      expansionData.followUps.forEach((question) => {
        expansionItems.push({
          id: uuidv4(),
          type: "follow-up",
          text: question,
        })
      })
    }

    // Add example
    if (expansionData.example) {
      expansionItems.push({
        id: uuidv4(),
        type: "example",
        text: expansionData.example,
      })
    }

    // Add related topics
    if (expansionData.relatedTopics && Array.isArray(expansionData.relatedTopics)) {
      expansionData.relatedTopics.forEach((topic) => {
        expansionItems.push({
          id: uuidv4(),
          type: "related-topic",
          text: topic,
        })
      })
    }

    // Add reflection
    if (expansionData.reflection) {
      expansionItems.push({
        id: uuidv4(),
        type: "reflection",
        text: expansionData.reflection,
      })
    }

    return expansionItems
  } catch (error) {
    console.error("Error generating expansions:", error)
    return []
  }
}

export async function detectTopicDrift(
  previousThought: string,
  currentThought: string,
  threshold: number,
): Promise<boolean> {
  try {
    const response = await fetch("/api/ai/topic-drift", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previousThought,
        currentThought,
        threshold,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to detect topic drift")
    }

    const data = await response.json()
    return data.hasDrifted || false
  } catch (error) {
    console.error("Error detecting topic drift:", error)
    return false
  }
}
