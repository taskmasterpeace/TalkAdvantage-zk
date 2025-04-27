import OpenAI from "openai"

// Create a singleton instance of the OpenAI client
let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    openaiClient = new OpenAI({
      apiKey,
    })
  }

  return openaiClient
}
