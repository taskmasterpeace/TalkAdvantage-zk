import { NextResponse } from "next/server"

const MAX_WORDS = 3000; // Maximum number of words to analyze

// Function to get latest N words from text
function getLatestWords(text: string, maxWords: number = MAX_WORDS): string {
  const words = text.split(/\s+/);
  console.log(`Total words in transcript: ${words.length}`);
  
  if (words.length <= maxWords) {
    console.log(`Using entire transcript (${words.length} words)`);
    return text;
  }
  
  const latestWords = words.slice(-maxWords);
  console.log(`Using latest ${maxWords} words out of ${words.length} total words`);
  return latestWords.join(' ');
}

export async function POST(request: Request) {
  try {
    const { transcript, template } = await request.json()

    // Debug logging
    console.log("Received template:", JSON.stringify(template, null, 2))
    console.log("Template settings:", template?.settings)
    console.log("Template model:", template?.settings?.model)

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    if (!template) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 })
    }

    // Get latest 3000 words for analysis
    const latestText = getLatestWords(transcript);
    console.log("Using text length:", latestText.length)

    // Prepare the prompts
    const systemPrompt = template.system_prompt || "You are an AI assistant that analyzes conversations."
    const userPrompt = template.user_prompt || "Analyze this transcript."
    const templatePrompt = template.template_prompt || ""

    // Get the model from template settings or use default
    const model = template.settings?.model || "mistralai/mistral-7b-instruct"
    console.log("Using model:", model)

    // Validate model format
    if (!model.includes('/')) {
      throw new Error(`Invalid model format: ${model}. Model must be in format 'provider/model-name'`)
    }

    // Make request to OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "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"}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://talkadvantage.com",
        "X-Title": "TalkAdvantage"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `${systemPrompt} `
          }, 
          {
            role: "user",
            content: `${userPrompt}\n\n${templatePrompt}\nTranscript:\n${latestText}`
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
    const analysisText = data.choices[0].message.content

    // Try to parse structured data if the response is in JSON format
    let structuredAnalysis = {}
    try {
      structuredAnalysis = JSON.parse(analysisText)
    } catch (error) {
      console.log("Response is not in JSON format, using raw text")
    }

    return NextResponse.json({
      text: analysisText,
      structured: structuredAnalysis
    })

  } catch (error) {
    console.error("Error in OpenRouter API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze transcript" },
      { status: 500 }
    )
  }
} 