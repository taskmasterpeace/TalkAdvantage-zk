import { type NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai-client"

export async function POST(request: NextRequest) {
  try {
    const { previousThought, currentThought } = await request.json()

    if (!previousThought || !currentThought) {
      return NextResponse.json({ error: "Previous and current thoughts are required" }, { status: 400 })
    }

    // Only get the OpenAI client at runtime
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Compare these two thoughts and determine if there has been a significant topic shift. 
          Return only a number between 0 and 1, where 0 means the topics are identical and 1 means they are completely different.
          
          Previous thought: "${previousThought}"
          Current thought: "${currentThought}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    })

    const content = response.choices[0]?.message?.content || "0"

    // Extract the number from the response
    const driftMatch = content.match(/([0-9]*[.])?[0-9]+/)
    const driftValue = driftMatch ? Number.parseFloat(driftMatch[0]) : 0

    // Ensure the value is between 0 and 1
    return NextResponse.json({
      drift: Math.min(Math.max(driftValue, 0), 1),
    })
  } catch (error: any) {
    console.error("Error in topic drift endpoint:", error)
    return NextResponse.json({ error: error.message || "Failed to detect topic drift" }, { status: 500 })
  }
}
