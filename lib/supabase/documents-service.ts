"use client"

import { getSupabaseClient } from "./client"
import { v4 as uuidv4 } from "uuid"
import { r2Service } from "../cloudflare/r2-service"

export interface Document {
  id: string
  userId: string
  name: string
  description: string | null
  storagePath: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  tags?: string // JSON string of Tag[] - [{id: string, name: string, color: string}]
}

export interface CreateDocumentParams {
  name: string
  description?: string
  isPublic?: boolean
  tags?: string // JSON string of Tag[] - [{id: string, name: string, color: string}]
}

export const documentsService = {
  async getDocuments(userId: string): Promise<Document[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching documents:", error)
      throw error
    }

    return data.map(mapDocumentFromDb)
  },

  async createDocument(userId: string, file: File, params: CreateDocumentParams): Promise<Document> {
    const supabase = getSupabaseClient()

    // Create a FormData object to send the file and parameters
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    formData.append('name', params.name)
    if (params.description) formData.append('description', params.description)
    formData.append('isPublic', (params.isPublic || false).toString())
    if (params.tags) formData.append('tags', params.tags)

    // Upload using our document-specific API route
    const response = await fetch('/api/upload/document', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
    return result.document
  },

  async updateDocument(id: string, params: Partial<CreateDocumentParams>): Promise<Document> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("documents")
      .update({
        name: params.name,
        description: params.description,
        is_public: params.isPublic,
        tags: params.tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating document:", error)
      throw error
    }

    return mapDocumentFromDb(data)
  },

  async deleteDocument(id: string): Promise<void> {
    const supabase = getSupabaseClient()

    // 1. Get the document to get its storage path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching document:", fetchError)
      throw fetchError
    }

    // 2. Delete the file from R2 storage
    if (document.storage_path) {
      await r2Service.deleteFile(document.storage_path)
    }

    // 3. Delete the document record
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting document:", deleteError)
      throw deleteError
    }
  }
}

// Helper function to map database record to our interface
function mapDocumentFromDb(data: any): Document {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    storagePath: data.storage_path,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPublic: data.is_public,
    tags: data.tags
  }
} 