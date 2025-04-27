"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MediaPlayer } from "@/components/media-player"
import { Clock, Calendar, Download, Share2 } from "lucide-react"

interface Recording {
  id: string
  name: string
  description: string | null
  duration_seconds: number
  created_at: string
  is_processed: boolean
  is_public: boolean
}

interface RecordingDetailsProps {
  recording: Recording
  audioUrl: string
}

export function RecordingDetails({ recording, audioUrl }: RecordingDetailsProps) {
  const [isSharing, setIsSharing] = useState(false)

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement("a")
      a.href = audioUrl
      a.download = `${recording.name}.mp3`
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <MediaPlayer audioUrl={audioUrl} />

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-4 w-4" />
                <span>{formatDuration(recording.duration_seconds)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-4 w-4" />
                <span>{formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="mt-1">{recording.description || "No description provided"}</p>
            </div>

            <div className="flex flex-col space-y-2">
              <Button onClick={handleDownload} className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Recording
              </Button>
              <Button
                onClick={handleShare}
                className="w-full"
                variant={recording.is_public ? "default" : "outline"}
                disabled={isSharing}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {recording.is_public ? "Public" : "Make Public"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Change to default export
export default RecordingDetails
