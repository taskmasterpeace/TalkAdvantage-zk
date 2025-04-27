"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

interface FileUploadOptions {
  maxSizeMB?: number
  allowedTypes?: string[]
  storageBucket?: string
  storageFolder?: string
}

interface FileUploadResult {
  filePath: string
  fileUrl: string
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const {
    maxSizeMB = 100,
    allowedTypes = ["audio/"],
    storageBucket = "audio-files",
    storageFolder = "recordings",
  } = options

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]

      // Validate file type
      const isValidType = allowedTypes.some((type) => selectedFile.type.startsWith(type))
      if (!isValidType) {
        setError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`)
        setFile(null)
        return
      }

      // Validate file size
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeMB}MB limit`)
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError(null)
      return selectedFile
    }
    return null
  }

  const uploadFile = async (userId: string): Promise<FileUploadResult | null> => {
    if (!file) {
      setError("No file selected")
      return null
    }

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      const supabase = getSupabaseClient()

      // Create file path
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${storageFolder}/${userId}/${fileName}`

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 300)

      // Upload file
      const { error: uploadError } = await supabase.storage.from(storageBucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      clearInterval(progressInterval)

      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`)
      }

      setProgress(100)

      // Get file URL
      const { data: urlData } = await supabase.storage.from(storageBucket).createSignedUrl(filePath, 3600)

      if (!urlData?.signedUrl) {
        throw new Error("Failed to get file URL")
      }

      return {
        filePath,
        fileUrl: urlData.signedUrl,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const resetFile = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return {
    file,
    setFile,
    fileInputRef,
    uploading,
    progress,
    error,
    handleFileChange,
    uploadFile,
    resetFile,
  }
}
