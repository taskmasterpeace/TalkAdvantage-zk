"use client"

import { createClient } from './client'
import type { User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient()
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
    const supabase = createClient()
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

  async signIn(credentials: SignInWithPasswordCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    return { user: data.user, error }
  },

  async signUp(credentials: SignUpWithPasswordCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp(credentials)
    return { user: data.user, error }
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  },
}
