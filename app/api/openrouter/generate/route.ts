import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { prompt, systemPrompt, model, isHotLink = false } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Make request to OpenRouter API
    console.log("Making request to OpenRouter API", model)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "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"}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://talkadvantage.com",
        "X-Title": "TalkAdvantage"
      },
      body: JSON.stringify({
        model: model || "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: isHotLink ? prompt : `Generate 2-3 contextual questions about this conversation segment. Include a mix of yes/no, multiple choice, and open-ended questions. Format your response as a JSON array with this structure:
            [
              {
                "id": "q1",
                "text": "question text",
                "type": "yes_no|multiple_choice|free_text",
                "options": ["option1", "option2"] // include for multiple_choice only
              }
            ]

            Here's the conversation segment to analyze: ${prompt}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        top_p: 0.9
      })
    })

    // Better error handling
    if (!response.ok) {
      let errorMessage = "Failed to get response from OpenRouter"
      try {
        const errorData = await response.text() // First get as text
        try {
          const jsonError = JSON.parse(errorData)
          errorMessage = jsonError.message || jsonError.error || errorMessage
          // Add more specific error handling for model-related errors
          if (errorMessage.includes('model') || errorMessage.includes('Model')) {
            errorMessage = `Model "${model}" is not available through OpenRouter. Please select a different model.`
          }
        } catch {
          // If not JSON, might be HTML or plain text
          errorMessage = errorData.includes('<!doctype') 
            ? 'Invalid API endpoint or authentication error' 
            : errorData
        }
      } catch (e) {
        errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    const questionsText = data.choices[0].message.content

    // Try to parse structured data if the response is in JSON format and not from HotLink
    let structuredQuestions = {}
    if (!isHotLink) {
      try {
        structuredQuestions = JSON.parse(questionsText)
      } catch (error) {
        console.log("Response is not in JSON format, using raw text")
      }
    }

    return NextResponse.json({
      text: questionsText,
      structured: structuredQuestions
    })

  } catch (error) {
    console.error("Error in OpenRouter API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate questions" },
      { status: 500 }
    )
  }
} 