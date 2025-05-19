export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recordings: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          duration_seconds: number
          storage_path: string
          created_at: string
          updated_at: string
          is_processed: boolean
          is_public: boolean
          tags: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          duration_seconds?: number
          storage_path: string
          created_at?: string
          updated_at?: string
          is_processed?: boolean
          is_public?: boolean
          tags?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          duration_seconds?: number
          storage_path?: string
          created_at?: string
          updated_at?: string
          is_processed?: boolean
          is_public?: boolean
          tags?: string | null
        }
      }
      transcripts: {
        Row: {
          id: string
          recording_id: string
          full_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recording_id: string
          full_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recording_id?: string
          full_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transcript_segments: {
        Row: {
          id: string
          transcript_id: string
          speaker: string | null
          start_ms: number
          end_ms: number
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          speaker?: string | null
          start_ms: number
          end_ms: number
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          speaker?: string | null
          start_ms?: number
          end_ms?: number
          text?: string
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          recording_id: string
          user_id: string
          time_ms: number
          name: string
          note: string | null
          bookmark_type: string
          created_at: string
        }
        Insert: {
          id?: string
          recording_id: string
          user_id: string
          time_ms: number
          name: string
          note?: string | null
          bookmark_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          recording_id?: string
          user_id?: string
          time_ms?: number
          name?: string
          note?: string | null
          bookmark_type?: string
          created_at?: string
        }
      }
      analytics_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          user_prompt: string | null
          system_prompt: string | null
          template_prompt: string | null
          curiosity_prompt: string | null
          conversation_mode: string
          is_default: boolean
          is_builtin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          user_prompt?: string | null
          system_prompt?: string | null
          template_prompt?: string | null
          curiosity_prompt?: string | null
          conversation_mode?: string
          is_default?: boolean
          is_builtin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          user_prompt?: string | null
          system_prompt?: string | null
          template_prompt?: string | null
          curiosity_prompt?: string | null
          conversation_mode?: string
          is_default?: boolean
          is_builtin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          recording_id: string
          profile_id: string | null
          summary: string | null
          key_points: Json | null
          action_items: Json | null
          decisions_made: Json | null
          follow_up_required: Json | null
          raw_analysis: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recording_id: string
          profile_id?: string | null
          summary?: string | null
          key_points?: Json | null
          action_items?: Json | null
          decisions_made?: Json | null
          follow_up_required?: Json | null
          raw_analysis?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recording_id?: string
          profile_id?: string | null
          summary?: string | null
          key_points?: Json | null
          action_items?: Json | null
          decisions_made?: Json | null
          follow_up_required?: Json | null
          raw_analysis?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
