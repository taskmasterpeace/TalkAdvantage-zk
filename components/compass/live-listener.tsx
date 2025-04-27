"use client"

import { useEffect, useRef, useState } from "react"
import { useTrackingStore } from "@/lib/store/tracking-store"
import { Mic, MicOff, Loader2 } from "lucide-react"

interface LiveListenerProps {
  isActive: boolean
}

export function LiveListener({ isActive }: LiveListenerProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { isTracking, startTracking, stopTracking, addThought } = useTrackingStore()

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastProcessedRef = useRef<string>("")

  // Initialize speech recognition
  useEffect(() => {
    let SpeechRecognition: any = null
    let webkitSpeechRecognition: any = null

    if (typeof window !== "undefined") {
      SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      webkitSpeechRecognition = (window as any).webkitSpeechRecognition || window.SpeechRecognition
    }

    if (typeof window !== "undefined" && (SpeechRecognition || webkitSpeechRecognition)) {
      const SpeechRecognitionImpl = SpeechRecognition || webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognitionImpl()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true

        recognitionRef.current.onstart = () => {
          setIsListening(true)
          setError(null)
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error)
          setError(`Speech recognition error: ${event.error}`)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          // Restart if tracking is still active
          if (isTracking) {
            recognitionRef.current?.start()
          }
        }

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          // Update the transcript state
          setTranscript(finalTranscript || interimTranscript)

          // Process final transcript chunks
          if (finalTranscript && finalTranscript !== lastProcessedRef.current) {
            // Process the thought
            addThought(finalTranscript)
            lastProcessedRef.current = finalTranscript
          }
        }
      }
    } else {
      setError("Speech recognition is not supported in this browser.")
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.onresult = null
      }
    }
  }, [addThought, isTracking])

  // Start/stop listening based on isActive prop
  useEffect(() => {
    if (isActive && !isListening && recognitionRef.current) {
      startTracking()
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting speech recognition:", error)
      }
    } else if (!isActive && isListening && recognitionRef.current) {
      stopTracking()
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }, [isActive, isListening, startTracking, stopTracking])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.error("Error stopping speech recognition:", error)
        }
      }
      stopTracking()
    }
  }, [stopTracking])

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2">
        {isListening ? (
          <div className="flex items-center gap-2 text-primary">
            <Mic className="h-5 w-5 animate-pulse" />
            <span>Listening...</span>
          </div>
        ) : isActive ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Starting listener...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MicOff className="h-5 w-5" />
            <span>Listener inactive</span>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-destructive mb-2">{error}</div>}

      <div className="text-sm text-muted-foreground">
        {transcript ? `"${transcript}"` : "Speak to see your words here..."}
      </div>
    </div>
  )
}
