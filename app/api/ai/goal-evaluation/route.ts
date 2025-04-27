import { type NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai-client"

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
    const { goal, conversationHistory, promptTemplate } = await request.json()

    if (!goal || !conversationHistory) {
      return NextResponse.json({ error: "Goal and conversation history are required" }, { status: 400 })
    }

    // Replace template variables
    const prompt = replaceTemplateVariables(promptTemplate, {
      goal,
      conversationHistory,
    })

    // Only get the OpenAI client at runtime
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    })

    const content = response.choices[0]?.message?.content || "0"

    // Extract the number from the response
    const progressMatch = content.match(/([0-9]*[.])?[0-9]+/)
    const progressValue = progressMatch ? Number.parseFloat(progressMatch[0]) : 0

    // Ensure the value is between 0 and 1
    return NextResponse.json({
      progress: Math.min(Math.max(progressValue, 0), 1),
    })
  } catch (error: any) {
    console.error("Error in goal evaluation endpoint:", error)
    return NextResponse.json({ error: error.message || "Failed to evaluate goal progress" }, { status: 500 })
  }
}
