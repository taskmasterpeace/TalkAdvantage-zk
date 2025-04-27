"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { FileAudio, Search, Plus, Clock, Calendar } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"

interface Recording {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  createdAt: string
  isProcessed: boolean
}

export function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function fetchRecordings() {
      try {
        const supabase = getSupabaseClient()

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("User not authenticated")
        }

        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        const formattedRecordings = data.map((recording) => ({
          id: recording.id,
          name: recording.name,
          description: recording.description,
          durationSeconds: recording.duration_seconds,
          createdAt: recording.created_at,
          isProcessed: recording.is_processed,
        }))

        setRecordings(formattedRecordings)
      } catch (error) {
        console.error("Error fetching recordings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecordings()
  }, [])

  const filteredRecordings = recordings.filter(
    (recording) =>
      recording.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recording.description && recording.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recordings..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => router.push("/dashboard/recordings/upload")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Upload Recording
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <div className="flex items-center gap-4 mt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecordings.length > 0 ? (
        <div className="space-y-4">
          {filteredRecordings.map((recording) => (
            <Link href={`/dashboard/recordings/${recording.id}`} key={recording.id}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <FileAudio className="h-5 w-5 text-primary" />
                    {recording.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recording.description && (
                    <p className="text-sm text-muted-foreground mb-2">{recording.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {recording.durationSeconds > 0 ? formatDuration(recording.durationSeconds) : "Processing..."}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No recordings found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "No recordings match your search query" : "Upload your first recording to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push("/dashboard/recordings/upload")}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Recording
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Add default export that references the named export
export default RecordingsList
