import { NextResponse } from "next/server"
import OpenAI from "openai"
import type { AnalyticsProfile } from "@/lib/template-store"

export async function POST(request: Request) {
  try {
    const { transcript, template, model, provider, baseURL, apiKey, refererURL, siteName } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    if (!template) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 })
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

    // Prepare the prompt using the template
    const templateObj = template as AnalyticsProfile
    const systemPrompt = templateObj.system_prompt

    // Get today's date
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const userPrompt = `${templateObj.user_prompt}\n\n${templateObj.template_prompt}\n\nTranscript:\n${transcript}`

    // Make API request
    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\nToday's date is ${today}.`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    // Process the response
    const analysisText = completion.choices[0].message.content || ""

    // Try to parse the response as structured data if possible
    let structuredAnalysis = {}
    try {
      // Check if the response is in JSON format
      if (analysisText.includes("{") && analysisText.includes("}")) {
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/)
        if (jsonMatch) {
          const jsonContent = jsonMatch[1] || jsonMatch[2]
          structuredAnalysis = JSON.parse(jsonContent.trim())
        }
      }
    } catch (error) {
      console.log("Response is not in JSON format, returning as text")
      // If parsing fails, we'll just use the text as is
    }

    return NextResponse.json({
      text: analysisText,
      structured: Object.keys(structuredAnalysis).length > 0 ? structuredAnalysis : null,
      usage: completion.usage,
    })
  } catch (error: any) {
    console.error("Error in analysis API route:", error)

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
