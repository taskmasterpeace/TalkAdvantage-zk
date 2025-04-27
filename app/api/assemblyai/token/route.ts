import { NextResponse } from "next/server"
import { generateRealtimeToken } from "@/lib/assemblyai"

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    try {
      const token = await generateRealtimeToken(apiKey)
      return NextResponse.json({ token })
    } catch (error) {
      console.error("Error generating token:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to generate token" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in token API route:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
