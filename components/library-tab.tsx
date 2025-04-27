"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react"
import MediaPlayer from "./media-player"

export default function LibraryTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [includeSubfolders, setIncludeSubfolders] = useState(false)
  const [includeLiveWorkspace, setIncludeLiveWorkspace] = useState(true)
  const [folderPath, setFolderPath] = useState("/Users/username/Documents/Recordings")

  const demoFiles: any[] = []

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border border-border bg-muted/20"></div>)
    }

    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      const isToday = new Date().toDateString() === date.toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()

      // Randomly determine if this date has recordings
      const hasRecordings = false
      const hasTranscripts = false

      days.push(
        <div
          key={`day-${i}`}
          className={`h-20 border border-border p-1 relative cursor-pointer hover:bg-muted/50 transition-colors
            ${isToday ? "bg-primary/10" : ""}
            ${isSelected ? "ring-2 ring-primary" : ""}
          `}
          onClick={() => setSelectedDate(date)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{i}</span>
            {hasRecordings && (
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" title="Has recordings"></span>
                {hasTranscripts && <span className="h-2 w-2 rounded-full bg-green-500" title="Has transcripts"></span>}
              </div>
            )}
          </div>
          {hasRecordings && (
            <div className="mt-2 text-xs text-muted-foreground">
              {Math.floor(Math.random() * 3) + 1} recording{Math.random() > 0.5 ? "s" : ""}
            </div>
          )}
        </div>,
      )
    }

    return days
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>Select Folder</span>
          </Button>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-subfolders"
              checked={includeSubfolders}
              onCheckedChange={(checked) => setIncludeSubfolders(checked as boolean)}
            />
            <Label htmlFor="include-subfolders">Include subfolders</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-live"
              checked={includeLiveWorkspace}
              onCheckedChange={(checked) => setIncludeLiveWorkspace(checked as boolean)}
            />
            <Label htmlFor="include-live">Live workspace</Label>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-md p-2 text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
        {folderPath}
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Calendar View */}
        <Card className="overflow-hidden">
          <div className="bg-muted p-2 flex items-center justify-between">
            <h3 className="font-medium">Calendar</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{formatMonth(currentMonth)}</span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            <div className="flex items-center justify-end gap-4 mt-4">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                <span className="text-xs text-muted-foreground">Recordings</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-xs text-muted-foreground">Transcripts</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Media Player */}
          <Card className="overflow-hidden">
            <div className="bg-muted p-2">
              <h3 className="font-medium">Media Player</h3>
            </div>
            <div className="p-4">
              <MediaPlayer />
            </div>
          </Card>

          {/* File Tabs */}
          <Card className="overflow-hidden flex-1">
            <Tabs defaultValue="by-date">
              <div className="bg-muted p-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="by-date">By Date</TabsTrigger>
                  <TabsTrigger value="all-files">All Files</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-2">
                <div className="relative mb-4">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search files..." className="pl-8" />
                </div>

                <TabsContent value="by-date" className="h-[300px] overflow-y-auto">
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {selectedDate ? "No recordings for this date" : "Select a date to view recordings"}
                  </div>
                </TabsContent>

                <TabsContent value="all-files" className="h-[300px] overflow-y-auto">
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No recordings found
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
