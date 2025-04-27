import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getSupabaseClient } from "@/lib/supabase/client"

// Define types for analytics data
export interface AnalysisResult {
  id: string
  recordingId: string
  profileId: string
  summary: string
  keyPoints: Array<{ point: string }>
  actionItems: Array<{ item: string; assignee?: string }>
  decisionsMade: Array<{ decision: string }>
  followUpRequired: Array<{ item: string }>
  rawAnalysis: string
  createdAt: string
}

export interface AnalyticsProfile {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  userId: string
  createdAt: string
  settings: Record<string, any>
}

// Define the store state
interface AnalyticsState {
  // State
  profiles: AnalyticsProfile[]
  results: AnalysisResult[]
  activeProfileId: string | null
  isLoading: boolean
  error: string | null

  // Profile actions
  fetchProfiles: () => Promise<void>
  createProfile: (profile: Omit<AnalyticsProfile, "id" | "userId" | "createdAt">) => Promise<AnalyticsProfile>
  updateProfile: (id: string, updates: Partial<AnalyticsProfile>) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  setActiveProfile: (id: string | null) => void

  // Results actions
  fetchResults: (recordingId?: string) => Promise<void>
  getResultsForRecording: (recordingId: string) => AnalysisResult[]
}

// Create the analytics store
export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      profiles: [],
      results: [],
      activeProfileId: null,
      isLoading: false,
      error: null,

      // Profile actions
      fetchProfiles: async () => {
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
            .from("analytics_profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          if (error) throw error

          const formattedProfiles = data.map(
            (profile): AnalyticsProfile => ({
              id: profile.id,
              name: profile.name,
              description: profile.description,
              isDefault: profile.is_default,
              userId: profile.user_id,
              createdAt: profile.created_at,
              settings: profile.settings,
            }),
          )

          set({ profiles: formattedProfiles })

          // Set active profile to default if none is selected
          if (!get().activeProfileId) {
            const defaultProfile = formattedProfiles.find((p) => p.isDefault)
            if (defaultProfile) {
              set({ activeProfileId: defaultProfile.id })
            } else if (formattedProfiles.length > 0) {
              set({ activeProfileId: formattedProfiles[0].id })
            }
          }
        } catch (error) {
          console.error("Error fetching profiles:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to fetch profiles",
          })
        } finally {
          set({ isLoading: false })
        }
      },

      createProfile: async (profileData) => {
        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error("User not authenticated")
          }

          // If this is the first profile or marked as default, ensure it's set as default
          const isFirstProfile = get().profiles.length === 0
          const isDefault = profileData.isDefault || isFirstProfile

          // If setting this as default, update any existing default
          if (isDefault) {
            await supabase
              .from("analytics_profiles")
              .update({ is_default: false })
              .eq("user_id", user.id)
              .eq("is_default", true)
          }

          const { data, error } = await supabase
            .from("analytics_profiles")
            .insert({
              name: profileData.name,
              description: profileData.description,
              is_default: isDefault,
              user_id: user.id,
              settings: profileData.settings || {},
            })
            .select()
            .single()

          if (error) throw error

          const newProfile: AnalyticsProfile = {
            id: data.id,
            name: data.name,
            description: data.description,
            isDefault: data.is_default,
            userId: data.user_id,
            createdAt: data.created_at,
            settings: data.settings,
          }

          set((state) => ({
            profiles: [newProfile, ...state.profiles],
            // Set as active if it's the default or first profile
            activeProfileId: isDefault ? newProfile.id : state.activeProfileId,
          }))

          return newProfile
        } catch (error) {
          console.error("Error creating profile:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to create profile",
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      updateProfile: async (id, updates) => {
        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()

          // If setting this as default, update any existing default
          if (updates.isDefault) {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (user) {
              await supabase
                .from("analytics_profiles")
                .update({ is_default: false })
                .eq("user_id", user.id)
                .eq("is_default", true)
                .neq("id", id)
            }
          }

          // Convert to database field names
          const dbUpdates: Record<string, any> = {}
          if (updates.name !== undefined) dbUpdates.name = updates.name
          if (updates.description !== undefined) dbUpdates.description = updates.description
          if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault
          if (updates.settings !== undefined) dbUpdates.settings = updates.settings

          const { error } = await supabase.from("analytics_profiles").update(dbUpdates).eq("id", id)

          if (error) throw error

          // Update local state
          set((state) => ({
            profiles: state.profiles.map((profile) => (profile.id === id ? { ...profile, ...updates } : profile)),
          }))
        } catch (error) {
          console.error("Error updating profile:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to update profile",
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      deleteProfile: async (id) => {
        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()

          // Check if this is the active profile
          const isActiveProfile = get().activeProfileId === id

          // Check if this is the default profile
          const isDefaultProfile = get().profiles.find((p) => p.id === id)?.isDefault

          // Don't allow deleting the default profile if it's the only one
          if (isDefaultProfile && get().profiles.length === 1) {
            throw new Error("Cannot delete the only profile")
          }

          const { error } = await supabase.from("analytics_profiles").delete().eq("id", id)

          if (error) throw error

          // Update local state
          set((state) => {
            const updatedProfiles = state.profiles.filter((profile) => profile.id !== id)

            // If we deleted the active profile, set a new active profile
            let newActiveProfileId = state.activeProfileId
            if (isActiveProfile) {
              const defaultProfile = updatedProfiles.find((p) => p.isDefault)
              newActiveProfileId = defaultProfile ? defaultProfile.id : updatedProfiles[0]?.id || null
            }

            return {
              profiles: updatedProfiles,
              activeProfileId: newActiveProfileId,
            }
          })
        } catch (error) {
          console.error("Error deleting profile:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to delete profile",
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      setActiveProfile: (id) => {
        set({ activeProfileId: id })
      },

      // Results actions
      fetchResults: async (recordingId) => {
        try {
          set({ isLoading: true, error: null })

          const supabase = getSupabaseClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error("User not authenticated")
          }

          let query = supabase
            .from("analysis_results")
            .select("*, recordings!inner(user_id)")
            .eq("recordings.user_id", user.id)

          // Filter by recording if provided
          if (recordingId) {
            query = query.eq("recording_id", recordingId)
          }

          const { data, error } = await query.order("created_at", { ascending: false })

          if (error) throw error

          const formattedResults = data.map(
            (result): AnalysisResult => ({
              id: result.id,
              recordingId: result.recording_id,
              profileId: result.profile_id,
              summary: result.summary,
              keyPoints: result.key_points,
              actionItems: result.action_items,
              decisionsMade: result.decisions_made,
              followUpRequired: result.follow_up_required,
              rawAnalysis: result.raw_analysis,
              createdAt: result.created_at,
            }),
          )

          set((state) => ({
            // If fetching for a specific recording, replace only those results
            results: recordingId
              ? [...formattedResults, ...state.results.filter((r) => r.recordingId !== recordingId)]
              : formattedResults,
          }))
        } catch (error) {
          console.error("Error fetching analysis results:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to fetch analysis results",
          })
        } finally {
          set({ isLoading: false })
        }
      },

      getResultsForRecording: (recordingId) => {
        return get().results.filter((result) => result.recordingId === recordingId)
      },
    }),
    {
      name: "talkadvantage-analytics",
      partialize: (state) => ({
        // Only persist profiles, active profile ID, and results
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        results: state.results,
      }),
    },
  ),
)
