import type { Metadata } from "next"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import RecordingDetails from "@/components/recording-details"
import TranscriptionProcessor from "@/components/transcription-processor"

interface PageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerComponentClient({ cookies })

  const { data: recording } = await supabase.from("recordings").select("name").eq("id", params.id).single()

  return {
    title: recording ? `${recording.name} | TalkAdvantage` : "Recording | TalkAdvantage",
    description: "View and analyze your recording with TalkAdvantage",
  }
}

export default async function RecordingPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies })

  // Get recording details
  const { data: recording, error } = await supabase.from("recordings").select("*").eq("id", params.id).single()

  if (error || !recording) {
    notFound()
  }

  // Check if transcript exists
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("id")
    .eq("recording_id", params.id)
    .maybeSingle()

  const hasTranscript = !!transcript

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Recording Details</h1>

      {!hasTranscript && !recording.is_processed ? (
        <div className="mb-8">
          <TranscriptionProcessor
            recordingId={params.id}
            onComplete={() => {
              // This will be handled client-side
            }}
          />
        </div>
      ) : (
        <RecordingDetails recordingId={params.id} />
      )}
    </div>
  )
}
