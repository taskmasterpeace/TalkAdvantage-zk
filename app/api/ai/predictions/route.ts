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
    const { goal, conversationHistory, lastUserInput, promptTemplate } = await request.json()

    if (!goal || !conversationHistory || !lastUserInput) {
      return NextResponse.json(
        { error: "Goal, conversation history, and last user input are required" },
        { status: 400 },
      )
    }

    // Replace template variables
    const prompt = replaceTemplateVariables(promptTemplate, {
      goal,
      conversationHistory,
      lastUserInput,
    })

    // Only get the OpenAI client at runtime
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || "{}"

    try {
      const predictions = JSON.parse(content)
      return NextResponse.json(predictions)
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse predictions response" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error in predictions endpoint:", error)
    return NextResponse.json({ error: error.message || "Failed to generate predictions" }, { status: 500 })
  }
}
