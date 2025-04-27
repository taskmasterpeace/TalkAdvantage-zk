"use client"

import { getSupabaseClient } from "./client"

export interface TranscriptSegment {
  id: string
  transcriptId: string
  speaker: string | null
  startMs: number
  endMs: number
  text: string
  createdAt: string
}

export interface Transcript {
  id: string
  recordingId: string
  fullText: string | null
  segments: TranscriptSegment[]
  createdAt: string
  updatedAt: string
}

export interface CreateTranscriptParams {
  recordingId: string
  fullText?: string
  segments?: Omit<TranscriptSegment, "id" | "transcriptId" | "createdAt">[]
}

export const transcriptsService = {
  async getTranscript(recordingId: string): Promise<Transcript | null> {
    const supabase = getSupabaseClient()

    // Get the transcript
    const { data: transcriptData, error: transcriptError } = await supabase
      .from("transcripts")
      .select("*")
      .eq("recording_id", recordingId)
      .single()

    if (transcriptError) {
      if (transcriptError.code === "PGRST116") {
        return null
      }
      console.error("Error fetching transcript:", transcriptError)
      throw transcriptError
    }

    // Get the segments
    const { data: segmentsData, error: segmentsError } = await supabase
      .from("transcript_segments")
      .select("*")
      .eq("transcript_id", transcriptData.id)
      .order("start_ms", { ascending: true })

    if (segmentsError) {
      console.error("Error fetching transcript segments:", segmentsError)
      throw segmentsError
    }

    return {
      id: transcriptData.id,
      recordingId: transcriptData.recording_id,
      fullText: transcriptData.full_text,
      segments: segmentsData.map(mapSegmentFromDb),
      createdAt: transcriptData.created_at,
      updatedAt: transcriptData.updated_at,
    }
  },

  async createTranscript(params: CreateTranscriptParams): Promise<Transcript> {
    const supabase = getSupabaseClient()

    // Create the transcript
    const { data: transcriptData, error: transcriptError } = await supabase
      .from("transcripts")
      .insert({
        recording_id: params.recordingId,
        full_text: params.fullText || null,
      })
      .select()
      .single()

    if (transcriptError) {
      console.error("Error creating transcript:", transcriptError)
      throw transcriptError
    }

    // Create the segments if provided
    if (params.segments && params.segments.length > 0) {
      const segmentsToInsert = params.segments.map((segment) => ({
        transcript_id: transcriptData.id,
        speaker: segment.speaker,
        start_ms: segment.startMs,
        end_ms: segment.endMs,
        text: segment.text,
      }))

      const { data: segmentsData, error: segmentsError } = await supabase
        .from("transcript_segments")
        .insert(segmentsToInsert)
        .select()

      if (segmentsError) {
        console.error("Error creating transcript segments:", segmentsError)
        throw segmentsError
      }

      return {
        id: transcriptData.id,
        recordingId: transcriptData.recording_id,
        fullText: transcriptData.full_text,
        segments: segmentsData.map(mapSegmentFromDb),
        createdAt: transcriptData.created_at,
        updatedAt: transcriptData.updated_at,
      }
    }

    return {
      id: transcriptData.id,
      recordingId: transcriptData.recording_id,
      fullText: transcriptData.full_text,
      segments: [],
      createdAt: transcriptData.created_at,
      updatedAt: transcriptData.updated_at,
    }
  },

  async updateTranscript(id: string, params: Partial<CreateTranscriptParams>): Promise<void> {
    const supabase = getSupabaseClient()

    // Update the transcript
    const { error: transcriptError } = await supabase
      .from("transcripts")
      .update({
        full_text: params.fullText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (transcriptError) {
      console.error("Error updating transcript:", transcriptError)
      throw transcriptError
    }

    // Add new segments if provided
    if (params.segments && params.segments.length > 0) {
      const segmentsToInsert = params.segments.map((segment) => ({
        transcript_id: id,
        speaker: segment.speaker,
        start_ms: segment.startMs,
        end_ms: segment.endMs,
        text: segment.text,
      }))

      const { error: segmentsError } = await supabase.from("transcript_segments").insert(segmentsToInsert)

      if (segmentsError) {
        console.error("Error adding transcript segments:", segmentsError)
        throw segmentsError
      }
    }
  },

  async addSegment(
    transcriptId: string,
    segment: Omit<TranscriptSegment, "id" | "transcriptId" | "createdAt">,
  ): Promise<TranscriptSegment> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("transcript_segments")
      .insert({
        transcript_id: transcriptId,
        speaker: segment.speaker,
        start_ms: segment.startMs,
        end_ms: segment.endMs,
        text: segment.text,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding transcript segment:", error)
      throw error
    }

    return mapSegmentFromDb(data)
  },

  async deleteTranscript(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from("transcripts").delete().eq("id", id)

    if (error) {
      console.error("Error deleting transcript:", error)
      throw error
    }
  },
}

// Helper function to map database record to our interface
function mapSegmentFromDb(data: any): TranscriptSegment {
  return {
    id: data.id,
    transcriptId: data.transcript_id,
    speaker: data.speaker,
    startMs: data.start_ms,
    endMs: data.end_ms,
    text: data.text,
    createdAt: data.created_at,
  }
}
