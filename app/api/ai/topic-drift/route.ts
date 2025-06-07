import { type NextRequest, NextResponse } from "next/server"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const { previousThought, currentThought, threshold } = await request.json()

    if (!previousThought || !currentThought || threshold === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const prompt = `Compare these two conversation segments and determine if there has been a significant topic drift.

Previous thought: "${previousThought}"
Current thought: "${currentThought}"
Drift threshold: ${threshold} (0-1 scale, higher means more sensitive)

Analyze:
1. Semantic similarity
2. Contextual continuity
3. Topic coherence
4. Natural conversation flow

Return ONLY a JSON object with a single boolean property "hasDrifted" indicating if the drift exceeds the threshold.
Example: {"hasDrifted": true}`

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TalkAdvantage Conversation Compass'
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-opus-20240229",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in analyzing conversation flow and topic coherence. You provide precise assessments of topic drift in conversations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to detect topic drift');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || "{}";

    // Parse the JSON response
    const driftData = JSON.parse(content)

    return NextResponse.json({ hasDrifted: Boolean(driftData.hasDrifted) })
  } catch (error: any) {
    console.error("Error detecting topic drift:", error)
    return NextResponse.json({ error: error.message || "Failed to detect topic drift" }, { status: 500 })
  }
}
