"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Pause, Play, Settings } from "lucide-react"
import { LiveListener } from "./live-listener"
import { ExpansionDisplay } from "./expansion-display"
import { useTrackingStore } from "@/lib/store/tracking-store"

export function TrackingMode() {
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const { isTracking, startTracking, stopTracking } = useTrackingStore()

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking()
      setIsPaused(false)
    } else {
      startTracking()
    }
    setIsActive(!isActive)
  }

  const handleTogglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant={isActive ? "default" : "outline"} size="sm" onClick={handleToggleTracking} className="gap-2">
            {isActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isActive ? "Stop Tracking" : "Start Tracking"}
          </Button>
          {isActive && (
            <Button variant="outline" size="sm" onClick={handleTogglePause} className="gap-2">
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isActive ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <LiveListener isActive={isActive && !isPaused} />
            </div>
            <div className="flex-1 overflow-auto">
              <ExpansionDisplay />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Tracking Mode</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Start tracking to get real-time suggestions, follow-up questions, examples, and reflections as you speak.
            </p>
            <Button onClick={() => setIsActive(true)}>Start Tracking</Button>
          </div>
        )}
      </div>
    </div>
  )
}
