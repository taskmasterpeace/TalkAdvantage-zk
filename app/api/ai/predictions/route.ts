import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to replace template variables in prompts
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { goal, conversationHistory, lastUserInput, promptTemplate, maxPredictions } = await request.json()

    if (!goal || !conversationHistory || !lastUserInput || !promptTemplate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Replace template variables
    const prompt = replaceTemplateVariables(promptTemplate, {
      goal,
      conversationHistory,
      lastUserInput,
    })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || "[]"

    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : "[]"

    // Parse the JSON
    const predictions = JSON.parse(jsonString)

    // Validate and normalize predictions
    const validPredictions = predictions
      .map((p: any) => ({
        response: p.response || "",
        confidence: Math.min(Math.max(p.confidence || 0.5, 0), 1), // Ensure confidence is between 0 and 1
      }))
      .filter((p: any) => p.response.trim() !== "")
      .slice(0, maxPredictions || 3) // Limit to max predictions

    return NextResponse.json(validPredictions)
  } catch (error: any) {
    console.error("Error generating predictions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate predictions" }, { status: 500 })
  }
}
