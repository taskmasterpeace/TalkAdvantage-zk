"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Bookmark,
  Edit,
  Copy,
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  RefreshCw,
  X,
  MessageSquare,
  HelpCircle,
  Save,
  Download,
  FileText,
  Loader2,
  Plus,
  Upload,
  DownloadIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import AudioVisualizer from "./audio-visualizer"
import ConversationCompass from "./conversation-compass"
import CuriosityEngine from "./curiosity-engine"
import AIAnalysisPanel from "./ai-analysis-panel"
import { useSettingsStore } from "@/lib/settings-store"
import { useTemplateStore, type AnalyticsProfile } from "@/lib/template-store"
import { useSessionStore, type TranscriptSegment } from "@/lib/session-store"
import { useErrorHandler, ErrorType } from "@/lib/error-handler"
import { ProfileEditorDialog } from "./profile-editor-dialog"
import { AssemblyAI } from "assemblyai"
import { getSupabaseClient } from "@/lib/supabase/client"
import { unifiedRecordingsService } from "@/lib/recordings-service"

// Add a type for the recording state to improve type safety
type RecordingState = "idle" | "recording" | "paused"

// Replace the component function with a more organized version
export default function RecordingTab() {
  const { toast } = useToast()
  const { handleError } = useErrorHandler()
  const settings = useSettingsStore()
  const templateStore = useTemplateStore()
  const sessionStore = useSessionStore()

  // Core recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  // Session data
  const [sessionName, setSessionName] = useState(() => {
    // Retrieve session name from local storage or use default
    const savedSessionName = localStorage.getItem('lastSessionName');
    return savedSessionName || "TalkAdvantage Session";
  })
  const [isEditingName, setIsEditingName] = useState(false)
  const [liveText, setLiveText] = useState("")
  const [editMode, setEditMode] = useState(false)

  // Analysis settings
  const [analysisInterval, setAnalysisInterval] = useState("manual")
  const [nextAnalysisTime, setNextAnalysisTime] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [silenceStartTime, setSilenceStartTime] = useState<number | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Recording and transcription
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const transcriberRef = useRef<ReturnType<AssemblyAI["realtime"]["transcriber"]> | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Helper to convert Float32 samples to 16-bit PCM
  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return output
  }

  // Helper to convert ArrayBuffer to Base64 string
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ""
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<
    Array<{
      time: number
      name: string
      note?: string
    }>
  >([])

  // Profile Editor State
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
  const [isCreatingNewProfile, setIsCreatingNewProfile] = useState(false)

  // Import/Export file input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived state helpers
  const isRecording = recordingState === "recording"
  const isPaused = recordingState === "paused"
  const hasContent = liveText.length > 0

  // Initialize template store
  useEffect(() => {
    templateStore.loadDefaultTemplates()
  }, [])

  // Helper to format time in human readable format
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
  }

  // Helper to generate unique session name
  const generateUniqueSessionName = useCallback((baseName: string) => {
    // Check localStorage for existing sessions from the same day
    const today = new Date().toLocaleDateString();
    const existingSessions: { name: string, date: string }[] = [];
    
    // Parse each localStorage item that might be a saved session
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('session_')) {
        try {
          const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
          if (sessionData.date && sessionData.name) {
            existingSessions.push({
              name: sessionData.name,
              date: sessionData.date
            });
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }
    
    // Filter sessions from today with the same base name
    const sameNameSessions = existingSessions.filter(session => 
      session.date === today && session.name.startsWith(baseName)
    );
    
    // If no duplicate, return the original name
    if (sameNameSessions.length === 0) {
      return baseName;
    }
    
    // Find the highest number in parentheses
    let highestNum = 0;
    sameNameSessions.forEach(session => {
      // Check if the name ends with a pattern like "(2)"
      const match = session.name.match(/\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) highestNum = num;
      }
    });
    
    // Return the base name with next number
    return `${baseName} (${highestNum + 1})`;
  }, []);

  // Reset the analysis timer based on the selected interval
  const resetAnalysisTimer = useCallback(() => {
    if (analysisInterval.startsWith("time-")) {
      const seconds = Number.parseInt(analysisInterval.split("-")[1])
      setNextAnalysisTime(seconds)
    } else {
      setNextAnalysisTime(0)
    }
  }, [analysisInterval])

  // Initialize AssemblyAI transcription
  const initializeTranscription = useCallback(async () => {
    try {
      setIsConnecting(true)

      // Get token from your API endpoint
      const response = await fetch("/api/assemblyai/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || "Failed to get token")
      }

      const { token } = await response.json()
      if (!token) {
        throw new Error("Temporary token missing from response")
      }

      // Create the AssemblyAI client using the SDK
      const client = new AssemblyAI({ apiKey: token })

      // Create a real-time transcriber with the correct sample rate
      const transcriber = client.realtime.transcriber({
        sampleRate: 16000,
        token,
      })

      // Set up transcriber event handlers
      transcriber.on("open", (data: any) => {
        const { sessionId } = data
        console.log(`AssemblyAI session opened with ID: ${sessionId}`)
        setIsTranscribing(true)
        setIsConnecting(false)

        toast({
          title: "Transcription Connected",
          description: "Real-time transcription is now active.",
        })
      })

      transcriber.on("transcript", (transcript: any) => {
        if (!transcript.text || transcript.message_type !== "FinalTranscript") return
        console.log(`AssemblyAI FinalTranscript:`, transcript.text)
        // Append final transcript segment to live text
        setLiveText((prev) => `${prev}${prev ? " " : ""}${transcript.text}`)
        // Update word count
        const words = transcript.text.split(/\s+/).length
        setWordCount(words)
        // Store segment in session
        sessionStore.addTranscriptSegment(transcript.text)
      })

      transcriber.on("error", (error: any) => {
        console.error("AssemblyAI transcriber error:", error)
        handleError(ErrorType.TRANSCRIPTION, error.message || "Transcription error", {
          details: "Error from transcription service",
        })
      })

      transcriber.on("close", (code: number, reason: string) => {
        console.log(`AssemblyAI session closed: ${code} ${reason}`)
        setIsTranscribing(false)
      })

      // Connect to the service
      console.log("Connecting to AssemblyAI real-time service...")
      await transcriber.connect()

      // Save references
      transcriberRef.current = transcriber
    } catch (error) {
      console.error("Error initializing transcription:", error)
      setIsConnecting(false)
      handleError(ErrorType.TRANSCRIPTION, error instanceof Error ? error.message : "Unknown error", {
        details: "Could not initialize transcription",
      })
    }
  }, [handleError, toast, setIsConnecting, setIsTranscribing, setLiveText, setWordCount, sessionStore])

  // Recording control functions
  const startRecording = useCallback(async () => {
    console.log("startRecording function called") // Log start of function
    let currentStep = "Checking mediaDevices support"
    try {
      currentStep = "Checking mediaDevices support"
      console.log(`[1/9] ${currentStep}`)
      // Detailed debug information
      console.log("navigator defined:", typeof navigator !== "undefined")
      console.log("navigator.mediaDevices:", navigator?.mediaDevices ? "exists" : "does not exist")
      console.log("navigator.mediaDevices.getUserMedia:", typeof navigator?.mediaDevices?.getUserMedia === "function" ? "exists" : "does not exist")

      // More graceful detection that works around some browser quirks
      if (typeof navigator === "undefined") {
        console.error("Navigator is undefined - not in a browser environment")
        toast({
          variant: "destructive",
          title: "Unsupported Browser",
          description: "Your browser environment does not support recording.",
        })
        return
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Microphone API not available. Please check:")
        console.error("• Browser permissions (look for camera/mic icon in address bar)")
        console.error("• Privacy extensions or settings blocking media access")
        console.error("• Try a different browser (Chrome or Edge recommended)")

        toast({
          variant: "destructive",
          title: "Microphone Access API Unavailable",
          description: "Please check browser permissions and try again. Look for camera/mic icon in your address bar.",
        })
        return
      }
      currentStep = "Starting new session"
      console.log(`[2/9] ${currentStep}`)
      
      // Generate a unique session name to avoid duplicates
      const uniqueSessionName = generateUniqueSessionName(sessionName);
      if (uniqueSessionName !== sessionName) {
        setSessionName(uniqueSessionName);
        localStorage.setItem('lastSessionName', uniqueSessionName);
        toast({
          title: "Session Name Updated",
          description: `Using unique name "${uniqueSessionName}" to avoid duplicates`,
        });
      }
      
      // Create a new session
      const activeTemplate = templateStore.activeTemplate
      sessionStore.startNewSession(uniqueSessionName, activeTemplate)

      // Save session details for future reference
      const today = new Date().toLocaleDateString();
      localStorage.setItem(`session_${Date.now()}`, JSON.stringify({
        name: uniqueSessionName,
        date: today
      }));

      currentStep = "Requesting microphone access"
      console.log(`[3/9] ${currentStep}`)
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      currentStep = "Microphone access granted"
      console.log(`[4/9] ${currentStep}`)
      audioStreamRef.current = stream

      currentStep = "Creating MediaRecorder"
      console.log(`[5/9] ${currentStep}`)
      const recorder = new MediaRecorder(stream)

      currentStep = "Setting up MediaRecorder event handlers"
      console.log(`[6/9] ${currentStep}`)
      // Set up event handlers
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Store chunk for session recording; transcription is handled via Web Audio pipeline
          setAudioChunks((prev) => [...prev, e.data])
        }
      }

      currentStep = "Starting MediaRecorder"
      console.log(`[7/9] ${currentStep}`)
      // Start recording
      recorder.start(500)
      currentStep = "Updating component state (pre-async)"
      console.log(`[8/9] ${currentStep}`)
      setMediaRecorder(recorder)
      setRecordingTime(0)
      setLiveText("")
      setWordCount(0)
      setSilenceStartTime(null)
      resetAnalysisTimer()
      setAudioChunks([])

      currentStep = "Initializing AssemblyAI transcription"
      console.log(`[9/9] ${currentStep}`)
      // Initialize AssemblyAI transcription
      await initializeTranscription()

      // Set up Web Audio pipeline using AudioWorklet
      // Explicitly set sample rate to match AssemblyAI expectation
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = audioCtx

      // Load the processor
      try {
        await audioCtx.audioWorklet.addModule("/audio-processor.js")
      } catch (e) {
        console.error("Error loading audio worklet module:", e)
        handleError(
          ErrorType.RECORDING,
          "Failed to load audio processor. Please refresh the page."
        )
        // Attempt cleanup before returning
        stream.getTracks().forEach((track) => track.stop())
        audioStreamRef.current = null
        sessionStore.endCurrentSession() // End session started earlier
        setRecordingState("idle")
        return
      }

      // Create nodes
      const sourceNode = audioCtx.createMediaStreamSource(audioStreamRef.current!)
      audioSourceRef.current = sourceNode
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      audioAnalyzerRef.current = analyser
      const workletNode = new AudioWorkletNode(audioCtx, "audio-processor")
      audioWorkletNodeRef.current = workletNode

      // Handle messages from the worklet (audio data)
      workletNode.port.onmessage = (event) => {
        // event.data is the Float32Array from the processor
        if (transcriberRef.current && !isMuted) {
          // Use the correct helper function name
          const pcmData = floatTo16BitPCM(event.data)
          // Send the audio data to the transcriber
          transcriberRef.current.sendAudio(pcmData.buffer)
        }
      }

      // Connect the nodes: Mic Source -> Analyser -> Worklet -> Destination (optional, for hearing audio)
      sourceNode.connect(analyser)
      sourceNode.connect(workletNode)
      // workletNode.connect(audioCtx.destination) // Uncomment to hear mic input

      toast({
        title: "Recording Started & Transcribing",
        description: "Your session is now being recorded and transcribed.",
      })

      // Set recording state *after* everything is initialized
      setRecordingState("recording")

      console.log("startRecording finished successfully.")
    } catch (error) {
      console.error(`Error during startRecording at step: ${currentStep}`, error)
      handleError(ErrorType.RECORDING, error instanceof Error ? error.message : "Unknown error", {
        details: "Could not access microphone. Please check permissions.",
      })
      // Ensure state is reset on error
      setRecordingState("idle")
      setIsConnecting(false)
      setIsTranscribing(false)
    }
  }, [
    sessionName,
    templateStore.activeTemplate,
    isMuted,
    toast,
    sessionStore,
    resetAnalysisTimer,
    initializeTranscription,
    handleError,
    floatTo16BitPCM,
    generateUniqueSessionName,
  ])

  const pauseRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause()
    }

    setRecordingState("paused")

    toast({
      title: "Recording Paused",
      description: "Your recording has been paused. Press play to continue.",
    })
  }, [mediaRecorder, toast])

  const resumeRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume()
    }

    setRecordingState("recording")

    toast({
      title: "Recording Resumed",
      description: "Your recording has been resumed.",
    })
  }, [mediaRecorder, toast])

  const stopRecording = useCallback(() => {
    if (recordingState === "idle") return

    // Stop media recorder
    if (mediaRecorder) {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
      setMediaRecorder(null)
    }

    // Disconnect and clean up
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (transcriberRef.current) {
      transcriberRef.current.close().catch(console.error)
      transcriberRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }

    // Cleanup Web Audio resources
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.close()
      audioWorkletNodeRef.current.disconnect()
      audioWorkletNodeRef.current = null
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect()
      audioSourceRef.current = null
    }
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.disconnect()
      audioAnalyzerRef.current = null
    }

    // Create audio blob and save to session
    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
      sessionStore.setAudioBlob(audioBlob)
      
      // Upload the recording to either local or cloud storage based on settings
      if (audioBlob.size > 0) {
        (async () => {
          try {
            const supabase = getSupabaseClient()
            
            // Get current user
            const {
              data: { user },
            } = await supabase.auth.getUser()
            
            if (!user) {
              toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "You must be logged in to save recordings",
              })
              return
            }
            
            // Create a file object from the blob
            const file = new File([audioBlob], `${sessionName.replace(/\s+/g, "-").toLowerCase()}.webm`, { 
              type: "audio/webm"
            })
            
            // Use our unified recording service which handles both local and cloud storage
            const recording = await unifiedRecordingsService.createRecording(user.id, file, {
              name: sessionName,
              description: sessionName,
              durationSeconds: recordingTime,
              isPublic: false,
            })
            
            const isLocal = unifiedRecordingsService.isLocalStorage()
            
            toast({
              title: isLocal 
                ? "Recording Saved Locally" 
                : "Recording Saved to Cloud",
              description: isLocal
                ? "Your recording has been saved to your local device in privacy mode."
                : "Your recording has been uploaded and saved to your account.",
            })
            
          } catch (error) {
            console.error("Error saving recording:", error)
            toast({
              variant: "destructive",
              title: "Save Failed",
              description: error instanceof Error ? error.message : "Failed to save recording",
            })
          }
        })()
      }
    }

    // End current session
    sessionStore.endCurrentSession()

    setRecordingState("idle")
    setIsTranscribing(false)

    toast({
      title: "Recording Stopped",
      description: "Your recording has been stopped and saved.",
    })
  }, [
    recordingState,
    mediaRecorder,
    audioChunks,
    sessionStore,
    sessionName,
    recordingTime,
    toast,
    handleError,
  ])

  const triggerManualAnalysis = useCallback(() => {
    if (!isRecording && !hasContent) return

    toast({
      title: "Analysis Triggered",
      description: "Processing your conversation...",
    })

    // Get the active template
    const activeTemplateName = templateStore.activeTemplate
    const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

    if (!activeTemplate) {
      toast({
        variant: "destructive",
        title: "Template Error",
        description: "No active template found for analysis.",
      })
      return
    }

    // Use the template for analysis
    const transcriptText = sessionStore.getFullTranscriptText() || liveText

    if (!transcriptText) {
      toast({
        variant: "destructive",
        title: "No Content",
        description: "There is no transcript to analyze.",
      })
      return
    }

    // Simulate analysis processing with the template
    setIsAnalyzing(true)

    // In a real implementation, this would call the API with the template
    setTimeout(() => {
      setIsAnalyzing(false)
      toast({
        title: "Analysis Complete",
        description: `Your conversation has been analyzed using the "${activeTemplate.name}" template.`,
      })
      resetAnalysisTimer()

      // Update session with analysis results
      sessionStore.updateAnalysisResults({
        template_used: activeTemplate.name,
        analysis_timestamp: new Date().toISOString(),
      })
    }, 1500)
  }, [isRecording, hasContent, templateStore, sessionStore, liveText, toast, resetAnalysisTimer])

  const updateAnalysisTimer = useCallback(() => {
    if (!isRecording) return

    if (analysisInterval.startsWith("time-")) {
      const seconds = Number.parseInt(analysisInterval.split("-")[1])
      if (nextAnalysisTime <= 0) {
        triggerManualAnalysis()
        setNextAnalysisTime(seconds)
      } else {
        setNextAnalysisTime((prev) => prev - 1)
      }
    }
  }, [isRecording, analysisInterval, nextAnalysisTime, triggerManualAnalysis])

  // Session management functions
  const saveSession = useCallback(() => {
    if (!hasContent && recordingState === "idle") {
      toast({
        variant: "destructive",
        title: "Nothing to Save",
        description: "Start recording or create content before saving.",
      })
      return
    }

    // If recording is in progress, stop it first
    if (recordingState !== "idle") {
      stopRecording()
    }

    // Make sure session name is applied if needed
    const currentSession = sessionStore.currentSession;
    if (currentSession && currentSession.session_info.name !== sessionName) {
      sessionStore.updateSessionName(sessionName);
    }
    
    // Store in localStorage for future sessions
    localStorage.setItem('lastSessionName', sessionName);

    // Save the session
    sessionStore.saveSession()

    toast({
      title: "Session Saved",
      description: `"${sessionName}" has been saved successfully.`,
    })
  }, [hasContent, recordingState, sessionName, sessionStore, stopRecording, toast])

  const newSession = useCallback(() => {
    if (recordingState !== "idle") {
      toast({
        variant: "destructive",
        title: "Recording in Progress",
        description: "Please stop recording before starting a new session.",
      })
      return
    }

    // Generate a unique base session name
    const defaultName = "TalkAdvantage Session";
    const uniqueName = generateUniqueSessionName(defaultName);
    
    setSessionName(uniqueName)
    setRecordingTime(0)
    setLiveText("")
    setWordCount(0)
    setBookmarks([])
    
    // Store in localStorage
    localStorage.setItem('lastSessionName', uniqueName);

    toast({
      title: "New Session Created",
      description: "Ready to start recording.",
    })
  }, [recordingState, toast, generateUniqueSessionName])

  const saveTranscript = useCallback(() => {
    if (!liveText) {
      toast({
        variant: "destructive",
        title: "No Transcript",
        description: "There is no transcript to save.",
      })
      return
    }

    // In a real implementation, this would save to a file or database
    const blob = new Blob([liveText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sessionName.replace(/\s+/g, "-").toLowerCase()}-transcript.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Transcript Saved",
      description: "Your transcript has been downloaded.",
    })
  }, [liveText, sessionName, toast])

  const copyToClipboard = useCallback(() => {
    if (!liveText) {
      toast({
        variant: "destructive",
        title: "Nothing to Copy",
        description: "There is no text to copy to clipboard.",
      })
      return
    }

    navigator.clipboard.writeText(liveText).then(
      () => {
        toast({
          title: "Copied to Clipboard",
          description: "Transcript text has been copied to clipboard.",
        })
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy text to clipboard.",
        })
      },
    )
  }, [liveText, toast])

  const addBookmark = useCallback(
    (named = false) => {
      if (!isRecording) {
        toast({
          variant: "destructive",
          title: "Not Recording",
          description: "You can only add bookmarks while recording.",
        })
        return
      }

      const bookmarkName = named ? `Bookmark at ${formatTime(recordingTime)}` : undefined

      // Add to local state
      const newBookmark = {
        time: recordingTime,
        name: bookmarkName || "Quick Bookmark",
        note: "",
      }
      setBookmarks((prev) => [...prev, newBookmark])

      // Add to session store
      sessionStore.addBookmark({
        time_ms: recordingTime * 1000,
        type: "marker",
        name: bookmarkName || "Quick Bookmark",
        note: "",
      })

      toast({
        title: "Bookmark Added",
        description: bookmarkName || `Bookmark added at ${formatTime(recordingTime)}`,
      })
    },
    [isRecording, recordingTime, sessionStore, toast],
  )

  // Profile import/export functions
  const exportProfiles = () => {
    try {
      const profiles = templateStore.templates.filter((p) => !p.name.startsWith("*"))
      if (profiles.length === 0) {
        toast({
          variant: "destructive",
          title: "No Custom Profiles",
          description: "You don't have any custom profiles to export.",
        })
        return
      }

      const dataStr = JSON.stringify(profiles, null, 2)
      const blob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "talkadvantage-profiles.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Profiles Exported",
        description: `Exported ${profiles.length} custom profiles.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  const importProfiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const profiles = JSON.parse(content) as AnalyticsProfile[]

          if (!Array.isArray(profiles)) {
            throw new Error("Invalid profile format")
          }

          let importCount = 0
          profiles.forEach((profile) => {
            // Make sure we don't overwrite built-in profiles
            if (!profile.name.startsWith("*")) {
              // Check if profile with this name already exists
              const existingProfile = templateStore.templates.find((p) => p.name === profile.name)
              if (existingProfile) {
                // Add a suffix to avoid name conflicts
                profile.name = `${profile.name} (Imported)`
              }

              templateStore.addTemplate(profile)
              importCount++
            }
          })

          toast({
            title: "Profiles Imported",
            description: `Successfully imported ${importCount} profiles.`,
          })
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: "The selected file contains invalid profile data.",
          })
        }
      }

      reader.readAsText(file)

      // Reset the input
      e.target.value = ""
    }
  }

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
        updateAnalysisTimer()
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRecording, updateAnalysisTimer])

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 for manual analysis
      if (e.key === "F12" && isRecording && analysisInterval === "manual") {
        e.preventDefault()
        triggerManualAnalysis()
      }

      // F8 for quick bookmark
      if (e.key === "F8" && isRecording) {
        e.preventDefault()
        addBookmark(false)
      }

      // F9 for named bookmark
      if (e.key === "F9" && isRecording) {
        e.preventDefault()
        addBookmark(true)
      }

      // Space to toggle recording (when not in an input field)
      if (e.key === " " && e.target === document.body) {
        e.preventDefault()
        if (recordingState === "idle") {
          startRecording()
        } else if (recordingState === "recording") {
          pauseRecording()
        } else if (recordingState === "paused") {
          resumeRecording()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isRecording,
    analysisInterval,
    triggerManualAnalysis,
    addBookmark,
    recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
  ])

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up on component unmount
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (transcriberRef.current) {
        transcriberRef.current.close().catch(console.error)
      }

      // Cleanup Web Audio resources
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.port.close()
        audioWorkletNodeRef.current.disconnect()
        audioWorkletNodeRef.current = null
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect()
        audioSourceRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Session Name Field */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1 flex items-center gap-1">
              <Mic className="h-3 w-3" /> Session Name
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={sessionName}
                onChange={(e) => {
                  setSessionName(e.target.value);
                  // Save to localStorage but don't update the session store until blur
                  localStorage.setItem('lastSessionName', e.target.value);
                }}
                className="text-xl font-semibold py-6 pl-4 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                placeholder="Session Name"
                onFocus={() => setIsEditingName(true)}
                onBlur={() => {
                  setIsEditingName(false);
                  // Update the current session name when input is blurred
                  const currentSession = sessionStore.currentSession;
                  if (currentSession && currentSession.session_info.name !== sessionName) {
                    sessionStore.updateSessionName(sessionName);
                    toast({
                      title: "Session Name Updated",
                      description: `Session renamed to "${sessionName}"`,
                    });
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const input = document.querySelector("input") as HTMLInputElement
                  input.focus()
                }}
                aria-label="Edit session name"
                className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              >
                <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveSession}>
              <Save className="h-4 w-4 mr-2" />
              Save Session
            </Button>
            <Button variant="outline" size="sm" onClick={newSession}>
              <RefreshCw className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recording Controls Panel */}
          <Card className="p-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Record/Pause button */}
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    size="icon"
                    onClick={() => {
                      console.log("Start Recording button clicked") // Log button click
                      if (recordingState === "idle") {
                        startRecording()
                      } else if (recordingState === "recording") {
                        pauseRecording()
                      } else if (recordingState === "paused") {
                        resumeRecording()
                      }
                    }}
                    className="h-10 w-10 rounded-full"
                    aria-label={isRecording ? "Pause recording" : "Start recording"}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isRecording ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Stop button */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={recordingState === "idle" || isConnecting}
                    onClick={stopRecording}
                    className="h-10 w-10 rounded-full"
                    aria-label="Stop recording"
                  >
                    <Square className="h-5 w-5" />
                  </Button>

                  {/* Mute button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`h-10 w-10 rounded-full ${isMuted ? "bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400" : ""}`}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    disabled={recordingState === "idle" || isConnecting}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                </div>

                {/* Recording timer */}
                <div className="text-xl font-mono">{formatTime(recordingTime)}</div>

                {/* Analysis timer */}
                <div className="flex flex-col items-end">
                  <div className="text-sm text-muted-foreground">Next analysis in:</div>
                  <div className="text-md font-mono">{formatTime(nextAnalysisTime)}</div>
                </div>

                <div className="w-24 h-10">
                  <AudioVisualizer isActive={isRecording && !isMuted} />
                </div>
              </div>

              {/* Analysis interval settings */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="analysis-interval" className="text-sm">
                    Analysis interval:
                  </Label>
                  <Select value={analysisInterval} onValueChange={setAnalysisInterval}>
                    <SelectTrigger id="analysis-interval" className="w-[180px] h-8">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (F12)</SelectItem>
                      <SelectGroup>
                        <SelectLabel>Silence</SelectLabel>
                        <SelectItem value="silence-5">5 seconds silence</SelectItem>
                        <SelectItem value="silence-15">15 seconds silence</SelectItem>
                        <SelectItem value="silence-30">30 seconds silence</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Word Count</SelectLabel>
                        <SelectItem value="words-10">10 words</SelectItem>
                        <SelectItem value="words-50">50 words</SelectItem>
                        <SelectItem value="words-100">100 words</SelectItem>
                        <SelectItem value="words-200">200 words</SelectItem>
                        <SelectItem value="words-500">500 words</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Time</SelectLabel>
                        <SelectItem value="time-10">10 seconds</SelectItem>
                        <SelectItem value="time-45">45 seconds</SelectItem>
                        <SelectItem value="time-300">5 minutes</SelectItem>
                        <SelectItem value="time-600">10 minutes</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isRecording || analysisInterval !== "manual" || isConnecting}
                    onClick={triggerManualAnalysis}
                  >
                    Analyze Now (F12)
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Analysis Tools Panel */}
          <Card className="p-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-medium">Analytics Profile:</Label>
                    <div className="text-xs text-muted-foreground ml-auto">
                      {templateStore.templates.find((t) => t.name === templateStore.activeTemplate)?.description ||
                        "Select a profile"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={templateStore.activeTemplate} onValueChange={templateStore.setActiveTemplate}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Analytics Profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Built-in Profiles</SelectLabel>
                          {templateStore.templates
                            .filter((template) => template.name.startsWith("*"))
                            .map((template) => (
                              <SelectItem key={template.name} value={template.name}>
                                {template.name.substring(1)}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Custom Profiles</SelectLabel>
                          {templateStore.templates
                            .filter((template) => !template.name.startsWith("*"))
                            .map((template) => (
                              <SelectItem key={template.name} value={template.name}>
                                {template.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const activeTemplate = templateStore.templates.find(
                          (t) => t.name === templateStore.activeTemplate,
                        )

                        if (!activeTemplate) {
                          toast({
                            variant: "destructive",
                            title: "Profile Error",
                            description: "Could not find the selected analytics profile.",
                          })
                          return
                        }

                        // Open the ProfileEditorDialog
                        setIsProfileEditorOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const currentTemplate = templateStore.templates.find(
                          (t) => t.name === templateStore.activeTemplate,
                        )

                        if (!currentTemplate) {
                          toast({
                            variant: "destructive",
                            title: "Profile Error",
                            description: "Could not find the selected analytics profile.",
                          })
                          return
                        }

                        // Create a duplicate of the current profile
                        const newTemplate = {
                          ...currentTemplate,
                          name: `Copy of ${currentTemplate.name.startsWith("*") ? currentTemplate.name.substring(1) : currentTemplate.name}`,
                          description: `Custom copy of ${currentTemplate.description}`,
                        }

                        templateStore.addTemplate(newTemplate)
                        templateStore.setActiveTemplate(newTemplate.name)

                        toast({
                          title: "Profile Duplicated",
                          description: `Created new analytics profile "${newTemplate.name}"`,
                        })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setIsCreatingNewProfile(true)
                        setIsProfileEditorOpen(true)
                      }}
                      title="Create new profile"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" onClick={importProfiles} title="Import profiles">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={exportProfiles} title="Export profiles">
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasContent}
                    onClick={() => {
                      toast({
                        title: "Processing Content",
                        description: "Your content is being processed...",
                      })
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Process
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasContent}
                    onClick={() => {
                      toast({
                        title: "Full Analysis",
                        description: "Running full analysis on your content...",
                      })
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Full Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasContent}
                    onClick={() => {
                      toast({
                        title: "Deep Analysis",
                        description: "Running deep analysis on your content...",
                      })
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Deep Analysis
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toast({
                        title: "Refreshing Analysis",
                        description: "Analysis tools are being refreshed.",
                      })
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toast({
                        title: "Analysis Cleared",
                        description: "All analysis results have been cleared.",
                      })
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: Live Text */}
        <Card className="overflow-hidden">
          <div className="bg-muted p-2 flex items-center justify-between">
            <h3 className="font-medium">Live Text</h3>
            <div className="flex items-center gap-2">
              <Select defaultValue="default">
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyToClipboard}
                disabled={!hasContent}
                aria-label="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={saveTranscript}
                disabled={!hasContent}
                aria-label="Download transcript"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 h-[400px] overflow-y-auto">
            {liveText ? (
              <div className="space-y-4">
                {liveText
                  .split(".")
                  .filter(Boolean)
                  .map((sentence, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground font-mono mt-1">{formatTime(idx * 5)}</span>
                      <p>{sentence.trim()}.</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                {isRecording ? (
                  "Waiting for speech..."
                ) : (
                  <>
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p>Start recording to see transcription</p>
                    <p className="text-sm mt-2">Press the play button or spacebar to begin</p>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Right Panel: Tabbed Interface */}
        <Card className="overflow-hidden">
          <Tabs defaultValue="insights">
            <div className="bg-muted p-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
                <TabsTrigger value="curiosity">Curiosity Engine</TabsTrigger>
                <TabsTrigger value="compass">Conversation Compass</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="insights" className="p-4 h-[400px] overflow-y-auto">
              {hasContent ? (
                <AIAnalysisPanel transcript={liveText} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No insights available yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="curiosity" className="h-[400px] overflow-y-auto">
              <CuriosityEngine hasContent={hasContent} transcript={liveText} />
            </TabsContent>

            <TabsContent value="compass" className="h-[400px] overflow-y-auto">
              <ConversationCompass hasContent={hasContent} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} />
            <Label htmlFor="edit-mode">Edit Mode</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!hasContent} onClick={saveTranscript}>
            <Save className="h-4 w-4 mr-2" />
            Save Transcript
          </Button>
          <Button
            variant="outline"
            disabled={!hasContent}
            onClick={() => {
              toast({
                title: "Analysis Saved",
                description: "Your analysis has been saved successfully.",
              })
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Analysis
          </Button>
        </div>
      </div>

      {/* Bookmark Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Bookmarks</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: "Voice Commands",
                description: "Voice command functionality will be available in a future update.",
              })
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Voice Commands
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" disabled={!isRecording} onClick={() => addBookmark(false)}>
            <Bookmark className="h-4 w-4 mr-2" />
            Quick Bookmark (F8)
          </Button>
          <Button variant="outline" disabled={!isRecording} onClick={() => addBookmark(true)}>
            <Bookmark className="h-4 w-4 mr-2" />
            Named Bookmark (F9)
          </Button>
          <Button variant="outline" disabled={!isRecording} onClick={triggerManualAnalysis}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Full Analysis (F10)
          </Button>
        </div>

        {bookmarks.length > 0 ? (
          <div className="space-y-2">
            {bookmarks.map((bookmark, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{bookmark.name}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(bookmark.time)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBookmarks(bookmarks.filter((_, i) => i !== index))
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">No bookmarks yet</div>
        )}
      </Card>
      <ProfileEditorDialog
        open={isProfileEditorOpen}
        onOpenChange={(open) => {
          setIsProfileEditorOpen(open)
          if (!open) setIsCreatingNewProfile(false)
        }}
        profileName={isCreatingNewProfile ? undefined : templateStore.activeTemplate}
        isCreatingNew={isCreatingNewProfile}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            onClick={() => {
              console.log("Start Recording button clicked") // Log button click
              if (recordingState === "idle") {
                startRecording()
              } else if (recordingState === "recording") {
                pauseRecording()
              } else if (recordingState === "paused") {
                resumeRecording()
              }
            }}
            className="h-10 w-10 rounded-full"
            aria-label={isRecording ? "Pause recording" : "Start recording"}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
