"use client"

import { getSupabaseClient } from "./client"
import type { User } from "@supabase/supabase-js"

export interface UserProfile {
  id: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("Error fetching user profile:", error)
      throw error
    }

    return {
      id: data.id,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateUserProfile(userId: string, displayName: string, avatarUrl?: string): Promise<UserProfile> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating user profile:", error)
      throw error
    }

    return {
      id: data.id,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async signIn(email: string, password: string): Promise<User | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Error signing in:", error)
      throw error
    }

    return data.user
  },

  async signUp(email: string, password: string, displayName: string): Promise<User | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    })

    if (error) {
      console.error("Error signing up:", error)
      throw error
    }

    return data.user
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Error signing out:", error)
      throw error
    }
  },

  async resetPassword(email: string): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      console.error("Error resetting password:", error)
      throw error
    }
  },
}
