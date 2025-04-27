"use client"

import { getSupabaseClient } from "./client"

export interface Bookmark {
  id: string
  recordingId: string
  userId: string
  timeMs: number
  name: string
  note: string | null
  bookmarkType: string
  createdAt: string
}

export interface CreateBookmarkParams {
  recordingId: string
  timeMs: number
  name: string
  note?: string
  bookmarkType?: string
}

export const bookmarksService = {
  async getBookmarks(recordingId: string): Promise<Bookmark[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("recording_id", recordingId)
      .order("time_ms", { ascending: true })

    if (error) {
      console.error("Error fetching bookmarks:", error)
      throw error
    }

    return data.map(mapBookmarkFromDb)
  },

  async createBookmark(userId: string, params: CreateBookmarkParams): Promise<Bookmark> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        recording_id: params.recordingId,
        user_id: userId,
        time_ms: params.timeMs,
        name: params.name,
        note: params.note || null,
        bookmark_type: params.bookmarkType || "marker",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating bookmark:", error)
      throw error
    }

    return mapBookmarkFromDb(data)
  },

  async updateBookmark(id: string, params: Partial<CreateBookmarkParams>): Promise<Bookmark> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("bookmarks")
      .update({
        time_ms: params.timeMs,
        name: params.name,
        note: params.note,
        bookmark_type: params.bookmarkType,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      throw error
    }

    return mapBookmarkFromDb(data)
  },

  async deleteBookmark(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from("bookmarks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting bookmark:", error)
      throw error
    }
  },
}

// Helper function to map database record to our interface
function mapBookmarkFromDb(data: any): Bookmark {
  return {
    id: data.id,
    recordingId: data.recording_id,
    userId: data.user_id,
    timeMs: data.time_ms,
    name: data.name,
    note: data.note,
    bookmarkType: data.bookmark_type,
    createdAt: data.created_at,
  }
}
