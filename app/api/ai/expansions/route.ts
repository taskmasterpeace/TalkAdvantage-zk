import { type NextRequest, NextResponse } from "next/server"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TalkAdvantage Conversation Compass'
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in conversation analysis and expansion. You help users develop and deepen their ideas during speech or explanation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate expansions');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || "{}";

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
