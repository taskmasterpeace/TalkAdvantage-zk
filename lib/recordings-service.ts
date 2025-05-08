"use client"

import { useSettingsStore } from "@/lib/settings-store"
import { recordingsService, type Recording, type CreateRecordingParams } from "@/lib/supabase/recordings-service"
import { indexedDBService, type LocalRecording, type CreateLocalRecordingParams } from "@/lib/indexeddb/indexed-db-service"

// Map local recording to common interface
function mapLocalToCommon(local: LocalRecording): Recording {
  return {
    id: local.id,
    userId: local.userId,
    name: local.name,
    description: local.description || undefined,
    durationSeconds: local.durationSeconds,
    storagePath: local.id, // Use ID as storage path for local recordings
    createdAt: local.createdAt,
    updatedAt: local.createdAt,
    isProcessed: local.isProcessed,
    isPublic: local.isPublic,
  }
}

/**
 * Upload a file to the cloud using the API endpoint
 */
async function uploadToCloud(userId: string, file: File, params: CreateRecordingParams): Promise<Recording> {
  try {
    console.log(`Attempting to upload file for user ${userId}, filename: ${file.name}, size: ${file.size} bytes`);
    
    // Create a FormData object to send the file and parameters
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.durationSeconds) formData.append('durationSeconds', params.durationSeconds.toString());
    formData.append('isPublic', (params.isPublic || false).toString());
    
    // Upload using our API route
    console.log(`Sending file to API endpoint`);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`File uploaded successfully through API: ${result.filePath}`);
    
    // Return the recording data
    return result.recording;
  } catch (error) {
    console.error("Error uploading file to cloud:", error);
    throw error;
  }
}

export const unifiedRecordingsService = {
  /**
   * Get all recordings for a user
   */
  async getRecordings(userId: string): Promise<Recording[]> {
    const { storageLocation } = useSettingsStore.getState()
    
    if (storageLocation === "local") {
      const localRecordings = await indexedDBService.getRecordings(userId)
      return localRecordings.map(mapLocalToCommon)
    } else {
      return recordingsService.getRecordings(userId)
    }
  },
  
  /**
   * Get a recording by ID
   */
  async getRecording(id: string): Promise<Recording | null> {
    const { storageLocation } = useSettingsStore.getState()
    
    if (storageLocation === "local") {
      const localRecording = await indexedDBService.getRecording(id)
      return localRecording ? mapLocalToCommon(localRecording) : null
    } else {
      return recordingsService.getRecording(id)
    }
  },
  
  /**
   * Create a new recording
   */
  async createRecording(userId: string, file: File, params: CreateRecordingParams): Promise<Recording> {
    const { storageLocation } = useSettingsStore.getState()
    
    if (storageLocation === "local") {
      // Convert params to local format
      const localParams: CreateLocalRecordingParams = {
        name: params.name,
        description: params.description,
        durationSeconds: params.durationSeconds,
        isPublic: params.isPublic,
      }
      
      const localRecording = await indexedDBService.createRecording(userId, file, localParams)
      return mapLocalToCommon(localRecording)
    } else {
      // For cloud storage, use the API endpoint
      return uploadToCloud(userId, file, params)
    }
  },
  
  /**
   * Delete a recording
   */
  async deleteRecording(id: string): Promise<void> {
    const { storageLocation } = useSettingsStore.getState()
    
    if (storageLocation === "local") {
      return indexedDBService.deleteRecording(id)
    } else {
      return recordingsService.deleteRecording(id)
    }
  },
  
  /**
   * Get the URL for a recording's audio
   */
  async getRecordingUrl(storagePath: string): Promise<string> {
    const { storageLocation } = useSettingsStore.getState()
    
    if (storageLocation === "local") {
      // For local recordings, the storagePath is the ID
      return indexedDBService.getRecordingUrl(storagePath)
    } else {
      return recordingsService.getRecordingUrl(storagePath)
    }
  },
  
  /**
   * Check if the storage location is local
   */
  isLocalStorage(): boolean {
    return useSettingsStore.getState().storageLocation === "local"
  }
} 