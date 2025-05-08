import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import RecordingDetails from "@/components/recording-details"
import TranscriptionProcessor from "@/components/transcription-processor"
import * as r2ServiceServer from "@/lib/cloudflare/r2-service-server"
import { getSupabaseServerClient } from "@/lib/supabase"

interface PageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Ensure we're using fully resolved params object
  const id = params.id
  
  // Get the storage location from the cookie
  const cookieValue = cookies().get("storageLocation")?.value
  const storageLocation = cookieValue || "cloud"

  if (storageLocation === "local") {
    return {
      title: "Local Recording | TalkAdvantage",
      description: "View and analyze your local recording with TalkAdvantage",
    }
  }

  const supabase = await getSupabaseServerClient()
  const { data: recording } = await supabase.from("recordings").select("name").eq("id", id).single()

  return {
    title: recording ? `${recording.name} | TalkAdvantage` : "Recording | TalkAdvantage",
    description: "View and analyze your recording with TalkAdvantage",
  }
}

export default async function RecordingPage({ params }: PageProps) {
  // Ensure we're using fully resolved params object
  const id = params.id
  
  // Get the storage location from the cookie
  const cookieValue = cookies().get("storageLocation")?.value
  const storageLocation = cookieValue || "cloud"

  // Handle local storage
  if (storageLocation === "local") {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Recording Details</h1>
        <RecordingDetails 
          recording={{ 
            id, 
            name: "Local Recording", // This will be updated client-side
            description: null,
            duration_seconds: 0,
            created_at: new Date().toISOString(),
            is_processed: false,
            is_public: false
          }} 
          audioUrl="" 
          isLocal={true} 
        />
      </div>
    )
  }

  // Handle cloud storage (existing code)
  const supabase = await getSupabaseServerClient()

  // Get recording details
  const { data: recording, error } = await supabase.from("recordings").select("*").eq("id", id).single()

  if (error || !recording) {
    notFound()
  }

  // Check if transcript exists
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("id")
    .eq("recording_id", id)
    .maybeSingle()

  const hasTranscript = !!transcript
  
  // Get the audio URL for the recording using the server version of the function
  const audioUrl = await r2ServiceServer.getFileUrl(recording.storage_path);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Recording Details</h1>

      {!hasTranscript && !recording.is_processed ? (
        <div className="mb-8">
          <TranscriptionProcessor
            recordingId={id}
          />
        </div>
      ) : (
        <RecordingDetails recording={recording} audioUrl={audioUrl} />
      )}
    </div>
  )
}
