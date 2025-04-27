import OpenAI from "openai"

// This function will only be called at runtime, not during build
export function getOpenAIClient() {
  // Make sure we're in a runtime environment
  if (typeof process === "undefined") {
    throw new Error("OpenAI client can only be initialized in a Node.js environment")
  }

  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured")
  }

  // Return a new instance of the OpenAI client
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}
