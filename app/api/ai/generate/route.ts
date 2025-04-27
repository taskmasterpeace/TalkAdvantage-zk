import { type NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai-client"

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = "gpt-4o", temperature = 0.7, max_tokens = 1000 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Only get the OpenAI client at runtime
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens,
    })

    return NextResponse.json({
      text: response.choices[0]?.message?.content || "",
    })
  } catch (error: any) {
    console.error("Error in generate endpoint:", error)
    return NextResponse.json({ error: error.message || "Failed to generate text" }, { status: 500 })
  }
}
