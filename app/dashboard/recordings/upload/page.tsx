import type { Metadata } from "next"
import UploadRecording from "@/components/upload-recording"

export const metadata: Metadata = {
  title: "Upload Recording | TalkAdvantage",
  description: "Upload a new audio recording to analyze with TalkAdvantage",
}

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Recording</h1>
      <UploadRecording />
    </div>
  )
}
