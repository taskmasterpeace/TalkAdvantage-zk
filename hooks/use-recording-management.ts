"use client"

import { useState, useCallback } from "react"
import { useRecordingsStore, useUIStore } from "@/lib/store"
import { getSupabaseClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

// Define types for the hook
interface UploadOptions {
  name: string
  description?: string
  isPublic?: boolean
}

interface UseRecordingManagementReturn {
  // Upload state and functions
  isUploading: boolean
  uploadProgress: number
  uploadRecording: (file: File, options: UploadOptions) => Promise<string>

  // Processing state and functions
  isProcessing: boolean
  processRecording: (recordingId: string) => Promise<void>

  // Other recording management functions
  updateRecordingMetadata: (id: string, updates: Partial<UploadOptions>) => Promise<void>
  deleteRecording: (id: string) => Promise<void>
}

/**
 * Hook for managing recording uploads and processing
 *
 * This hook combines functionality from multiple stores to provide
 * a unified interface for recording management.
 */
export function useRecordingManagement(): UseRecordingManagementReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const { addRecording, updateRecording, deleteRecording: deleteRecordingFromStore } = useRecordingsStore()
  const { addNotification, setLoading } = useUIStore()

  /**
   * Uploads an audio file to Supabase storage and creates a recording entry
   */
  const uploadRecording = useCallback(
    async (file: File, options: UploadOptions): Promise<string> => {
      setIsUploading(true)
      setUploadProgress(0)
      setLoading("recordingUpload", true)

      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("User not authenticated")
        }

        // Generate a unique ID for the recording
        const recordingId = uuidv4()

        // Create a storage path for the file
        const fileExt = file.name.split(".").pop()
        const storagePath = `recordings/${user.id}/${recordingId}.${fileExt}`

        // Upload the file to Supabase storage with progress tracking
        const { error: uploadError } = await supabase.storage.from("audio").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100)
            setUploadProgress(percent)
          },
        })

        if (uploadError) throw uploadError

        // Create recording entry in database
        const { data, error } = await supabase
          .from("recordings")
          .insert({
            id: recordingId,
            user_id: user.id,
            name: options.name,
            description: options.description || null,
            duration_seconds: 0, // Will be updated after processing
            is_public: options.isPublic || false,
            storage_path: storagePath,
            is_processed: false,
          })
          .select()
          .single()

        if (error) throw error

        // Format and add to store
        const newRecording = {
          id: data.id,
          name: data.name,
          description: data.description,
          durationSeconds: data.duration_seconds,
          createdAt: data.created_at,
          isProcessed: data.is_processed,
          storagePath: data.storage_path,
          isPublic: data.is_public,
          userId: data.user_id,
        }

        addRecording(newRecording)

        addNotification({
          type: "success",
          message: "Recording uploaded successfully",
          duration: 5000,
        })

        return recordingId
      } catch (error) {
        console.error("Upload error:", error)

        addNotification({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to upload recording",
          duration: 8000,
        })

        throw error
      } finally {
        setIsUploading(false)
        setUploadProgress(100)
        setLoading("recordingUpload", false)
      }
    },
    [addRecording, addNotification, setLoading],
  )

  /**
   * Processes a recording using AssemblyAI for transcription
   */
  const processRecording = useCallback(
    async (recordingId: string): Promise<void> => {
      setIsProcessing(true)
      setLoading("recordingProcess", true)

      try {
        // Get the recording from the store
        const supabase = getSupabaseClient()

        // Get the recording details
        const { data: recording, error: recordingError } = await supabase
          .from("recordings")
          .select("*")
          .eq("id", recordingId)
          .single()

        if (recordingError) throw recordingError

        // Get a download URL for the file
        const { data: urlData, error: urlError } = await supabase.storage
          .from("audio")
          .createSignedUrl(recording.storage_path, 3600) // 1 hour expiry

        if (urlError) throw urlError

        // Call the transcription API
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioUrl: urlData.signedUrl,
            recordingId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to process recording")
        }

        const result = await response.json()

        // Update the recording in the store
        updateRecording(recordingId, {
          isProcessed: true,
          durationSeconds: result.audioDuration || 0,
          transcriptId: result.transcriptId,
        })

        addNotification({
          type: "success",
          message: "Recording processed successfully",
          duration: 5000,
        })
      } catch (error) {
        console.error("Processing error:", error)

        addNotification({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to process recording",
          duration: 8000,
        })

        throw error
      } finally {
        setIsProcessing(false)
        setLoading("recordingProcess", false)
      }
    },
    [updateRecording, addNotification, setLoading],
  )

  /**
   * Updates recording metadata in Supabase and the local store
   */
  const updateRecordingMetadata = useCallback(
    async (id: string, updates: Partial<UploadOptions>): Promise<void> => {
      try {
        setLoading("recordingUpdate", true)

        const supabase = getSupabaseClient()

        // Convert to database field names
        const dbUpdates: Record<string, any> = {}
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.description !== undefined) dbUpdates.description = updates.description
        if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic

        const { error } = await supabase.from("recordings").update(dbUpdates).eq("id", id)

        if (error) throw error

        // Update in the store
        updateRecording(id, {
          name: updates.name,
          description: updates.description,
          isPublic: updates.isPublic,
        })

        addNotification({
          type: "success",
          message: "Recording updated successfully",
          duration: 3000,
        })
      } catch (error) {
        console.error("Update error:", error)

        addNotification({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to update recording",
          duration: 5000,
        })

        throw error
      } finally {
        setLoading("recordingUpdate", false)
      }
    },
    [updateRecording, addNotification, setLoading],
  )

  /**
   * Deletes a recording from Supabase storage and database
   */
  const deleteRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        setLoading("recordingDelete", true)

        // Get the recording to find its storage path
        const supabase = getSupabaseClient()
        const { data: recording, error: recordingError } = await supabase
          .from("recordings")
          .select("storage_path")
          .eq("id", id)
          .single()

        if (recordingError) throw recordingError

        // Delete the file from storage if it exists
        if (recording.storage_path) {
          const { error: storageError } = await supabase.storage.from("audio").remove([recording.storage_path])

          if (storageError) {
            console.error("Error deleting file from storage:", storageError)
            // Continue with deletion even if storage removal fails
          }
        }

        // Delete from database using the store function
        await deleteRecordingFromStore(id)

        addNotification({
          type: "success",
          message: "Recording deleted successfully",
          duration: 3000,
        })
      } catch (error) {
        console.error("Delete error:", error)

        addNotification({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to delete recording",
          duration: 5000,
        })

        throw error
      } finally {
        setLoading("recordingDelete", false)
      }
    },
    [deleteRecordingFromStore, addNotification, setLoading],
  )

  return {
    isUploading,
    uploadProgress,
    uploadRecording,
    isProcessing,
    processRecording,
    updateRecordingMetadata,
    deleteRecording,
  }
}
