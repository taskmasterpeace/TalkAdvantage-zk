"use client"

import { useEffect, useRef, useState } from "react"
import { useTrackingStore } from "@/lib/store/tracking-store"
import { Mic, MicOff, Loader2 } from "lucide-react"

// Add type definitions at the top
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface LiveListenerProps {
  isActive: boolean
}

export function LiveListener({ isActive }: LiveListenerProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const { isTracking, startTracking, stopTracking, addThought } = useTrackingStore()

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastProcessedRef = useRef<string>("")

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log("Speech recognition started");
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        // Try to restart recognition on error only if tracking is active and not paused
        if (isTracking && isActive && !isPaused) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
          }
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        // Restart if tracking is still active and not paused
        if (isTracking && isActive && !isPaused) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
          }
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Only process results if tracking is active and not paused
        if (!isTracking || !isActive || isPaused) {
          return;
        }

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the transcript state only if not paused
        if (!isPaused) {
          setTranscript(finalTranscript || interimTranscript);

          // Process final transcript chunks only if tracking is active and not paused
          if (finalTranscript && finalTranscript !== lastProcessedRef.current) {
            addThought(finalTranscript);
            lastProcessedRef.current = finalTranscript;
          }
        }
      };

      recognitionRef.current = recognition;

      // Start recognition if isActive is true and not paused
      if (isActive && !isPaused) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to start recognition", e);
          setError("Failed to start speech recognition. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setError("Failed to initialize speech recognition. Please try again.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
        recognitionRef.current.onstart = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
      }
    };
  }, [isActive, isTracking, addThought, isPaused]);

  // Clear transcript when tracking is stopped or paused
  useEffect(() => {
    if (!isTracking || isPaused) {
      setTranscript("");
      lastProcessedRef.current = "";
    }
  }, [isTracking, isPaused]);

  // Start/stop listening based on isActive prop and pause state
  useEffect(() => {
    if (isActive && !isListening && !isPaused && recognitionRef.current) {
      startTracking();
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    } else if ((!isActive || isPaused) && isListening && recognitionRef.current) {
      if (isPaused) {
        // Just stop recognition but keep tracking active
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
      } else {
        // Stop both recognition and tracking
        stopTracking();
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
      }
    }
  }, [isActive, isListening, startTracking, stopTracking, isPaused]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
      }
      stopTracking();
    };
  }, [stopTracking]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2">
        {isListening && !isPaused ? (
          <div className="flex items-center gap-2 text-primary">
            <Mic className="h-5 w-5 animate-pulse" />
            <span>Listening...</span>
          </div>
        ) : isPaused ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MicOff className="h-5 w-5" />
            <span>Paused</span>
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
        {transcript && !isPaused ? `"${transcript}"` : "Speak to see your words here..."}
      </div>
    </div>
  );
}

