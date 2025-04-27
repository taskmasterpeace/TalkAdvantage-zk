import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { previousThought, currentThought, threshold } = await request.json()

    if (!previousThought || !currentThought || threshold === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const prompt = `
You are analyzing two consecutive thoughts from a speaker to determine if there has been a significant topic shift.

Previous thought: "${previousThought}"
Current thought: "${currentThought}"

On a scale from 0 to 1, how much has the topic shifted?
- 0 means the thoughts are on exactly the same topic
- 1 means the thoughts are on completely different topics

Respond with ONLY a number between 0 and 1.
`

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a smaller model for efficiency
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    })

    const content = response.choices[0]?.message?.content || "0"

    // Extract the number from the response
    const driftMatch = content.match(/([0-9]*[.])?[0-9]+/)
    const driftValue = driftMatch ? Number.parseFloat(driftMatch[0]) : 0

    // Compare with threshold
    const hasDrifted = driftValue >= threshold

    return NextResponse.json({ hasDrifted, driftValue })
  } catch (error: any) {
    console.error("Error detecting topic drift:", error)
    return NextResponse.json({ error: error.message || "Failed to detect topic drift" }, { status: 500 })
  }
}
