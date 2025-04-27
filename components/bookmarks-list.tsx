"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Edit, Trash2 } from "lucide-react"

interface BookmarkType {
  id: string
  recording_id: string
  user_id: string
  time_ms: number
  name: string
  note: string | null
  bookmark_type: string
  created_at: string
}

interface BookmarksListProps {
  bookmarks: BookmarkType[]
}

export function BookmarksList({ bookmarks }: BookmarksListProps) {
  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getBookmarkTypeColor = (type: string) => {
    switch (type) {
      case "important":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "question":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "action":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "follow-up":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "insight":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
            <p className="mt-2 text-muted-foreground">No bookmarks found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex items-start p-4 border rounded-md">
                <div className="flex-shrink-0 mr-4">
                  <Button variant="outline" size="sm">
                    {formatTimestamp(bookmark.time_ms)}
                  </Button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium">{bookmark.name}</h3>
                    <Badge className={getBookmarkTypeColor(bookmark.bookmark_type)}>{bookmark.bookmark_type}</Badge>
                  </div>
                  {bookmark.note && <p className="text-sm text-muted-foreground">{bookmark.note}</p>}
                </div>
                <div className="flex-shrink-0 flex space-x-1">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
