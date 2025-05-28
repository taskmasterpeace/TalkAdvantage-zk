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
  Circle,
  Tag as TagIcon,
  Maximize2,
  Move,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import SilenceAlertDialog from "./silence-alert-dialog"
import DraggableWidget from "./draggable-widget"
import { Tag } from "@/components/ui/tag"
import { useLayoutStore } from "@/lib/layout-store"
import { LayoutManager } from "./layout-manager"
import { WidgetPicker } from "./widget-picker"
import { AnalysisTimer } from "@/components/analysis-timer"

// Add a type for the recording state to improve type safety
type RecordingState = "idle" | "recording" | "paused"

// Add Tag types
interface Tag {
  id: string;
  name: string;
  color: string;
}

// Available tag colors
const TAG_COLORS = [
  { name: 'Red', value: 'red', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { name: 'Green', value: 'green', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
];

interface WidgetPosition {
  x: number;
  y: number;
}

interface WidgetSize {
  width: number;
  height: number;
}

interface LayoutConfig {
  widgetPositions: Record<string, WidgetPosition>;
  widgetSizes: Record<string, WidgetSize>;
}

interface DefaultLayouts {
  [key: string]: LayoutConfig;
}

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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string>("")

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

  // Add saving state
  const [isSaving, setIsSaving] = useState(false)

  // Add tag state
  const [tags, setTags] = useState<Tag[]>([])
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value)

  // Add silence detection state
  const [isSilencePromptOpen, setIsSilencePromptOpen] = useState(false)
  const [silenceAutoStopTimer, setSilenceAutoStopTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastAudioLevel, setLastAudioLevel] = useState(0)

  // Add countdown state
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)

  // Add state to track first-time user experience
  const [showWidgetHint, setShowWidgetHint] = useState(true)

  // Add state for interval toggle
  const [isIntervalEnabled, setIsIntervalEnabled] = useState(false)

  // Function to reset all widgets
  const resetAllWidgets = useCallback(() => {
    // Only reset if drag and drop is enabled
    if (!settings.enableDragDrop) return;
    
    const layoutStore = useLayoutStore.getState();
    const currentLayoutName = layoutStore.activeLayoutName;
    
    // Reset only the current layout by getting the default positions if it's a default layout
    // or by resetting widget positions to organized positions if it's a custom layout
    if (currentLayoutName === "Standard Layout" || currentLayoutName === "Compact View") {
      // Get a fresh copy of the default layout
      const defaultLayouts: DefaultLayouts = {
        "Standard Layout": {
          widgetPositions: {
            "live-text": { x: 20, y: 20 },
            "ai-insights": { x: 380, y: 20 },
            "bookmarks": { x: 380, y: 400 },
            "audio-controls": { x: 740, y: 400 },
            "analysis-settings": { x: 20, y: 400 },
            "tags": { x: 20, y: 740 },
            "conversation-compass-widget": { x: 740, y: 20 },
            "curiosity-engine-widget": { x: 1100, y: 20 }
          },
          widgetSizes: {
            "live-text": { width: 340, height: 360 },
            "ai-insights": { width: 340, height: 360 },
            "bookmarks": { width: 340, height: 320 },
            "audio-controls": { width: 340, height: 320 },
            "analysis-settings": { width: 340, height: 320 },
            "tags": { width: 340, height: 200 },
            "conversation-compass-widget": { width: 340, height: 360 },
            "curiosity-engine-widget": { width: 340, height: 360 }
          }
        },
        "Compact View": {
          widgetPositions: {
            "live-text": { x: 20, y: 20 },
            "ai-insights": { x: 380, y: 20 },
            "bookmarks": { x: 20, y: 400 }
          },
          widgetSizes: {
            "live-text": { width: 340, height: 360 },
            "ai-insights": { width: 340, height: 360 },
            "bookmarks": { width: 340, height: 320 }
          }
        }
      };
      
      // Apply the default positions and sizes
      const defaultLayout = defaultLayouts[currentLayoutName];
      
      // Update the layout with default positions and sizes
      layoutStore.updateLayout(currentLayoutName, {
        widgetPositions: { ...defaultLayout.widgetPositions },
        widgetSizes: { ...defaultLayout.widgetSizes }
      });
    } else {
      // For custom layouts, arrange widgets in a grid
      const currentLayout = layoutStore.layouts[currentLayoutName];
      if (!currentLayout) return;
      
      const visibleWidgets = [...currentLayout.visibleWidgets];
      const newPositions: Record<string, WidgetPosition> = {};
      const newSizes: Record<string, WidgetSize> = {};
      
      // Create a grid layout (3 columns)
      const GRID_COL = 3;
      const WIDGET_WIDTH = 340;
      const WIDGET_HEIGHT = 320;
      const MARGIN = 20;
      
      visibleWidgets.forEach((widgetId, index) => {
        const col = index % GRID_COL;
        const row = Math.floor(index / GRID_COL);
        
        newPositions[widgetId] = {
          x: col * (WIDGET_WIDTH + MARGIN) + MARGIN,
          y: row * (WIDGET_HEIGHT + MARGIN) + MARGIN
        };
        
        newSizes[widgetId] = {
          width: WIDGET_WIDTH,
          height: WIDGET_HEIGHT
        };
      });
      
      // Update the layout with the grid positions
      layoutStore.updateLayout(currentLayoutName, {
        widgetPositions: newPositions,
        widgetSizes: newSizes
      });
    }
    
    // Ensure the Live Text widget is visible after reset
    const liveTextWidgetId = "live-text";
    if (settings.minimizedWidgets.includes(liveTextWidgetId)) {
      settings.toggleMinimizeWidget(liveTextWidgetId);
    }
    
    toast({
      title: "Layout Reset",
      description: `The "${layoutStore.activeLayoutName}" layout has been reset to organized positions.`,
    });
    // Show the widget hint again after reset
    setShowWidgetHint(true);
  }, [settings, toast]);

  // Function to clear analysis results
  const clearAnalysis = useCallback(() => {
    setAnalysisResult("")
    setIsAnalyzing(false)
  }, [])

  // Define processContentRef at the top level of the component
  const processContentRef = useRef<(() => Promise<void>) | null>(null);

  // Move processContent definition before initializeTranscription
  const processContent = useCallback(async () => {
    if (!liveText.trim()) {
      toast({
        variant: "destructive",
        title: "No Content",
        description: "There is no text to analyze.",
      });
      return;
    }

    const activeProfile = templateStore.templates.find(
      (t) => t.name === templateStore.activeTemplate
    );

    if (!activeProfile) {
      toast({
        variant: "destructive",
        title: "Profile Error",
        description: "No active analytics profile found.",
      });
      return;
    }

    try {
      clearAnalysis();
      setIsAnalyzing(true);

      const response = await fetch("/api/requestify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: liveText,
          template: {
            system_prompt: activeProfile.system_prompt,
            user_prompt: activeProfile.user_prompt,
            template_prompt: activeProfile.template_prompt
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process content");
      }

      const data = await response.json();
      
      // Update analysis result state
      setAnalysisResult(data.text);

      // Update session store with analysis results
      sessionStore.updateAnalysisResults({
        text: data.text,
        structured: data.structured || {},
        template_used: activeProfile.name,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Analysis Complete",
        description: `Analysis completed using template: ${activeProfile.name}`,
      });
    } catch (error) {
      console.error('Process content error:', error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: error instanceof Error ? error.message : "An error occurred during processing.",
      });
      clearAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  }, [templateStore.templates, templateStore.activeTemplate, liveText, sessionStore, toast, clearAnalysis]);

  // Update processContentRef whenever processContent changes
  useEffect(() => {
    processContentRef.current = processContent;
  }, [processContent]);

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
  const [selectedProfileName, setSelectedProfileName] = useState<string | undefined>()

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

  // Synchronize between settings store and layout store
  useEffect(() => {
    // This runs once on component mount to ensure layout system is properly initialized
    const layoutStore = useLayoutStore.getState();
    const currentLayout = layoutStore.layouts[layoutStore.activeLayoutName];
    
    // Initialize layout if needed with positions from settings
    if (settings.enableDragDrop && currentLayout) {
      // Save current layout state when positions or sizes change
      const handlePositionChange = () => {
        layoutStore.updateCurrentLayout();
      };
      
      // No need for manual subscription since DraggableWidget already 
      // updates the layout store directly when positions/sizes change
      
      // Set up a periodic save of the current layout
      const saveInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          layoutStore.updateCurrentLayout();
        }
      }, 5000); // Save every 5 seconds when tab is visible
      
      return () => {
        clearInterval(saveInterval);
      };
    }
  }, [settings.enableDragDrop]);

  // Ensure Live Text is always visible
  useEffect(() => {
    if (settings.enableDragDrop) {
      const liveTextWidgetId = "live-text";
      
      // Make sure the widget is not minimized on initial load
      if (settings.minimizedWidgets.includes(liveTextWidgetId)) {
        settings.toggleMinimizeWidget(liveTextWidgetId);
      }
      
      // Ensure it has a good default position if not already set
      if (!settings.widgetPositions[liveTextWidgetId]) {
        settings.setWidgetPosition(liveTextWidgetId, { x: 20, y: 20 });
        settings.setWidgetSize(liveTextWidgetId, { width: 500, height: 400 });
      }
    }
  }, []);  // Run once on component mount

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
        // Append final transcript segment to live text and update word count
        setLiveText((prev) => {
          const newText = `${prev}${prev ? " " : ""}${transcript.text}`;
          // Update word count if needed
          if (isIntervalEnabled && analysisInterval.startsWith("words-")) {
            const wordLimit = Number.parseInt(analysisInterval.split("-")[1]);
            const currentWordCount = newText.trim().split(/\s+/).length;
            
            if (currentWordCount >= wordLimit) {
              // Schedule the analysis and text trimming for the next tick
              setTimeout(() => {
                if (processContentRef.current) {
                  processContentRef.current();
                  // Reset word count by trimming the text to keep only the remainder
                  const words = newText.trim().split(/\s+/);
                  const remainingWords = words.slice(wordLimit).join(" ");
                  setLiveText(remainingWords);
                }
              }, 0);
            }
          }
          return newText;
        });
        
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
  }, [handleError, toast, setIsConnecting, setIsTranscribing, setLiveText, sessionStore, isIntervalEnabled, analysisInterval])

  // Move handleSilenceDetection after stopRecording
  const stopRecording = useCallback(() => {
    if (recordingState === "idle") return

    // Set saving state to true
    setIsSaving(true)

    // Stop media recorder
    if (mediaRecorder) {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
      setMediaRecorder(null)
    }

    // Show initial processing toast
    toast({
      title: "Processing Recording",
      description: "Your recording is being processed. It will appear in your library in a few moments.",
    })

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
              setIsSaving(false)
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
            
            // Convert tags to JSON string
            const tagsJSON = JSON.stringify(tags.map(tag => ({
              id: tag.id,
              name: tag.name,
              color: tag.color
            })))
            
            // Use our unified recording service which handles both local and cloud storage
            const recording = await unifiedRecordingsService.createRecording(user.id, file, {
              name: sessionName,
              description: sessionName,
              durationSeconds: recordingTime,
              isPublic: false,
              tags: tagsJSON // Add tags to the recording
            })
            
            const isLocal = unifiedRecordingsService.isLocalStorage()
            
            // Show success toast with info about library availability
            toast({
              title: "Recording Saved Successfully",
              description: "Your recording has been saved and will be available in your library shortly.",
            })

            // Show a follow-up toast after a short delay
            setTimeout(() => {
              toast({
                title: "Recording Available",
                description: "Your recording is now available in your library. Switch to the Library tab to view it.",
              })
            }, 3000)
            
          } catch (error) {
            console.error("Error saving recording:", error)
            toast({
              variant: "destructive",
              title: "Save Failed",
              description: error instanceof Error ? error.message : "Failed to save recording",
            })
          } finally {
            setIsSaving(false)
          }
        })()
      } else {
        setIsSaving(false)
      }
    } else {
      setIsSaving(false)
    }

    // End current session
    sessionStore.endCurrentSession()

    setRecordingState("idle")
    setIsTranscribing(false)
    setTags([]) // Reset tags
  }, [
    recordingState,
    mediaRecorder,
    audioChunks,
    sessionStore,
    sessionName,
    recordingTime,
    toast,
    handleError,
    tags // Add tags dependency
  ])

  // Add silence detection function
  const handleSilenceDetection = useCallback((audioLevel: number) => {
    const SILENCE_THRESHOLD = 0.01; // Adjust this value based on testing
    
    if (audioLevel < SILENCE_THRESHOLD) {
      if (!silenceStartTime) {
        setSilenceStartTime(Date.now());
      } else {
        const silenceDuration = (Date.now() - silenceStartTime) / 1000 / 60; // Convert to minutes
        if (silenceDuration >= settings.silenceDetection.thresholdMinutes && !isSilencePromptOpen && settings.silenceDetection.enabled) {
          setIsSilencePromptOpen(true);
          setCountdownSeconds(settings.silenceDetection.autoStopSeconds);
          
          // Start countdown timer
          const countdownInterval = setInterval(() => {
            setCountdownSeconds((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownInterval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);

          // Start auto-stop timer
          const timer = setTimeout(() => {
            stopRecording();
            setIsSilencePromptOpen(false);
            setCountdownSeconds(null);
          }, settings.silenceDetection.autoStopSeconds * 1000);
          setSilenceAutoStopTimer(timer);
        }
      }
    } else {
      // Reset silence detection when audio is detected
      setSilenceStartTime(null);
      if (silenceAutoStopTimer) {
        clearTimeout(silenceAutoStopTimer);
        setSilenceAutoStopTimer(null);
      }
      setCountdownSeconds(null);
    }
  }, [settings.silenceDetection.thresholdMinutes, settings.silenceDetection.autoStopSeconds, settings.silenceDetection.enabled, isSilencePromptOpen, silenceStartTime, stopRecording]);

  // Modify the startRecording function to initialize audio analysis for silence detection
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

      // After setting up MediaRecorder and Web Audio pipeline, add silence detection
      if (settings.silenceDetection.enabled) {
        const dataArray = new Float32Array(analyser.frequencyBinCount);
        const checkAudioLevel = () => {
          if (recordingState === "recording") {
            analyser.getFloatTimeDomainData(dataArray);
            const audioLevel = Math.max(...dataArray.map(Math.abs));
            handleSilenceDetection(audioLevel);
            requestAnimationFrame(checkAudioLevel);
          }
        };
        checkAudioLevel();
      }

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
    settings.silenceDetection.enabled,
    handleSilenceDetection,
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

  // Add effect to track word count changes - this is now our backup check
  useEffect(() => {
    if (!isIntervalEnabled || !isRecording) return;

    if (analysisInterval.startsWith("words-")) {
      const wordLimit = Number.parseInt(analysisInterval.split("-")[1]);
      const currentWordCount = liveText.trim().split(/\s+/).length;

      if (currentWordCount >= wordLimit && processContentRef.current) {
        processContentRef.current();
        // Reset word count by trimming the text to keep only the remainder
        const words = liveText.trim().split(/\s+/);
        const remainingWords = words.slice(wordLimit).join(" ");
        setLiveText(remainingWords);
      }
    }
  }, [liveText, isIntervalEnabled, isRecording, analysisInterval]);

  // Modify updateAnalysisTimer to handle only time-based intervals
const isAnalyzingRef = useRef(false)

const updateAnalysisTimer = useCallback(() => {
  if (!isRecording || !isIntervalEnabled) return;

  if (analysisInterval.startsWith("time-")) {
    const seconds = Number.parseInt(analysisInterval.split("-")[1])
    if (isNaN(seconds)) return;

    if (nextAnalysisTime <= 0) {
      if (!isAnalyzingRef.current) {
        isAnalyzingRef.current = true

        processContent().finally(() => {
          isAnalyzingRef.current = false
        })

        setNextAnalysisTime(seconds)
      }
    } else {
      setNextAnalysisTime((prev) => prev - 1)
    }
  }
}, [isRecording, isIntervalEnabled, analysisInterval, nextAnalysisTime, processContent])


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
              // Add version if missing
              if (!profile.version) {
                profile.version = 2
              }
              
              // Add required fields if missing
              if (!profile.visualization) {
                profile.visualization = {
                  default_layout: "radial",
                  node_color_scheme: "default",
                  highlight_decisions: true,
                  highlight_questions: true,
                  expand_level: 1,
                }
              }
              
              // Add the profile
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

  // Add effect to auto-hide the widget hint after some time
  useEffect(() => {
    if (showWidgetHint) {
      // Automatically hide the hint after 10 seconds
      const timer = setTimeout(() => setShowWidgetHint(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showWidgetHint]);

  return (
    <div className="space-y-6">
      {/* Show saving overlay when saving */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <div className="text-center">
              <h3 className="font-semibold mb-1">Saving Recording</h3>
              <p className="text-sm text-muted-foreground">Please wait while we process and save your recording...</p>
            </div>
          </div>
        </div>
      )}

      {/* Show first-time widget usage hint - only show when drag and drop is enabled */}
      {showWidgetHint && settings.enableDragDrop && settings.minimizedWidgets.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5 text-blue-500 animate-pulse" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Widget hint:</span> All widgets are minimized. Click the <Maximize2 className="inline h-3 w-3 mx-1" /> button on any widget to expand it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowWidgetHint(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
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

          {/* Layout Controls - More visible now */}
          <div className="flex flex-col mt-2 sm:mt-0">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <Move className="h-3 w-3" /> Layout Controls
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-200 dark:border-blue-800">
              <LayoutManager />
              <WidgetPicker />
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllWidgets}
                className="h-8 flex items-center gap-1 bg-white dark:bg-slate-800"
                title="Reset the current layout to organized positions without affecting saved layouts"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Layout</span>
            </Button>
            </div>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recording Controls Panel */}
          <Card className="p-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Record/Pause/Resume button */}
                  <div className="relative">
                  <Button
                      variant={recordingState === "idle" ? "destructive" : recordingState === "recording" ? "default" : "default"}
                    size="icon"
                    onClick={() => {
                      if (recordingState === "idle") {
                        startRecording()
                      } else if (recordingState === "recording") {
                        pauseRecording()
                      } else if (recordingState === "paused") {
                        resumeRecording()
                      }
                    }}
                      className={`h-10 w-10 rounded-full relative ${
                        recordingState === "recording" ? "bg-green-500 hover:bg-green-600 text-white border-green-400" : ""
                      }`}
                      aria-label={
                        recordingState === "idle" 
                          ? "Start recording" 
                          : recordingState === "recording" 
                            ? "Pause recording" 
                            : "Resume recording"
                      }
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                      ) : recordingState === "recording" ? (
                      <Pause className="h-5 w-5" />
                      ) : recordingState === "paused" ? (
                      <Play className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 fill-current" />
                    )}
                  </Button>
                    {/* Larger blinking red dot indicator */}
                    {recordingState === "recording" && (
                      <div className="absolute -top-2 -right-2 w-5 h-5">
                        <div className="absolute w-full h-full rounded-full bg-red-500 animate-[pulse_1s_ease-in-out_infinite]" />
                      </div>
                    )}
                  </div>

                  {/* Stop button - only show when recording or paused */}
                  {(recordingState === "recording" || recordingState === "paused") && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stopRecording}
                      className="h-10 w-10 rounded-full border-red-200 hover:border-red-300 hover:bg-red-50"
                    aria-label="Stop recording"
                  >
                      <Square className="h-5 w-5 text-red-500" />
                  </Button>
                  )}

                  {/* Mute button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`h-10 w-10 rounded-full ${
                      isMuted 
                        ? "bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200" 
                        : ""
                    }`}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    disabled={recordingState === "idle" || isConnecting}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {/* Add Tag Button - New Position */}
                  {(recordingState === "recording" || recordingState === "paused") && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsTagEditorOpen(true)}
                      className={`h-10 w-10 rounded-full ${tags.length > 0 ? "bg-blue-100 dark:bg-blue-900/20 border-blue-200" : ""}`}
                      title={`Edit Tags (${tags.length} tags)`}
                    >
                      <div className="relative">
                        <TagIcon className="h-5 w-5" />
                        {tags.length > 0 && (
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
                            {tags.length}
                          </div>
                        )}
                      </div>
                    </Button>
                  )}
                </div>

                {/* Recording status indicator */}
                <div className="flex items-center gap-2">
                  {recordingState !== "idle" && (
                    <span className={`text-sm ${
                      recordingState === "recording" 
                        ? "text-red-500" 
                        : "text-yellow-500"
                    }`}>
                      {recordingState === "recording" ? "Recording" : "Paused"}
                    </span>
                  )}
                <div className="text-xl font-mono">{formatTime(recordingTime)}</div>
                </div>

                {/* Analysis timer */}
                <AnalysisTimer
                  nextAnalysisTime={nextAnalysisTime}
                  isEnabled={isIntervalEnabled}
                  interval={analysisInterval}
                  onComplete={processContent}
                />

                <div className="w-24 h-10">
                  <AudioVisualizer isActive={isRecording && !isMuted} />
                </div>
              </div>

              {/* Display current tags */}
              {(recordingState === "recording" || recordingState === "paused") && tags.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {tags.map(tag => (
                    <div 
                      key={tag.id}
                      className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${TAG_COLORS.find(c => c.value === tag.color)?.class}`}
                    >
                      <span>{tag.name}</span>
                      <X 
                        className="h-3 w-3 opacity-50 cursor-pointer hover:opacity-100" 
                        onClick={() => setTags(prev => prev.filter(t => t.id !== tag.id))}
                      />
                    </div>
                  ))}
                </div>
              )}

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
                      <SelectGroup>
                        <SelectLabel>Time</SelectLabel>
                        <SelectItem value="time-60">1 minute</SelectItem>
                        <SelectItem value="time-120">2 minutes</SelectItem>
                        <SelectItem value="time-300">5 minutes</SelectItem>
                        <SelectItem value="time-600">10 minutes</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Word Count</SelectLabel>
                        <SelectItem value="words-75">75 words</SelectItem>
                        <SelectItem value="words-100">100 words</SelectItem>
                        <SelectItem value="words-200">200 words</SelectItem>
                        <SelectItem value="words-500">500 words</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Silence</SelectLabel>
                        <SelectItem value="silence-15">15 seconds silence</SelectItem>
                        <SelectItem value="silence-30">30 seconds silence</SelectItem>
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
                    <div className="flex items-center gap-4 ml-auto">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="interval-toggle"
                          checked={isIntervalEnabled}
                          onCheckedChange={setIsIntervalEnabled}
                        />
                        <Label htmlFor="interval-toggle" className="text-sm">Auto Analysis</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={templateStore.activeTemplate} onValueChange={templateStore.setActiveTemplate}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Analytics Profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel className="font-semibold text-primary">Built-in Profiles</SelectLabel>
                          {templateStore.templates
                            .filter((template) => template.name.startsWith("*"))
                            .map((template) => (
                              <SelectItem key={template.name} value={template.name}>
                                <div className="flex items-center gap-2">
                                  <span>{template.name.substring(1)}</span>
                                  <span className="text-xs text-muted-foreground">(Built-in)</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="font-semibold text-primary">Custom Profiles</SelectLabel>
                          {templateStore.templates
                            .filter((template) => !template.name.startsWith("*"))
                            .map((template) => (
                              <SelectItem key={template.name} value={template.name}>
                                <div className="flex items-center gap-2">
                                  <span>{template.name}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Custom</span>
                                </div>
                              </SelectItem>
                            ))}
                          {templateStore.templates.filter((t) => !t.name.startsWith("*")).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                              No custom profiles yet
                            </div>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                          const activeProfile = templateStore.templates.find(
                            (t) => t.name === templateStore.activeTemplate
                          )
                          if (activeProfile) {
                            setSelectedProfileName(activeProfile.name)
                            setIsCreatingNewProfile(false)
                            setIsProfileEditorOpen(true)
                          }
                        }}
                        title="Edit profile"
                      >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                        onClick={exportProfiles}
                        title="Export profiles"
                      >
                        <DownloadIcon className="h-4 w-4" />
                    </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={importProfiles}
                        title="Import profiles"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {/* Hidden file input for importing */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasContent}
                    onClick={processContent}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Process
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Only show draggable widgets when drag and drop is enabled */}
        {settings.enableDragDrop ? (
          <>
            {/* Left Panel: Live Text - Modified to ensure it's always visible */}
            <DraggableWidget
              id="live-text"
              title="Live Text"
              defaultPosition={{ x: 20, y: 20 }}
              defaultSize={{ width: 300, height: 320 }}
              className="w-full md:w-auto"
              // Force visibility for this critical widget
              forceVisible={true}
            >
              <div className="p-2 flex items-center justify-between border-b">
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
                </div>
                <div className="flex items-center gap-2">
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
                      .map((sentence, idx) => {
                        // Check if this is a Curiosity Engine entry
                        if (sentence.includes("[Curiosity")) {
                          // Split the text by our special markers
                          const parts = sentence.split("§§");
                          if (parts.length >= 3) {
                            return (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-xs text-muted-foreground font-mono mt-1">{formatTime(idx * 5)}</span>
                                <div>
                                  {parts.map((part, partIdx) => {
                                    // Even indices are regular text, odd indices are to be colored
                                    return partIdx % 2 === 0 ? (
                                      <span key={partIdx}>{part}</span>
                                    ) : (
                                      <span key={partIdx} className="text-green-600 dark:text-green-400">{part}</span>
                                    );
                                  })}
                                  <span>.</span>
            </div>
        </div>
                            );
                          }
                        }
                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground font-mono mt-1">{formatTime(idx * 5)}</span>
                            <p>{sentence.trim()}.</p>
      </div>
                        );
                      })}
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
            </DraggableWidget>

            {/* Right Panel: AI Insights */}
            <DraggableWidget
              id="ai-insights"
              title="AI Insights"
              defaultPosition={{ x: 380, y: 20 }}
              defaultSize={{ width: 340, height: 360 }}
              className="w-full md:w-auto"
            >
              <Tabs defaultValue="insights">
                <div className="bg-muted p-2 border-b">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="insights">AI Insights</TabsTrigger>
                    <TabsTrigger value="curiosity">Curiosity Engine</TabsTrigger>
                    <TabsTrigger value="compass">Conversation Compass</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="insights" className="p-4 h-[400px] overflow-y-auto">
                  {hasContent ? (
                    <AIAnalysisPanel 
                      transcript={liveText} 
                      analysisResult={analysisResult}
                      isAnalyzing={isAnalyzing}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p>No insights available yet</p>
                        <p className="text-sm mt-2">Start recording or enter text to analyze</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="curiosity" className="h-[400px] overflow-y-auto">
                  <CuriosityEngine 
                    hasContent={hasContent} 
                    transcript={liveText} 
                    onAnswerSubmitted={(text) => {
                      setLiveText(prev => `${prev}${prev ? " " : ""}${text}`)
                    }}
                  />
                </TabsContent>

                <TabsContent value="compass" className="h-[400px] overflow-y-auto">
                  <ConversationCompass hasContent={hasContent} />
                </TabsContent>
              </Tabs>
            </DraggableWidget>
          </>
        ) : (
          <>
            {/* Standard non-draggable layout for when drag and drop is disabled */}
            <Card className="overflow-hidden shadow-md">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent/40 to-muted border-b">
                <span className="font-medium text-sm">Live Text</span>
              </div>
              <div className="p-2 flex items-center justify-between border-b">
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
                </div>
                <div className="flex items-center gap-2">
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
                  .map((sentence, idx) => {
                    // Check if this is a Curiosity Engine entry
                    if (sentence.includes("[Curiosity")) {
                      // Split the text by our special markers
                      const parts = sentence.split("§§");
                      if (parts.length >= 3) {
                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground font-mono mt-1">{formatTime(idx * 5)}</span>
                            <div>
                              {parts.map((part, partIdx) => {
                                // Even indices are regular text, odd indices are to be colored
                                return partIdx % 2 === 0 ? (
                                  <span key={partIdx}>{part}</span>
                                ) : (
                                  <span key={partIdx} className="text-green-600 dark:text-green-400">{part}</span>
                                );
                              })}
                              <span>.</span>
                            </div>
                          </div>
                        );
                      }
                    }
                    return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground font-mono mt-1">{formatTime(idx * 5)}</span>
                      <p>{sentence.trim()}.</p>
                    </div>
                    );
                  })}
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

            <Card className="overflow-hidden shadow-md">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent/40 to-muted border-b">
                <span className="font-medium text-sm">AI Insights</span>
              </div>
          <Tabs defaultValue="insights">
                <div className="bg-muted p-2 border-b">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
                <TabsTrigger value="curiosity">Curiosity Engine</TabsTrigger>
                <TabsTrigger value="compass">Conversation Compass</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="insights" className="p-4 h-[400px] overflow-y-auto">
              {hasContent ? (
                <AIAnalysisPanel 
                  transcript={liveText} 
                  analysisResult={analysisResult}
                  isAnalyzing={isAnalyzing}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p>No insights available yet</p>
                    <p className="text-sm mt-2">Start recording or enter text to analyze</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="curiosity" className="h-[400px] overflow-y-auto">
              <CuriosityEngine 
                hasContent={hasContent} 
                transcript={liveText} 
                onAnswerSubmitted={(text) => {
                  setLiveText(prev => `${prev}${prev ? " " : ""}${text}`)
                }}
              />
            </TabsContent>

            <TabsContent value="compass" className="h-[400px] overflow-y-auto">
              <ConversationCompass hasContent={hasContent} />
            </TabsContent>
          </Tabs>
        </Card>
          </>
        )}
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
         
        </div>
      </div>

      {/* Only render these additional widgets when drag and drop is enabled */}
      {settings.enableDragDrop && (
        <>
      {/* Bookmark Panel */}
          <DraggableWidget
            id="bookmarks"
            title="Bookmarks"
            defaultPosition={{ x: 380, y: 400 }}
            defaultSize={{ width: 340, height: 320 }}
            className="w-full"
          >
            <div className="p-4">
        <div className="flex items-center justify-between mb-4">
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
            </div>
          </DraggableWidget>

          {/* Audio Controls Widget */}
          <DraggableWidget
            id="audio-controls"
            title="Audio Controls"
            defaultPosition={{ x: 740, y: 400 }}
            defaultSize={{ width: 340, height: 320 }}
            className="w-full"
          >
            <div className="p-4">
              {/* Fix AudioVisualizer props */}
              <AudioVisualizer isActive={isRecording && !isMuted} />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                <span className="text-sm">{wordCount} words</span>
              </div>
            </div>
          </DraggableWidget>

          {/* Analysis Settings Widget */}
          <DraggableWidget
            id="analysis-settings"
            title="Analysis Settings"
            defaultPosition={{ x: 20, y: 400 }}
            defaultSize={{ width: 340, height: 320 }}
            className="w-full"
          >
            <div className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Auto Analysis</Label>
                  <Switch
                    id="interval-toggle-widget"
                    checked={isIntervalEnabled}
                    onCheckedChange={setIsIntervalEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-interval">Analysis Interval</Label>
                  <Select
                    value={analysisInterval}
                    onValueChange={setAnalysisInterval}
                    disabled={!isIntervalEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Time</SelectLabel>
                        <SelectItem value="time-60">1 minute</SelectItem>
                        <SelectItem value="time-120">2 minutes</SelectItem>
                        <SelectItem value="time-300">5 minutes</SelectItem>
                        <SelectItem value="time-600">10 minutes</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Word Count</SelectLabel>
                        <SelectItem value="words-75">75 words</SelectItem>
                        <SelectItem value="words-100">100 words</SelectItem>
                        <SelectItem value="words-200">200 words</SelectItem>
                        <SelectItem value="words-500">500 words</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Silence</SelectLabel>
                        <SelectItem value="silence-15">15 seconds silence</SelectItem>
                        <SelectItem value="silence-30">30 seconds silence</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {isIntervalEnabled && (
                  <div className="text-sm text-muted-foreground">
                    Next analysis in: {formatTime(nextAnalysisTime)}
                  </div>
                )}
              </div>
            </div>
          </DraggableWidget>

          {/* Tags Widget */}
          <DraggableWidget
            id="tags"
            title="Tags"
            defaultPosition={{ x: 20, y: 740 }}
            defaultSize={{ width: 340, height: 200 }}
            className="w-full"
          >
            <div className="p-4">
        <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Conversation Tags</h3>
                <Button variant="outline" size="sm" onClick={() => setIsTagEditorOpen(true)}>
                  <TagIcon className="h-4 w-4 mr-2" />
                  Manage Tags
                </Button>
              </div>
              
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Tag 
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      className={TAG_COLORS.find(c => c.value === tag.color)?.class}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No tags added yet. Click "Manage Tags" to add some.
                </div>
              )}
            </div>
          </DraggableWidget>

          {/* Conversations Compass Widget - Add this outside your tab panel so it's draggable independently */}
          <DraggableWidget
            id="conversation-compass-widget"
            title="Conversation Compass"
            defaultPosition={{ x: 740, y: 20 }}
            defaultSize={{ width: 340, height: 360 }}
            className="w-full"
          >
            <div className="p-4 h-[300px] overflow-auto">
              <ConversationCompass hasContent={hasContent} />
            </div>
          </DraggableWidget>

          {/* Curiosity Engine Widget - Add this outside your tab panel so it's draggable independently */}
          <DraggableWidget
            id="curiosity-engine-widget"
            title="Curiosity Engine"
            defaultPosition={{ x: 1100, y: 20 }}
            defaultSize={{ width: 340, height: 360 }}
            className="w-full"
          >
            <div className="p-4 h-[300px] overflow-auto">
              <CuriosityEngine hasContent={hasContent} transcript={liveText} />
            </div>
          </DraggableWidget>
        </>
      )}
      {/* Render standard non-draggable widgets for bottom widgets when drag and drop is disabled */}
      {!settings.enableDragDrop && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="overflow-hidden shadow-md">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent/40 to-muted border-b">
              <span className="font-medium text-sm">Bookmarks</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
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
            </div>
      </Card>

          <Card className="overflow-hidden shadow-md">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent/40 to-muted border-b">
              <span className="font-medium text-sm">Tags</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Conversation Tags</h3>
                <Button variant="outline" size="sm" onClick={() => setIsTagEditorOpen(true)}>
                  <TagIcon className="h-4 w-4 mr-2" />
                  Manage Tags
                </Button>
              </div>
              
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <div 
                      key={tag.id} 
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${TAG_COLORS.find(c => c.value === tag.color)?.class}`}
                    >
                      {tag.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No tags added yet. Click "Manage Tags" to add some.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <ProfileEditorDialog
        open={isProfileEditorOpen}
        onOpenChange={(open) => {
          setIsProfileEditorOpen(open)
          if (!open) setIsCreatingNewProfile(false)
        }}
        profileName={isCreatingNewProfile ? undefined : templateStore.activeTemplate}
        isCreatingNew={isCreatingNewProfile}
      />

      {/* Tag Editor Dialog */}
      <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              Edit Tags
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Tags */}
            <div className="space-y-3">
      <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Tags ({tags.length})</label>
                {tags.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Click on a tag to remove it
                  </span>
                )}
              </div>
              
              {/* Group tags by color */}
              {Object.entries(
                tags.reduce((acc, tag) => {
                  const colorGroup = acc[tag.color] || [];
                  return {
                    ...acc,
                    [tag.color]: [...colorGroup, tag]
                  };
                }, {} as Record<string, Tag[]>)
              ).map(([color, colorTags]) => (
                <div key={color} className="space-y-2">
        <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TAG_COLORS.find(c => c.value === color)?.class}`} />
                    <span className="text-xs font-medium">{TAG_COLORS.find(c => c.value === color)?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-4">
                    {colorTags.map(tag => (
                      <div 
                        key={tag.id}
                        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${TAG_COLORS.find(c => c.value === color)?.class}`}
                        onClick={() => setTags(prev => prev.filter(t => t.id !== tag.id))}
                        title="Click to remove"
                      >
                        <span>{tag.name}</span>
                        <TagIcon className="h-3 w-3 opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {tags.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                  No tags added yet. Add your first tag below.
                </div>
              )}
            </div>

            {/* Add New Tag */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Add New Tag</label>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      e.preventDefault();
                      setTags(prev => [...prev, {
                        id: crypto.randomUUID(),
                        name: newTagName.trim(),
                        color: selectedColor
                      }]);
                      setNewTagName('');
                    }
                  }}
                  placeholder="Enter tag name"
                  className="flex-1"
                />
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-input rounded-md text-sm"
                >
                  {TAG_COLORS.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
          <Button
            onClick={() => {
                    if (newTagName.trim()) {
                      setTags(prev => [...prev, {
                        id: crypto.randomUUID(),
                        name: newTagName.trim(),
                        color: selectedColor
                      }]);
                      setNewTagName('');
                    }
                  }}
                  disabled={!newTagName.trim()}
                  className="shrink-0"
                >
                  Add Tag
          </Button>
        </div>
      </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagEditorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silence Detection Dialog */}
      <SilenceAlertDialog
        open={isSilencePromptOpen}
        onOpenChange={(open) => {
          setIsSilencePromptOpen(open);
          if (!open) {
            if (silenceAutoStopTimer) {
              clearTimeout(silenceAutoStopTimer);
              setSilenceAutoStopTimer(null);
            }
            setCountdownSeconds(null);
          }
        }}
        onContinue={() => {
          setSilenceStartTime(null);
          setIsSilencePromptOpen(false);
          if (silenceAutoStopTimer) {
            clearTimeout(silenceAutoStopTimer);
            setSilenceAutoStopTimer(null);
          }
          setCountdownSeconds(null);
        }}
        onStop={() => {
          stopRecording();
          setIsSilencePromptOpen(false);
          if (silenceAutoStopTimer) {
            clearTimeout(silenceAutoStopTimer);
            setSilenceAutoStopTimer(null);
          }
          setCountdownSeconds(null);
        }}
        countdownSeconds={countdownSeconds}
        thresholdMinutes={settings.silenceDetection.thresholdMinutes}
        type={countdownSeconds === null ? 'stopped' : 'initial'}
      />
    </div>
  )
}
