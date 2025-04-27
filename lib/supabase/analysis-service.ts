"use client"

import { getSupabaseClient } from "./client"
import type { Json } from "./database.types"

export interface AnalysisResult {
  id: string
  recordingId: string
  profileId: string | null
  summary: string | null
  keyPoints: any[] | null
  actionItems: any[] | null
  decisionsMade: any[] | null
  followUpRequired: any[] | null
  rawAnalysis: string | null
  createdAt: string
}

export interface CreateAnalysisResultParams {
  recordingId: string
  profileId?: string
  summary?: string
  keyPoints?: any[]
  actionItems?: any[]
  decisionsMade?: any[]
  followUpRequired?: any[]
  rawAnalysis?: string
}

export const analysisService = {
  async getAnalysisResults(recordingId: string): Promise<AnalysisResult[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("recording_id", recordingId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching analysis results:", error)
      throw error
    }

    return data.map(mapAnalysisFromDb)
  },

  async getLatestAnalysis(recordingId: string): Promise<AnalysisResult | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("recording_id", recordingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("Error fetching latest analysis:", error)
      throw error
    }

    return mapAnalysisFromDb(data)
  },

  async createAnalysisResult(params: CreateAnalysisResultParams): Promise<AnalysisResult> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("analysis_results")
      .insert({
        recording_id: params.recordingId,
        profile_id: params.profileId || null,
        summary: params.summary || null,
        key_points: (params.keyPoints as Json) || null,
        action_items: (params.actionItems as Json) || null,
        decisions_made: (params.decisionsMade as Json) || null,
        follow_up_required: (params.followUpRequired as Json) || null,
        raw_analysis: params.rawAnalysis || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating analysis result:", error)
      throw error
    }

    return mapAnalysisFromDb(data)
  },

  async deleteAnalysisResult(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from("analysis_results").delete().eq("id", id)

    if (error) {
      console.error("Error deleting analysis result:", error)
      throw error
    }
  },
}

// Helper function to map database record to our interface
function mapAnalysisFromDb(data: any): AnalysisResult {
  return {
    id: data.id,
    recordingId: data.recording_id,
    profileId: data.profile_id,
    summary: data.summary,
    keyPoints: data.key_points,
    actionItems: data.action_items,
    decisionsMade: data.decisions_made,
    followUpRequired: data.follow_up_required,
    rawAnalysis: data.raw_analysis,
    createdAt: data.created_at,
  }
}
