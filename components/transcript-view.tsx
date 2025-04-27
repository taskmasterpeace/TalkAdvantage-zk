"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface Transcript {
  id: string
  recording_id: string
  full_text: string | null
}

interface TranscriptSegment {
  id: string
  transcript_id: string
  speaker: string | null
  start_ms: number
  end_ms: number
  text: string
}

interface TranscriptViewProps {
  transcript: Transcript
  segments: TranscriptSegment[]
}

export function TranscriptView({ transcript, segments }: TranscriptViewProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const filteredSegments = searchTerm
    ? segments.filter(
        (segment) =>
          segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (segment.speaker && segment.speaker.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : segments

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Input
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {filteredSegments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transcript segments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSegments.map((segment) => (
              <div key={segment.id} className="flex">
                <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
                  {formatTimestamp(segment.start_ms)}
                </div>
                <div className="flex-1">
                  {segment.speaker && <div className="font-medium text-sm">{segment.speaker}</div>}
                  <div>{segment.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
