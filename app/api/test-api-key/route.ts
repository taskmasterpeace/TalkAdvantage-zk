import { NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ valid: false, message: "API key is required" }, { status: 400 })
    }

    // Initialize AssemblyAI client with the provided API key
    const client = new AssemblyAI({
      apiKey,
    })

    try {
      // Make a simple API call to verify the key is valid
      // We'll use the getTranscript method with a non-existent ID
      // This will fail with a 404, but the authentication will be checked first
      await client.transcripts.get("test-validation-only")

      // If we get here without an auth error, the key is valid
      return NextResponse.json({ valid: true })
    } catch (error: any) {
      // Check if the error is due to authentication or just a 404
      if (error.status === 401 || error.message?.includes("auth")) {
        return NextResponse.json({ valid: false, message: "Invalid API key" }, { status: 401 })
      }

      // If it's a 404 or other expected error, the key is still valid
      if (error.status === 404) {
        return NextResponse.json({ valid: true })
      }

      // For any other error, we'll assume the key is invalid
      return NextResponse.json({ valid: false, message: "Error validating API key" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in API key validation:", error)
    return NextResponse.json({ valid: false, message: "Server error validating API key" }, { status: 500 })
  }
}
