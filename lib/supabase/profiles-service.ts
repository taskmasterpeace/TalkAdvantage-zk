"use client"

import { getSupabaseClient } from "./client"

export interface AnalyticsProfile {
  id: string
  userId: string
  name: string
  description: string | null
  userPrompt: string | null
  systemPrompt: string | null
  templatePrompt: string | null
  curiosityPrompt: string | null
  conversationMode: string
  isDefault: boolean
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAnalyticsProfileParams {
  name: string
  description?: string
  userPrompt?: string
  systemPrompt?: string
  templatePrompt?: string
  curiosityPrompt?: string
  conversationMode?: string
  isDefault?: boolean
  isBuiltin?: boolean
}

export const analyticsProfilesService = {
  async getProfiles(userId: string): Promise<AnalyticsProfile[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("analytics_profiles")
      .select("*")
      .or(`user_id.eq.${userId},is_builtin.eq.true`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching analytics profiles:", error)
      throw error
    }

    return data.map(mapProfileFromDb)
  },

  async getProfile(id: string): Promise<AnalyticsProfile | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("analytics_profiles").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("Error fetching analytics profile:", error)
      throw error
    }

    return mapProfileFromDb(data)
  },

  async createProfile(userId: string, params: CreateAnalyticsProfileParams): Promise<AnalyticsProfile> {
    const supabase = getSupabaseClient()

    // If this is set as default, unset any existing defaults
    if (params.isDefault) {
      const { error: updateError } = await supabase
        .from("analytics_profiles")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)

      if (updateError) {
        console.error("Error updating existing default profiles:", updateError)
        throw updateError
      }
    }

    const { data, error } = await supabase
      .from("analytics_profiles")
      .insert({
        user_id: userId,
        name: params.name,
        description: params.description || null,
        user_prompt: params.userPrompt || null,
        system_prompt: params.systemPrompt || null,
        template_prompt: params.templatePrompt || null,
        curiosity_prompt: params.curiosityPrompt || null,
        conversation_mode: params.conversationMode || "tracking",
        is_default: params.isDefault || false,
        is_builtin: params.isBuiltin || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating analytics profile:", error)
      throw error
    }

    return mapProfileFromDb(data)
  },

  async updateProfile(id: string, params: Partial<CreateAnalyticsProfileParams>): Promise<AnalyticsProfile> {
    const supabase = getSupabaseClient()

    // Get the profile to check if we're changing the default status
    const { data: existingProfile, error: fetchError } = await supabase
      .from("analytics_profiles")
      .select("user_id, is_default")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching profile for update:", fetchError)
      throw fetchError
    }

    // If we're setting this as default, unset any existing defaults
    if (params.isDefault && !existingProfile.is_default) {
      const { error: updateError } = await supabase
        .from("analytics_profiles")
        .update({ is_default: false })
        .eq("user_id", existingProfile.user_id)
        .eq("is_default", true)

      if (updateError) {
        console.error("Error updating existing default profiles:", updateError)
        throw updateError
      }
    }

    const { data, error } = await supabase
      .from("analytics_profiles")
      .update({
        name: params.name,
        description: params.description,
        user_prompt: params.userPrompt,
        system_prompt: params.systemPrompt,
        template_prompt: params.templatePrompt,
        curiosity_prompt: params.curiosityPrompt,
        conversation_mode: params.conversationMode,
        is_default: params.isDefault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating analytics profile:", error)
      throw error
    }

    return mapProfileFromDb(data)
  },

  async deleteProfile(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    // Don't allow deletion of built-in profiles
    const { data: profile, error: fetchError } = await supabase
      .from("analytics_profiles")
      .select("is_builtin")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching profile for deletion:", fetchError)
      throw fetchError
    }

    if (profile.is_builtin) {
      throw new Error("Cannot delete built-in profiles")
    }

    const { error } = await supabase.from("analytics_profiles").delete().eq("id", id)

    if (error) {
      console.error("Error deleting analytics profile:", error)
      throw error
    }
  },

  async setDefaultProfile(userId: string, profileId: string): Promise<void> {
    const supabase = getSupabaseClient()

    // Unset any existing defaults
    const { error: updateError } = await supabase
      .from("analytics_profiles")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true)

    if (updateError) {
      console.error("Error updating existing default profiles:", updateError)
      throw updateError
    }

    // Set the new default
    const { error } = await supabase.from("analytics_profiles").update({ is_default: true }).eq("id", profileId)

    if (error) {
      console.error("Error setting default profile:", error)
      throw error
    }
  },
}

// Helper function to map database record to our interface
function mapProfileFromDb(data: any): AnalyticsProfile {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    userPrompt: data.user_prompt,
    systemPrompt: data.system_prompt,
    templatePrompt: data.template_prompt,
    curiosityPrompt: data.curiosity_prompt,
    conversationMode: data.conversation_mode,
    isDefault: data.is_default,
    isBuiltin: data.is_builtin,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
