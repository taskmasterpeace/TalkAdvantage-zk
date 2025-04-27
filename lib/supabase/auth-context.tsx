"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { authService, type UserProfile } from "./auth-service"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true)
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)

        if (currentUser) {
          const userProfile = await authService.getUserProfile(currentUser.id)
          setProfile(userProfile)
        }
      } catch (error) {
        console.error("Error loading user:", error)
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to load user information.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [toast])

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const user = await authService.signIn(email, password)
      setUser(user)

      if (user) {
        const userProfile = await authService.getUserProfile(user.id)
        setProfile(userProfile)
      }

      toast({
        title: "Signed In",
        description: "You have successfully signed in.",
      })
    } catch (error) {
      console.error("Error signing in:", error)
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: "Invalid email or password.",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setIsLoading(true)
      const user = await authService.signUp(email, password, displayName)
      setUser(user)

      toast({
        title: "Account Created",
        description: "Your account has been created successfully.",
      })
    } catch (error) {
      console.error("Error signing up:", error)
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Failed to create account. Please try again.",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      await authService.signOut()
      setUser(null)
      setProfile(null)

      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      })
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: "Failed to sign out. Please try again.",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email)

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a password reset link.",
      })
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: "Failed to send password reset email. Please try again.",
      })
      throw error
    }
  }

  const updateProfile = async (displayName: string, avatarUrl?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be signed in to update your profile.",
      })
      return
    }

    try {
      const updatedProfile = await authService.updateUserProfile(user.id, displayName, avatarUrl)
      setProfile(updatedProfile)

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        variant: "destructive",
        title: "Profile Update Failed",
        description: "Failed to update profile. Please try again.",
      })
      throw error
    }
  }

  const value = {
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
