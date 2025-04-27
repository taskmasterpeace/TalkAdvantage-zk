import { useSettingsStore } from "./settings-store"

/**
 * Generate text using the server-side AI endpoint
 */
export async function generateText(
  prompt: string,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {},
): Promise<string> {
  try {
    const settings = useSettingsStore.getState()

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model: options.model || settings.aiModel || "gpt-4o",
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to generate text")
    }

    const data = await response.json()
    return data.content || ""
  } catch (error) {
    console.error("Error generating text:", error)
    throw error
  }
}

/**
 * Generate a transcript summary using the server-side AI endpoint
 */
export async function generateTranscriptSummary(transcript: string): Promise<string> {
  const prompt = `Please summarize the following transcript in a concise way, highlighting key points and action items:

${transcript}`

  return generateText(prompt, { temperature: 0.3 })
}

/**
 * Generate analysis of a transcript using the server-side AI endpoint
 */
export async function analyzeTranscript(
  transcript: string,
  analysisType: "basic" | "detailed" = "basic",
): Promise<any> {
  const prompt =
    analysisType === "detailed"
      ? `Analyze the following transcript in detail. Extract key topics, sentiment, action items, questions, and decisions:

${transcript}

Format your response as JSON with the following structure:
{
  "summary": "Brief summary of the conversation",
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": "Overall sentiment",
  "actionItems": ["Action 1", "Action 2"],
  "questions": ["Question 1", "Question 2"],
  "decisions": ["Decision 1", "Decision 2"]
}`
      : `Analyze the following transcript. Extract key topics and action items:

${transcript}

Format your response as JSON with the following structure:
{
  "summary": "Brief summary of the conversation",
  "topics": ["Topic 1", "Topic 2"],
  "actionItems": ["Action 1", "Action 2"]
}`

  const response = await generateText(prompt, { temperature: 0.2 })

  try {
    return JSON.parse(response)
  } catch (error) {
    console.error("Error parsing AI response as JSON:", error)
    return { error: "Failed to parse response", rawResponse: response }
  }
}
