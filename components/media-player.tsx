"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX } from "lucide-react"

interface MediaPlayerProps {
  showBookmarks?: boolean
  audioUrl?: string
}

export default function MediaPlayer({ showBookmarks = false, audioUrl }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")

  // Simulate playback
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 1 * Number.parseFloat(playbackSpeed)
          if (newTime >= duration) {
            setIsPlaying(false)
            return duration
          }
          return newTime
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isPlaying, duration, playbackSpeed])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0])
    if (value[0] >= duration) {
      setIsPlaying(false)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (value[0] === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Demo bookmarks
  const bookmarks: any[] = []

  return (
    <div className="space-y-4">
      {/* Waveform visualization */}
      <div className="relative h-16 bg-muted/30 rounded-md overflow-hidden">
        {/* Empty waveform */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No audio loaded</div>

        {/* Progress indicator - keep this for UI consistency */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Bookmarks - empty array now */}
        {showBookmarks &&
          bookmarks.map((bookmark, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-1 bg-red-500"
              style={{ left: `${(bookmark.time / duration) * 100}%` }}
              title={bookmark.label}
            >
              <div className="absolute top-0 h-2 w-2 bg-red-500 rounded-full -translate-x-[3px] -translate-y-[3px]" />
            </div>
          ))}

        {/* Clickable area */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pos = (e.clientX - rect.left) / rect.width
            setCurrentTime(pos * duration)
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={togglePlayback}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 mx-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider value={[currentTime]} min={0} max={duration} step={1} onValueChange={handleSeek} className="h-1" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : volume < 50 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-20 h-1"
          />
          <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue placeholder="Speed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// Add named export
export { MediaPlayer }
