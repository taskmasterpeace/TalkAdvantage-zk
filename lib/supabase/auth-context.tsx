"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { User, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import { authService } from './auth-service' // Import updated service
import { createClient } from './client' // Needed for onAuthStateChange

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<void>
  signUp: (credentials: SignUpWithPasswordCredentials & { displayName: string }) => Promise<void>
  signOut: () => Promise<void>
  error: string | null // Add error state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), []) // Memoize client creation

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (e) {
        console.error("Error fetching initial user:", e)
        // Handle error appropriately, maybe set an error state
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
      setError(null) // Clear error on auth state change
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase]) // Depend on supabase client instance

  const signIn = async (credentials: SignInWithPasswordCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const { error: signInError } = await authService.signIn(credentials)
      if (signInError) throw signInError
      // User state will be updated by onAuthStateChange listener
    } catch (e: any) {
      console.error('Sign in error:', e)
      setError(e.message || 'Failed to sign in')
      setIsLoading(false)
      throw e // Re-throw to allow component-level handling
    }
  }

  const signUp = async (credentials: SignUpWithPasswordCredentials & { displayName: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      // Destructure displayName if needed by your signUp implementation
      const { displayName, ...signupCredentials } = credentials
      const { error: signUpError } = await authService.signUp(signupCredentials as SignUpWithPasswordCredentials) // Pass necessary creds
      if (signUpError) throw signUpError
      // Handle post-signup steps if needed (e.g., profile creation with displayName)
      // User state will be updated by onAuthStateChange listener
    } catch (e: any) {
      console.error('Sign up error:', e)
      setError(e.message || 'Failed to sign up')
      setIsLoading(false)
      throw e // Re-throw to allow component-level handling
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { error: signOutError } = await authService.signOut()
      if (signOutError) throw signOutError
      // User state will be updated by onAuthStateChange listener
    } catch (e: any) {
      console.error('Sign out error:', e)
      setError(e.message || 'Failed to sign out')
      // Don't set isLoading to false here if listener handles it
    } finally {
       // Ensure loading stops even if listener doesn't fire (e.g., network error)
       // Might cause flicker if listener also sets it, depends on timing.
       // Consider removing if listener is reliable.
      setIsLoading(false)
    }
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    error,
  }), [user, isLoading, error]) // Dependencies for memoization

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
