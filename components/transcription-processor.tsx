"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, FileAudio } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { r2Service } from "@/lib/cloudflare/r2-service"
import { indexedDBService } from "@/lib/indexeddb/indexed-db-service"

interface TranscriptionProcessorProps {
  recordingId: string
  audioUrl?: string
  isLocal?: boolean
  onComplete?: () => void
}

export default function TranscriptionProcessor({ 
  recordingId, 
  audioUrl = "", 
  isLocal = false, 
  onComplete 
}: TranscriptionProcessorProps) {
  const [loading, setLoading] = useState(!isLocal) // Skip loading for local since we already have audioUrl
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(isLocal ? audioUrl : null)
  const [recordingName, setRecordingName] = useState<string>(isLocal ? "Local Recording" : "")

  // Transcription options
  const [enableSpeakerDetection, setEnableSpeakerDetection] = useState(true)
  const [enableTimestamps, setEnableTimestamps] = useState(true)
  const [enableSentimentAnalysis, setEnableSentimentAnalysis] = useState(false)
  const [enableTopicDetection, setEnableTopicDetection] = useState(false)
  const [enableSummarization, setEnableSummarization] = useState(true)
  const [summaryType, setSummaryType] = useState<"bullets" | "paragraph" | "headline">("bullets")

  const { toast } = useToast()

  useEffect(() => {
    // Skip fetching for local recordings since we already have audioUrl
    if (isLocal) {
      console.log("TranscriptionProcessor - Using local mode for recording:", recordingId)
      console.log("TranscriptionProcessor - Audio URL:", audioUrl ? audioUrl.substring(0, 30) + "..." : "none")
      
      // For local recordings, fetch the name if available
      async function fetchLocalRecording() {
        try {
          const recording = await indexedDBService.getRecording(recordingId);
          if (recording) {
            setRecordingName(recording.name || "Local Recording");
          }
        } catch (error) {
          console.error("Error fetching local recording name:", error);
        }
      }
      
      fetchLocalRecording();
      setLoading(false);
      return;
    }

    async function fetchRecording() {
      try {
        const supabase = getSupabaseClient()

        // Get recording details
        const { data: recording, error: recordingError } = await supabase
          .from("recordings")
          .select("*")
          .eq("id", recordingId)
          .single()

        if (recordingError) {
          throw recordingError
        }

        setRecordingName(recording.name)

        // Get signed URL from R2 storage instead of Supabase
        try {
          const url = await r2Service.getFileUrl(recording.storage_path)
          setRecordingUrl(url)
        } catch (r2Error) {
          console.error("Error getting R2 URL:", r2Error)
          throw new Error("Failed to get recording URL from storage")
        }
      } catch (error) {
        console.error("Error fetching recording:", error)
        setError("Failed to load recording details")
      } finally {
        setLoading(false)
      }
    }

    fetchRecording()
  }, [recordingId, isLocal, audioUrl])

  const handleProcess = async () => {
    if (!recordingUrl) {
      setError("Recording URL not available")
      return
    }

    setError(null)
    setProcessing(true)
    setProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 1000)

      // Set up form data for transcription (same for both local and cloud)
      const formData = new FormData()
      formData.append("audioUrl", recordingUrl)
      formData.append("speakerLabels", enableSpeakerDetection.toString())
      formData.append("timestamps", enableTimestamps.toString())
      formData.append("sentimentAnalysis", enableSentimentAnalysis.toString())
      formData.append("topicDetection", enableTopicDetection.toString())
      formData.append("summarization", enableSummarization.toString())
      // formData.append("summaryType", summaryType)
      formData.append("recordingId", recordingId)
      formData.append("isLocal", isLocal.toString())

      // Call the transcribe API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to transcribe recording")
      }

      const data = await response.json()
      
      if (isLocal) {
        // For local recordings, store in IndexedDB
        try {
          // Get the existing recording
          const recording = await indexedDBService.getRecording(recordingId);
          
          if (!recording) {
            throw new Error("Recording not found");
          }
          
          // Use the specialized method to add transcript data
          console.log("Adding transcript to local recording:", recordingId);
          const updatedRecording = await indexedDBService.addTranscriptToRecording(
            recordingId,
            data.transcript,
            data.summary
          );
          
          if (updatedRecording) {
            console.log("Successfully updated local recording with transcript:", {
              id: updatedRecording.id,
              isProcessed: updatedRecording.isProcessed,
              hasTranscript: !!updatedRecording.transcript,
              transcriptLength: updatedRecording.transcript?.length || 0,
            });
          } else {
            console.error("Failed to update recording with transcript - no recording returned");
            throw new Error("Failed to update recording with transcript");
          }
        } catch (err) {
          console.error("Error updating local recording with transcript:", err);
          setError("Failed to save transcript data: " + String(err));
          setProgress(0);
          return;
        }
      } else {
        // For cloud recordings, store in Supabase (processed by API)
        const supabase = getSupabaseClient();
        
        // Create transcript segments if available
        if (data.words && data.words.length > 0) {
          const segments = data.words.map((word: any) => ({
            transcript_id: data.transcriptId,
            speaker: word.speaker || "Unknown",
            start_ms: word.start,
            end_ms: word.end,
            text: word.text,
          }));
  
          const { error: segmentsError } = await supabase.from("transcript_segments").insert(segments);
  
          if (segmentsError) {
            console.error("Error inserting segments:", segmentsError);
            // Continue even if segments insertion fails
          }
          }
        }

      // Update UI for success (same for both local and cloud)
      setProgress(100)
      setSuccess(true)

      toast({
        title: "Processing complete",
        description: isLocal ? "Your local recording has been processed" : "Your recording has been successfully transcribed",
      })

      // Notify parent component
      setTimeout(() => {
        if (onComplete) {
          onComplete()
        } else {
          // Refresh the page when no callback is provided
          window.location.reload()
        }
      }, 2000)
    } catch (err) {
      console.error("Transcription error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        variant: "destructive",
        title: "Transcription failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="rounded-full bg-primary/20 h-12 w-12 mb-4"></div>
              <div className="h-4 bg-primary/20 rounded w-48 mb-2.5"></div>
              <div className="h-3 bg-primary/20 rounded w-32"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-primary" />
          {isLocal ? "Process Recording" : "Transcribe Recording"}: {recordingName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-600 dark:text-green-400">Success</AlertTitle>
            <AlertDescription>Your recording has been successfully {isLocal ? "processed" : "transcribed and processed"}.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transcription Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="speaker-detection"
                      checked={enableSpeakerDetection}
                      onCheckedChange={(checked) => setEnableSpeakerDetection(checked as boolean)}
                    />
                    <Label htmlFor="speaker-detection">Speaker Detection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timestamps"
                      checked={enableTimestamps}
                      onCheckedChange={(checked) => setEnableTimestamps(checked as boolean)}
                    />
                    <Label htmlFor="timestamps">Include Timestamps</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sentiment-analysis"
                      checked={enableSentimentAnalysis}
                      onCheckedChange={(checked) => setEnableSentimentAnalysis(checked as boolean)}
                    />
                    <Label htmlFor="sentiment-analysis">Sentiment Analysis</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="topic-detection"
                      checked={enableTopicDetection}
                      onCheckedChange={(checked) => setEnableTopicDetection(checked as boolean)}
                    />
                    <Label htmlFor="topic-detection">Topic Detection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summarization"
                      checked={enableSummarization}
                      onCheckedChange={(checked) => setEnableSummarization(checked as boolean)}
                    />
                    <Label htmlFor="summarization">Generate Summary</Label>
                  </div>

                  {enableSummarization && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="summary-type">Summary Type</Label>
                      <Select
                        value={summaryType}
                        onValueChange={(value) => setSummaryType(value as "bullets" | "paragraph" | "headline")}
                      >
                        <SelectTrigger id="summary-type">
                          <SelectValue placeholder="Select summary type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bullets">Bullet Points</SelectItem>
                          <SelectItem value="paragraph">Paragraph</SelectItem>
                          <SelectItem value="headline">Headline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Processing</Label>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  This may take several minutes depending on the length of the recording.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleProcess} disabled={processing || !recordingUrl}>
                {processing ? "Processing..." : "Start Processing"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
