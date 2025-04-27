"use client"

import { useToast } from "@/hooks/use-toast"

export enum ErrorType {
  RECORDING = "recording",
  TRANSCRIPTION = "transcription",
  AI_ANALYSIS = "ai_analysis",
  TEMPLATE = "template",
  SESSION = "session",
  STORAGE = "storage",
  NETWORK = "network",
}

export interface ErrorOptions {
  retry?: () => Promise<void>
  fallback?: () => void
  silent?: boolean
  details?: string
}

export const useErrorHandler = () => {
  const { toast } = useToast()

  const handleError = (type: ErrorType, error: Error | string, options?: ErrorOptions) => {
    const errorMessage = typeof error === "string" ? error : error.message

    console.error(`${type} error:`, error)

    if (options?.silent) return

    // Default error messages by type
    const errorMessages = {
      [ErrorType.RECORDING]: "Failed to access microphone. Please check permissions.",
      [ErrorType.TRANSCRIPTION]: "Transcription service error. Check your connection and API key.",
      [ErrorType.AI_ANALYSIS]: "AI analysis failed. The service may be unavailable.",
      [ErrorType.TEMPLATE]: "Error loading or applying template.",
      [ErrorType.SESSION]: "Session operation failed.",
      [ErrorType.STORAGE]: "Storage operation failed. You may be out of space.",
      [ErrorType.NETWORK]: "Network error. Please check your connection.",
    }

    const message = errorMessage || errorMessages[type]
    const details = options?.details ? `\n${options.details}` : ""

    toast({
      variant: "destructive",
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Error`,
      description: message + details,
      action: options?.retry
        ? {
            label: "Retry",
            onClick: options.retry,
          }
        : undefined,
    })

    // Execute fallback if provided
    if (options?.fallback) {
      options.fallback()
    }
  }

  return { handleError }
}
