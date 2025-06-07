"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Clock, Zap } from "lucide-react"

interface AnalysisTimerProps {
  nextAnalysisTime: number
  isEnabled: boolean
  interval: string
  onComplete?: () => void
}

export function AnalysisTimer({ nextAnalysisTime, isEnabled, interval, onComplete }: AnalysisTimerProps) {
  const [progress, setProgress] = useState(100)
  const [isPulsing, setIsPulsing] = useState(false)

  // Get the total interval time in seconds
  const getTotalInterval = () => {
    if (interval.startsWith("time-")) {
      return parseInt(interval.split("-")[1])
    }
    return 60 // Default to 60 seconds
  }

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (!isEnabled) {
      setProgress(100)
      return
    }

    const totalInterval = getTotalInterval()
    const intervalId = setInterval(() => {
      setProgress((prev) => {
        const newProgress = (nextAnalysisTime / totalInterval) * 100
        if (newProgress <= 0) {
          onComplete?.()
          return 100
        }
        return newProgress
      })
    }, 100)

    // Add pulsing effect when close to completion
    if (nextAnalysisTime <= 5) {
      setIsPulsing(true)
    } else {
      setIsPulsing(false)
    }

    return () => clearInterval(intervalId)
  }, [nextAnalysisTime, isEnabled, interval, onComplete])

  if (!isEnabled) {
    return null
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-background to-muted/50 border-muted/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Next Analysis</span>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-mono",
            isPulsing && "animate-pulse text-primary"
          )}>
            <Zap className={cn("h-4 w-4", isPulsing && "text-primary")} />
            {formatTime(nextAnalysisTime)}
          </div>
        </div>
        
        <Progress 
          value={progress} 
          className={cn(
            "h-2",
            isPulsing && "animate-pulse"
          )}
        />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Interval: {interval.replace("time-", "")}s</span>
          <span className={cn(
            "transition-colors",
            isPulsing && "text-primary"
          )}>
            {isPulsing ? "Analyzing soon..." : "Recording in progress"}
          </span>
        </div>
      </div>
    </Card>
  )
} 