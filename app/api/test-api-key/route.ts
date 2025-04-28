import { NextResponse } from "next/server"
import { generateRealtimeToken } from "@/lib/assemblyai"

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ valid: false, message: "API key is required" }, { status: 400 })
    }

    try {
      // Generate a real-time token to validate the API key
      await generateRealtimeToken(apiKey)
      return NextResponse.json({ valid: true })
    } catch (error: any) {
      return NextResponse.json({ valid: false, message: error instanceof Error ? error.message : "Invalid API key" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error in API key validation:", error)
    return NextResponse.json({ valid: false, message: "Server error validating API key" }, { status: 500 })
  }
}
