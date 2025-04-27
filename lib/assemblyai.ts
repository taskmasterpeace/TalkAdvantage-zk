// Update the existing assemblyai.ts file with additional functionality

import { AssemblyAI } from "assemblyai"

// Initialize the AssemblyAI client
export const getAssemblyAIClient = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY

  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY environment variable is not set")
  }

  return new AssemblyAI({
    apiKey,
  })
}

// Update the transcribeAudioFromUrl function to include additional features
export async function transcribeAudioFromUrl(
  audioUrl: string,
  options: {
    speakerLabels?: boolean
    timestamps?: boolean
    sentimentAnalysis?: boolean
    topicDetection?: boolean
    summarization?: boolean
    summaryType?: "bullets" | "paragraph" | "headline"
    webhookUrl?: string
  },
) {
  const client = getAssemblyAIClient()

  try {
    // Validate file size if possible
    // Note: This would require additional implementation for local files

    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      speaker_labels: options.speakerLabels,
      word_boost: ["meeting", "project", "deadline", "action item", "follow up"],
      auto_highlights: true,
      punctuate: true,
      format_text: true,
      sentiment_analysis: options.sentimentAnalysis,
      iab_categories: options.topicDetection,
      summarization: options.summarization,
      summary_type: options.summaryType,
      webhook_url: options.webhookUrl,
    })

    return {
      success: true,
      transcript: transcript.text,
      id: transcript.id,
      words: transcript.words,
      utterances: transcript.utterances,
      sentiment: transcript.sentiment_analysis_results,
      topics: transcript.iab_categories_result,
      summary: transcript.summary,
      error: null,
    }
  } catch (error) {
    console.error("Error transcribing audio:", error)

    // Improved error handling with more specific messages
    let errorMessage = "Unknown error occurred during transcription"

    if (error instanceof Error) {
      errorMessage = error.message

      // Parse API-specific errors if available
      if ("status" in error && typeof error.status === "number") {
        if (error.status === 413) {
          errorMessage = "File size exceeds the maximum limit (5GB or 10 hours of audio)"
        } else if (error.status === 400) {
          errorMessage = "Invalid request: " + errorMessage
        } else if (error.status >= 500) {
          errorMessage = "Server error occurred. Please try again later."
        }
      }
    }

    return {
      success: false,
      transcript: null,
      id: null,
      words: null,
      utterances: null,
      error: errorMessage,
    }
  }
}

// Function to check the status of a transcription job
export async function getTranscriptionStatus(transcriptId: string) {
  const client = getAssemblyAIClient()

  try {
    const transcript = await client.transcripts.get(transcriptId)
    return {
      status: transcript.status,
      transcript: transcript.status === "completed" ? transcript.text : null,
      error: null,
    }
  } catch (error) {
    console.error("Error checking transcription status:", error)
    return {
      status: "error",
      transcript: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Function to upload a file and get a URL
export async function uploadAudioFile(file: File) {
  const client = getAssemblyAIClient()

  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(arrayBuffer)

    // Upload the file
    const uploadUrl = await client.files.upload(buffer)
    return {
      success: true,
      uploadUrl,
      error: null,
    }
  } catch (error) {
    console.error("Error uploading audio file:", error)
    return {
      success: false,
      uploadUrl: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Add a function to validate file size before upload
export function validateFileSize(file: File): { valid: boolean; message?: string } {
  // AssemblyAI limits: 2.2GB for upload
  const MAX_FILE_SIZE = 2.2 * 1024 * 1024 * 1024 // 2.2GB in bytes

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size (2.2GB)`,
    }
  }

  return { valid: true }
}

// Add a function to handle webhook setup
export function getWebhookUrl(baseUrl: string, transcriptId: string): string {
  // Create a webhook URL that includes the transcript ID for identification
  return `${baseUrl}/api/transcribe/webhook?transcriptId=${transcriptId}`
}

// New function to generate a temporary token for real-time transcription
export async function generateRealtimeToken(apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_in: 3600, // Token valid for 1 hour
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to generate token")
    }

    const data = await response.json()
    return data.token
  } catch (error) {
    console.error("Error generating token:", error)
    throw error
  }
}
