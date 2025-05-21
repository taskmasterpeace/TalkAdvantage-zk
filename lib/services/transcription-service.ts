"use client"

interface TranscriptionOptions {
  speakerLabels?: boolean
  timestamps?: boolean
  sentimentAnalysis?: boolean
  topicDetection?: boolean
  summarization?: boolean
  summaryType?: "bullets" | "paragraph" | "headline"
  summaryModel?: "informative" | "conversational"
}

interface TranscriptionResult {
  success: boolean
  transcriptId?: string
  transcript?: string
  words?: any[]
  utterances?: any[]
  sentiment?: any[]
  topics?: any[]
  summary?: string
  duration_seconds?: number
  entities?: Array<{
    text: string
    type: 'person' | 'organization'
    start: number
    end: number
    confidence: number
  }>
  error?: string
}

export const transcriptionService = {
  async transcribeFromUrl(
    audioUrl: string,
    options: TranscriptionOptions = {},
    recordingId?: string,
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData()
      formData.append("audioUrl", audioUrl)

      if (recordingId) {
        formData.append("recordingId", recordingId)
      }

      // Add all options to formData
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value.toString())
      })

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Transcription failed")
      }

      return await response.json()
    } catch (error) {
      console.error("Transcription service error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },

  async transcribeFromFile(
    file: File,
    options: TranscriptionOptions = {},
    recordingId?: string,
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      if (recordingId) {
        formData.append("recordingId", recordingId)
      }

      // Add all options to formData
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value.toString())
      })

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Transcription failed")
      }

      return await response.json()
    } catch (error) {
      console.error("Transcription service error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },

  async getTranscriptionStatus(transcriptId: string): Promise<TranscriptionResult> {
    try {
      const response = await fetch(`/api/transcribe?transcriptId=${transcriptId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get transcription status")
      }

      return await response.json()
    } catch (error) {
      console.error("Transcription status error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },
}
