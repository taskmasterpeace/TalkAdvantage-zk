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
    const { thought, promptTemplate } = await request.json()

    if (!thought || !promptTemplate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Replace template variables
    const prompt = replaceTemplateVariables(promptTemplate, {
      thought,
    })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || "{}"

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : "{}"

    // Parse the JSON
    const expansionData = JSON.parse(jsonString)

    return NextResponse.json(expansionData)
  } catch (error: any) {
    console.error("Error generating expansions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate expansions" }, { status: 500 })
  }
}
