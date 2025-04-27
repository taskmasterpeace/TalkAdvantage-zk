import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: Request) {
  try {
    const { prompt, model, provider, baseURL, apiKey, refererURL, siteName } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Configure OpenAI client based on provider
    const config: any = {
      apiKey: apiKey || process.env.OPENAI_API_KEY || "",
    }

    // Set provider-specific configuration
    if (provider === "openrouter") {
      config.baseURL = "https://openrouter.ai/api/v1"
      config.defaultHeaders = {
        "HTTP-Referer": refererURL || process.env.NEXT_PUBLIC_SITE_URL || "",
        "X-Title": siteName || "TalkAdvantage",
      }
    } else if (provider === "custom") {
      config.baseURL = baseURL
    }

    // Create OpenAI client
    const openai = new OpenAI(config)

    // Make API request
    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return NextResponse.json({
      text: completion.choices[0].message.content,
      usage: completion.usage,
    })
  } catch (error: any) {
    console.error("Error in AI API route:", error)

    // Format error response
    const errorMessage = error.message || "Unknown error occurred"
    const statusCode = error.status || 500

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.response?.data || null,
      },
      { status: statusCode },
    )
  }
}
