import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getSupabaseClient } from "@/lib/supabase/client"

// Define the Recording type
export interface Recording {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  createdAt: string
  isProcessed: boolean
  storagePath: string | null
  isPublic: boolean
  userId: string
  transcriptId?: string
}

// Define filter options
export type RecordingFilterOptions = {
  searchQuery?: string
  isProcessed?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

// Define the store state
interface RecordingsState {
  // State
  recordings: Recording[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchRecordings: () => Promise<void>
  refreshRecordings: () => Promise<void>
  addRecording: (recording: Recording) => void
  updateRecording: (id: string, updates: Partial<Recording>) => void
  deleteRecording: (id: string) => Promise<void>

  // Selectors
  getRecordingById: (id: string) => Recording | undefined
  getFilteredRecordings: (options: RecordingFilterOptions) => Recording[]
}

// Create the recordings store
export const useRecordingsStore = create<RecordingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      recordings: [],
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      fetchRecordings: async () => {
        // Skip if we've fetched recently (within 5 minutes)
        const now = Date.now()
        const lastFetched = get().lastFetched
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) {
          return
        }

        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error("User not authenticated")
          }

          const { data, error } = await supabase
            .from("recordings")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          if (error) throw error

          const formattedRecordings = data.map(
            (recording): Recording => ({
              id: recording.id,
              name: recording.name,
              description: recording.description,
              durationSeconds: recording.duration_seconds,
              createdAt: recording.created_at,
              isProcessed: recording.is_processed,
              storagePath: recording.storage_path,
              isPublic: recording.is_public,
              userId: recording.user_id,
              transcriptId: recording.transcript_id,
            }),
          )

          set({
            recordings: formattedRecordings,
            lastFetched: Date.now(),
          })
        } catch (error) {
          console.error("Error fetching recordings:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to fetch recordings",
          })
        } finally {
          set({ isLoading: false })
        }
      },

      refreshRecordings: async () => {
        // Force refresh by clearing lastFetched
        set({ lastFetched: null })
        return get().fetchRecordings()
      },

      addRecording: (recording) =>
        set((state) => ({
          recordings: [recording, ...state.recordings],
        })),

      updateRecording: (id, updates) =>
        set((state) => ({
          recordings: state.recordings.map((recording) =>
            recording.id === id ? { ...recording, ...updates } : recording,
          ),
        })),

      deleteRecording: async (id) => {
        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()

          // Delete from database
          const { error } = await supabase.from("recordings").delete().eq("id", id)

          if (error) throw error

          // Update local state
          set((state) => ({
            recordings: state.recordings.filter((recording) => recording.id !== id),
          }))
        } catch (error) {
          console.error("Error deleting recording:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to delete recording",
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Selectors
      getRecordingById: (id) => {
        return get().recordings.find((recording) => recording.id === id)
      },

      getFilteredRecordings: (options) => {
        const { searchQuery, isProcessed, dateRange } = options
        return get().recordings.filter((recording) => {
          // Filter by search query
          if (searchQuery && !recording.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
          }

          // Filter by processed status
          if (isProcessed !== undefined && recording.isProcessed !== isProcessed) {
            return false
          }

          // Filter by date range
          if (dateRange) {
            const recordingDate = new Date(recording.createdAt)
            if (recordingDate < dateRange.start || recordingDate > dateRange.end) {
              return false
            }
          }

          return true
        })
      },
    }),
    {
      name: "talkadvantage-recordings",
      partialize: (state) => ({
        // Only persist the recordings array, not loading states or errors
        recordings: state.recordings,
      }),
    },
  ),
)
