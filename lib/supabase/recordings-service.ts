"use client"

import { getSupabaseClient } from "./client"
import { v4 as uuidv4 } from "uuid"

export interface Recording {
  id: string
  userId: string
  name: string
  description?: string
  durationSeconds: number
  storagePath: string
  createdAt: string
  updatedAt: string
  isProcessed: boolean
  isPublic: boolean
  tags?: string // JSON string of Tag[] - [{id: string, name: string, color: string}]
}

export interface CreateRecordingParams {
  name: string
  description?: string
  durationSeconds?: number
  isPublic?: boolean
  tags?: string // JSON string of Tag[] - [{id: string, name: string, color: string}]
}

export const recordingsService = {
  async getRecordings(userId: string): Promise<Recording[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching recordings:", error)
      throw error
    }

    return data.map(mapRecordingFromDb)
  },

  async getRecording(id: string): Promise<Recording | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("recordings").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("Error fetching recording:", error)
      throw error
    }

    return mapRecordingFromDb(data)
  },

  async createRecording(userId: string, file: File, params: CreateRecordingParams): Promise<Recording> {
    const supabase = getSupabaseClient()

    // 1. Upload the file to storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `recordings/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage.from("audio-files").upload(filePath, file)

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      throw uploadError
    }

    // 2. Create the recording record
    const { data, error } = await supabase
      .from("recordings")
      .insert({
        user_id: userId,
        name: params.name,
        description: params.description || null,
        duration_seconds: params.durationSeconds || 0,
        storage_path: filePath,
        is_public: params.isPublic || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating recording:", error)
      throw error
    }

    return mapRecordingFromDb(data)
  },

  async updateRecording(id: string, params: Partial<CreateRecordingParams>): Promise<Recording> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("recordings")
      .update({
        name: params.name,
        description: params.description,
        duration_seconds: params.durationSeconds,
        is_public: params.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating recording:", error)
      throw error
    }

    return mapRecordingFromDb(data)
  },

  async deleteRecording(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    // First get the recording to get the storage path
    const { data: recording, error: fetchError } = await supabase
      .from("recordings")
      .select("storage_path")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching recording for deletion:", fetchError)
      throw fetchError
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage.from("audio-files").remove([recording.storage_path])

    if (storageError) {
      console.error("Error deleting file from storage:", storageError)
      // Continue with deletion of database record even if storage deletion fails
    }

    // Delete the recording record
    const { error } = await supabase.from("recordings").delete().eq("id", id)

    if (error) {
      console.error("Error deleting recording:", error)
      throw error
    }
  },

  async getRecordingUrl(storagePath: string): Promise<string> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.storage.from("audio-files").createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) {
      console.error("Error getting signed URL:", error)
      throw error
    }

    return data.signedUrl
  },
}

// Helper function to map database record to our interface
function mapRecordingFromDb(data: any): Recording {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    durationSeconds: data.duration_seconds,
    storagePath: data.storage_path,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isProcessed: data.is_processed,
    isPublic: data.is_public,
    tags: data.tags
  }
}
