"use client"

import { v4 as uuidv4 } from "uuid"

// Database configuration
const DB_NAME = "talkadvantage-local"
const DB_VERSION = 1
const RECORDINGS_STORE = "recordings"

export interface LocalRecording {
  id: string
  userId: string
  name: string
  description?: string | null
  durationSeconds: number
  audioBlob: Blob
  createdAt: string
  isProcessed: boolean
  isPublic: boolean
  transcript?: string | null
  summary?: string | null
}

export interface CreateLocalRecordingParams {
  name: string
  description?: string
  durationSeconds?: number
  isPublic?: boolean
}

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error("Error opening IndexedDB:", event)
      reject(new Error("Could not open IndexedDB database"))
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Create the recordings store if it doesn't exist
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        const store = db.createObjectStore(RECORDINGS_STORE, { keyPath: "id" })
        
        // Create indexes for faster lookup
        store.createIndex("userId", "userId", { unique: false })
        store.createIndex("createdAt", "createdAt", { unique: false })
        
        console.log("Created IndexedDB stores and indexes")
      }
    }
  })
}

/**
 * Convert a Blob to a Data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export const indexedDBService = {
  /**
   * Get all recordings for a user
   */
  async getRecordings(userId: string): Promise<LocalRecording[]> {
    try {
      const db = await initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readonly")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const userIndex = store.index("userId")
        const request = userIndex.getAll(userId)
        
        request.onsuccess = () => {
          resolve(request.result)
        }
        
        request.onerror = (event) => {
          console.error("Error getting recordings:", event)
          reject(new Error("Failed to get recordings from IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in getRecordings:", error)
      throw error
    }
  },
  
  /**
   * Get a recording by ID
   */
  async getRecording(id: string): Promise<LocalRecording | null> {
    try {
      const db = await initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readonly")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const request = store.get(id)
        
        request.onsuccess = () => {
          resolve(request.result || null)
        }
        
        request.onerror = (event) => {
          console.error("Error getting recording:", event)
          reject(new Error("Failed to get recording from IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in getRecording:", error)
      throw error
    }
  },
  
  /**
   * Create a new recording
   */
  async createRecording(
    userId: string, 
    file: File, 
    params: CreateLocalRecordingParams
  ): Promise<LocalRecording> {
    try {
      const db = await initDB()
      
      const recording: LocalRecording = {
        id: uuidv4(),
        userId,
        name: params.name,
        description: params.description || null,
        durationSeconds: params.durationSeconds || 0,
        audioBlob: file,
        createdAt: new Date().toISOString(),
        isProcessed: false,
        isPublic: params.isPublic || false,
      }
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readwrite")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const request = store.add(recording)
        
        request.onsuccess = () => {
          console.log("Recording saved to IndexedDB:", recording.id)
          resolve(recording)
        }
        
        request.onerror = (event) => {
          console.error("Error saving recording:", event)
          reject(new Error("Failed to save recording to IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in createRecording:", error)
      throw error
    }
  },
  
  /**
   * Delete a recording
   */
  async deleteRecording(id: string): Promise<void> {
    try {
      const db = await initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readwrite")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const request = store.delete(id)
        
        request.onsuccess = () => {
          console.log("Recording deleted from IndexedDB:", id)
          resolve()
        }
        
        request.onerror = (event) => {
          console.error("Error deleting recording:", event)
          reject(new Error("Failed to delete recording from IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in deleteRecording:", error)
      throw error
    }
  },
  
  /**
   * Get a URL for a recording's audio (as data URL)
   */
  async getRecordingUrl(id: string): Promise<string> {
    try {
      const recording = await this.getRecording(id)
      
      if (!recording) {
        throw new Error("Recording not found")
      }
      
      return await blobToDataUrl(recording.audioBlob)
    } catch (error) {
      console.error("Error in getRecordingUrl:", error)
      throw error
    }
  },
  
  /**
   * Get the total used storage size in bytes
   */
  async getUsedStorageSize(userId: string): Promise<number> {
    try {
      const recordings = await this.getRecordings(userId)
      
      return recordings.reduce((total, recording) => {
        return total + (recording.audioBlob?.size || 0)
      }, 0)
    } catch (error) {
      console.error("Error in getUsedStorageSize:", error)
      throw error
    }
  },
  
  /**
   * Update a recording with transcript data
   */
  async updateLocalProcessingStatus(id: string, isProcessed: boolean): Promise<LocalRecording | null> {
    try {
      const recording = await this.getRecording(id)
      
      if (!recording) {
        throw new Error("Recording not found")
      }
      
      const updatedRecording = {
        ...recording,
        isProcessed
      }
      
      const db = await initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readwrite")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const request = store.put(updatedRecording)
        
        request.onsuccess = () => {
          console.log("Recording processing status updated in IndexedDB:", id)
          resolve(updatedRecording)
        }
        
        request.onerror = (event) => {
          console.error("Error updating recording processing status:", event)
          reject(new Error("Failed to update recording processing status in IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in updateLocalProcessingStatus:", error)
      throw error
    }
  },
  
  /**
   * Add transcript data to a recording
   */
  async addTranscriptToRecording(
    id: string,
    transcript: string,
    summary: string | null = null
  ): Promise<LocalRecording | null> {
    try {
      const recording = await this.getRecording(id)
      
      if (!recording) {
        throw new Error("Recording not found")
      }
      
      const updatedRecording = {
        ...recording,
        isProcessed: true,
        transcript,
        summary
      }
      
      const db = await initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RECORDINGS_STORE], "readwrite")
        const store = transaction.objectStore(RECORDINGS_STORE)
        const request = store.put(updatedRecording)
        
        request.onsuccess = () => {
          console.log("Recording transcript updated in IndexedDB:", id)
          resolve(updatedRecording)
        }
        
        request.onerror = (event) => {
          console.error("Error updating recording transcript:", event)
          reject(new Error("Failed to update recording transcript in IndexedDB"))
        }
        
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error("Error in addTranscriptToRecording:", error)
      throw error
    }
  }
} 