"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MediaPlayer } from "@/components/media-player"
import { Clock, Calendar, Download, Share2, FileText } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { indexedDBService } from "@/lib/indexeddb/indexed-db-service"
import TranscriptionProcessor from "@/components/transcription-processor"

interface Recording {
  id: string
  name: string
  description: string | null
  duration_seconds: number
  created_at: string
  is_processed: boolean
  is_public: boolean
}

interface Transcript {
  id: string
  recording_id: string
  full_text: string
  created_at: string
}

interface RecordingDetailsProps {
  recording: Recording
  audioUrl: string
  isLocal?: boolean
}

export function RecordingDetails({ recording, audioUrl, isLocal = false }: RecordingDetailsProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(true)
  const [localRecording, setLocalRecording] = useState<any>(null)
  const [localAudioUrl, setLocalAudioUrl] = useState<string>(audioUrl)
  const [needsProcessing, setNeedsProcessing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  console.log("RecordingDetails mounted", { recordingId: recording.id, isLocal });

  useEffect(() => {
    // Handle fetching transcript - different approaches for local vs cloud
    async function fetchTranscript() {
      try {
        setIsLoadingTranscript(true)
        setFetchError(null)
        
        if (isLocal) {
          console.log("Fetching local recording data", { recordingId: recording.id });
          
          // For local recordings, get from IndexedDB
          try {
            const result = await indexedDBService.getRecording(recording.id)
            console.log("IndexedDB getRecording result:", result);
          
            if (result) {
              console.log("Loaded local recording:", {
                id: result.id,
                name: result.name,
                isProcessed: result.isProcessed,
                hasTranscript: !!result.transcript,
                transcriptLength: result.transcript?.length || 0
              })
              
              setLocalRecording(result)
              
              // Get the audio URL
              console.log("Fetching local audio URL");
              try {
                const url = await indexedDBService.getRecordingUrl(recording.id)
                console.log("Got local audio URL:", url?.substring(0, 50) + "...");
                setLocalAudioUrl(url)
              } catch (audioUrlError) {
                console.error("Error getting local audio URL:", audioUrlError);
                setFetchError("Error loading audio: " + String(audioUrlError));
              }
              
              // If we have transcript data, create a transcript-like object
              if (result.transcript) {
                console.log("Found transcript in local recording, length:", result.transcript.length);
                setTranscript({
                  id: 'local-transcript',
                  recording_id: result.id,
                  full_text: result.transcript,
                  created_at: result.createdAt
                })
              } else {
                console.log("No transcript in local recording, needs processing:", !result.isProcessed);
                // Flag that we need processing if no transcript
                setNeedsProcessing(!result.isProcessed || !result.transcript)
              }
            } else {
              console.error("Local recording not found:", recording.id);
              setFetchError("Local recording not found");
            }
          } catch (localError) {
            console.error("Error accessing IndexedDB:", localError);
            setFetchError("Error accessing local storage: " + String(localError));
          }
        } else {
          // For cloud recordings, fetch from Supabase as before
          console.log("Fetching cloud recording transcript", { recordingId: recording.id });
          const supabase = getSupabaseClient()
          
          const { data, error } = await supabase
            .from("transcripts")
            .select("*")
            .eq("recording_id", recording.id)
            .maybeSingle()
          
          if (error) {
            console.error("Error fetching transcript:", error)
            setFetchError("Error fetching transcript: " + error.message);
            return
          }
          
          setTranscript(data)
          if (data) {
            console.log("Found cloud transcript, length:", data.full_text.length);
          } else {
            console.log("No cloud transcript found");
          }
        }
      } catch (error) {
        console.error("Failed to fetch transcript:", error)
        setFetchError("Failed to fetch data: " + String(error));
      } finally {
        setIsLoadingTranscript(false)
      }
    }
    
    fetchTranscript()
  }, [recording.id, isLocal])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleDownload = () => {
    // Use the local audio URL for local recordings
    const url = isLocal ? localAudioUrl : audioUrl
    if (url) {
      const a = document.createElement("a")
      a.href = url
      a.download = `${isLocal && localRecording ? localRecording.name : recording.name}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    try {
      // This would typically update the is_public flag in the database
      // For now, we'll just simulate the action
      setTimeout(() => {
        setIsSharing(false)
      }, 1000)
    } catch (error) {
      console.error("Error sharing recording:", error)
      setIsSharing(false)
    }
  }

  const handleDownloadTranscript = () => {
    if (!transcript?.full_text) return;
    
    // Create a blob with the transcript text
    const blob = new Blob([transcript.full_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger click
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isLocal && localRecording ? localRecording.name : recording.name}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleProcessingComplete = () => {
    // Reload the component after processing is complete
    window.location.reload();
  };

  // Determine the actual recording name to display
  const displayName = isLocal && localRecording ? localRecording.name : recording.name;
  // Determine if processing is needed
  const showProcessor = needsProcessing || (!isLocal && !transcript && !recording.is_processed);
  // Get the correct duration
  const duration = isLocal && localRecording ? localRecording.durationSeconds : recording.duration_seconds;
  // Get the correct creation date
  const creationDate = isLocal && localRecording ? localRecording.createdAt : recording.created_at;
  // Get the correct is_processed status
  const isProcessed = isLocal && localRecording ? localRecording.isProcessed : recording.is_processed;
  // Get the correct is_public status
  const isPublic = isLocal && localRecording ? localRecording.isPublic : recording.is_public;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-800">
          <h3 className="font-medium mb-1">Error loading recording</h3>
          <p className="text-sm">{fetchError}</p>
        </div>
      )}
      
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <MediaPlayer audioUrl={isLocal ? localAudioUrl : audioUrl} />

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{formatDuration(duration)}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(creationDate), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="mt-1">{localRecording?.description || recording.description || "No description provided"}</p>
              </div>

              <div className="flex flex-col space-y-2">
                <Button onClick={handleDownload} className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Recording
                </Button>
                <Button
                  onClick={handleShare}
                  className="w-full"
                  variant={isPublic ? "default" : "outline"}
                  disabled={isSharing}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {isPublic ? "Public" : "Make Public"}
                </Button>
                <Button 
                  onClick={handleDownloadTranscript} 
                  className="w-full" 
                  variant="outline"
                  disabled={!transcript?.full_text}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download Transcript
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showProcessor ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Process Recording</h3>
            <TranscriptionProcessor 
              recordingId={recording.id} 
              audioUrl={isLocal ? localAudioUrl : audioUrl}
              isLocal={isLocal}
              onComplete={handleProcessingComplete}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="transcript">
              <TabsList className="mb-4">
                <TabsTrigger value="transcript" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Transcript
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript">
                {isLoadingTranscript ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-pulse space-y-3 w-full">
                      <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                      <div className="h-4 bg-primary/20 rounded w-full"></div>
                      <div className="h-4 bg-primary/20 rounded w-5/6"></div>
                      <div className="h-4 bg-primary/20 rounded w-4/5"></div>
                    </div>
                  </div>
                ) : transcript ? (
                  <div className="space-y-4">
                    <div className="flex justify-end mb-2">
                      <Button 
                        onClick={handleDownloadTranscript} 
                        size="sm" 
                        variant="ghost"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="space-y-2">
                        {transcript.full_text.split('\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !isProcessed ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">This recording hasn't been processed yet.</p>
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline"
                    >
                      Process Recording
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No transcript available for this recording.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
// Export as default
export default RecordingDetails

