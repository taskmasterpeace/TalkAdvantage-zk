import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, temperature, maxTokens } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens,
    })

    return NextResponse.json({
      content: completion.choices[0].message.content || "",
    })
  } catch (error: any) {
    console.error("Error generating text:", error)
    return NextResponse.json({ error: error.message || "Failed to generate text" }, { status: 500 })
  }
}
