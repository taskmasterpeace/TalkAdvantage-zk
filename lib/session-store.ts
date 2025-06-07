import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface TranscriptSegment {
  speaker: string
  start_ms: number
  end_ms: number
  text: string
}

export interface SessionBookmark {
  time_ms: number
  type: string
  name: string
  note: string
}

export interface SessionInfo {
  id: string
  name: string
  start_time: string
  end_time: string | null
  duration_seconds: number
  template_used: string
}

export interface AnalysisResults {
  summary?: string
  key_points?: string[]
  action_items?: { owner?: string; task: string; due?: string }[]
  decisions_made?: string[]
  follow_up_required?: string[]
  [key: string]: any
}

export interface Session {
  session_info: SessionInfo
  transcript: TranscriptSegment[]
  analysis_results: AnalysisResults
  bookmarks: SessionBookmark[]
  raw_audio_path?: string
  audio_blob?: Blob
}

export interface SessionState {
  currentSession: Session | null
  savedSessions: Session[]

  // Actions
  startNewSession: (name: string, templateName: string) => void
  endCurrentSession: () => void
  addTranscriptSegment: (segment: TranscriptSegment) => void
  addBookmark: (bookmark: SessionBookmark) => void
  updateAnalysisResults: (results: AnalysisResults) => void
  saveSession: () => void
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  setAudioBlob: (blob: Blob) => void
  getFullTranscriptText: () => string
  updateSessionName: (name: string) => void
  updateTranscript: (text: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      savedSessions: [],

      startNewSession: (name, templateName) => {
        const newSession: Session = {
          session_info: {
            id: Date.now().toString(),
            name,
            start_time: new Date().toISOString(),
            end_time: null,
            duration_seconds: 0,
            template_used: templateName,
          },
          transcript: [],
          analysis_results: {},
          bookmarks: [],
        }

        set({ currentSession: newSession })
      },

      endCurrentSession: () => {
        const current = get().currentSession
        if (current) {
          const updatedSession = {
            ...current,
            session_info: {
              ...current.session_info,
              end_time: new Date().toISOString(),
              duration_seconds: Math.floor(
                (new Date().getTime() - new Date(current.session_info.start_time).getTime()) / 1000,
              ),
            },
          }
          set({ currentSession: updatedSession })
        }
      },

      addTranscriptSegment: (segment) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              transcript: [...current.transcript, segment],
            },
          })
        }
      },

      addBookmark: (bookmark) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              bookmarks: [...current.bookmarks, bookmark],
            },
          })
        }
      },

      updateAnalysisResults: (results) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              analysis_results: {
                ...current.analysis_results,
                ...results,
              },
            },
          })
        }
      },

      saveSession: () => {
        const current = get().currentSession
        if (current) {
          // Add to saved sessions
          set((state) => ({
            savedSessions: [
              ...state.savedSessions.filter((s) => s.session_info.id !== current.session_info.id),
              current,
            ],
            currentSession: null,
          }))
        }
      },

      loadSession: (id) => {
        const session = get().savedSessions.find((s) => s.session_info.id === id)
        if (session) {
          set({ currentSession: { ...session } })
        }
      },

      deleteSession: (id) => {
        set((state) => ({
          savedSessions: state.savedSessions.filter((s) => s.session_info.id !== id),
        }))
      },

      setAudioBlob: (blob) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              audio_blob: blob,
            },
          })
        }
      },

      getFullTranscriptText: () => {
        const current = get().currentSession
        if (!current) return ""

        return current.transcript
          .sort((a, b) => a.start_ms - b.start_ms)
          .map((segment) => segment.text)
          .join(" ")
      },

      updateSessionName: (name) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              session_info: {
                ...current.session_info,
                name,
              },
            },
          })
        }
      },

      updateTranscript: (text) => {
        const current = get().currentSession
        if (current) {
          set({
            currentSession: {
              ...current,
              transcript: [
                ...current.transcript,
                {
                  speaker: "",
                  start_ms: 0,
                  end_ms: 0,
                  text,
                },
              ],
            },
          })
        }
      },
    }),
    {
      name: "talkadvantage-sessions",
      partialize: (state) => ({
        savedSessions: state.savedSessions.map((session) => ({
          ...session,
          // Don't persist the audio blob in localStorage
          audio_blob: undefined,
        })),
      }),
    },
  ),
)
