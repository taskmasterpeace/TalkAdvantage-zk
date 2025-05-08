import { type NextRequest, NextResponse } from "next/server"
import { transcribeAudioFromUrl, uploadAudioFile, validateFileSize } from "@/lib/assemblyai"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const audioUrl = formData.get("audioUrl") as string | null
    const speakerLabels = formData.get("speakerLabels") === "true"
    const timestamps = formData.get("timestamps") === "true"
    const sentimentAnalysis = formData.get("sentimentAnalysis") === "true"
    const topicDetection = formData.get("topicDetection") === "true"
    const summarization = formData.get("summarization") === "true"
    const summaryType = formData.get("summaryType") as "bullets" | "paragraph" | "headline" | undefined

    if (!file && !audioUrl) {
      return NextResponse.json({ error: "Either file or audioUrl must be provided" }, { status: 400 })
    }

    // Validate file size if a file was provided
    if (file) {
      const validation = validateFileSize(file)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.message }, { status: 413 })
      }
    }

    let transcriptionUrl = audioUrl

    // If a file was uploaded, we need to upload it to AssemblyAI first
    if (file) {
      const uploadResult = await uploadAudioFile(file)

      if (!uploadResult.success || !uploadResult.uploadUrl) {
        return NextResponse.json({ error: uploadResult.error || "Failed to upload file" }, { status: 500 })
      }

      transcriptionUrl = uploadResult.uploadUrl
    }

    // Create a webhook URL based on the request origin
    const origin = request.headers.get("origin") || "http://localhost:3000"
    const webhookUrl = `${origin}/api/transcribe/webhook`

    // Now transcribe the audio with all options
    const transcriptionResult = await transcribeAudioFromUrl(transcriptionUrl!, {
      speakerLabels,
      timestamps,
      sentimentAnalysis,
      topicDetection,
      summarization,
      summaryType,
      webhookUrl,
    })

    if (!transcriptionResult.success) {
      return NextResponse.json({ error: transcriptionResult.error || "Transcription failed" }, { status: 500 })
    }

    // Get the duration if available
    let durationSeconds = 0
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      const lastWord = transcriptionResult.words[transcriptionResult.words.length - 1]
      durationSeconds = Math.ceil(lastWord.end / 1000) // Convert ms to seconds
    }

    // If we have a recording ID, update the recording in Supabase
    const recordingId = formData.get("recordingId") as string | null
    if (recordingId) {
      const supabase = await getSupabaseServerClient()

      // Update the recording
      await supabase
        .from("recordings")
        .update({
          is_processed: true,
          duration_seconds: durationSeconds,
        })
        .eq("id", recordingId)

      // Create transcript entry
      await supabase.from("transcripts").insert({
        recording_id: recordingId,
        full_text: transcriptionResult.transcript
      })
    }

    return NextResponse.json({
      success: true,
      transcriptId: transcriptionResult.id,
      transcript: transcriptionResult.transcript,
      words: transcriptionResult.words,
      utterances: transcriptionResult.utterances,
      sentiment: transcriptionResult.sentiment,
      topics: transcriptionResult.topics,
      summary: transcriptionResult.summary,
      duration_seconds: durationSeconds,
    })
  } catch (error) {
    console.error("Error in transcribe API route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// Add a webhook handler
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // AssemblyAI sends a webhook with transcript_id and status
    const { transcript_id, status } = body

    if (!transcript_id) {
      return NextResponse.json({ error: "Missing transcript_id in webhook payload" }, { status: 400 })
    }

    console.log(`Received webhook for transcript ${transcript_id} with status: ${status}`)

    // Here you would typically update your database or notify the client
    // For this example, we'll just return a success response

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in webhook handler:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams
  const transcriptId = searchParams.get("transcriptId")

  if (!transcriptId) {
    return NextResponse.json({ error: "transcriptId is required" }, { status: 400 })
  }

  try {
    const { getTranscriptionStatus } = await import("@/lib/assemblyai")
    const result = await getTranscriptionStatus(transcriptId)

    if (result.status === "error") {
      return NextResponse.json({ error: result.error || "Failed to get transcription status" }, { status: 500 })
    }

    return NextResponse.json({
      status: result.status,
      transcript: result.transcript,
    })
  } catch (error) {
    console.error("Error in transcription status API route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
