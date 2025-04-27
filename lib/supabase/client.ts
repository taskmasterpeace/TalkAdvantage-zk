"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "./database.types"

// Create a single instance of the Supabase client to be used across the client-side application
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Singleton pattern to avoid creating multiple instances
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>>

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}
