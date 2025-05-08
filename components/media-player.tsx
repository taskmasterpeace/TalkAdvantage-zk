"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX } from "lucide-react"

interface MediaPlayerProps {
  showBookmarks?: boolean
  audioUrl?: string
}

export function MediaPlayer({ showBookmarks = false, audioUrl }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return
    
    // Reset states
    setCurrentTime(0)
    setDuration(0)
    setAudioReady(false)
    setIsPlaying(false)
    
    // Create audio element
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    
    // Set up event listeners
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
        setAudioReady(true)
      }
    }
    
    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime) && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    const handleCanPlay = () => {
      setAudioReady(true)
      drawDefaultWaveform()
    }
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    
    // Set initial volume
    audio.volume = volume / 100
    
    // Cleanup function
    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [audioUrl])
  
  // Draw a default waveform
  const drawDefaultWaveform = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Generate simple random waveform
    const numBars = 150
    const barData = Array(numBars).fill(0).map(() => Math.random() * 0.5 + 0.1)
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Set style
    ctx.fillStyle = 'rgba(79, 70, 229, 0.6)' // Indigo color with opacity
    
    // Calculate bar width with small gap
    const barWidth = canvas.width / numBars * 0.8
    const gap = canvas.width / numBars * 0.2
    
    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const barHeight = barData[i] * canvas.height * 0.8
      const x = i * (barWidth + gap)
      const y = (canvas.height - barHeight) / 2
      
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }
  
  // Update waveform visualization based on playback
  useEffect(() => {
    if (!canvasRef.current || !audioReady || duration <= 0) return
    
    // Draw waveform with progress indicator
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const progressPercent = currentTime / duration
    const numBars = 150
    
    // Generate simple random waveform (consistent using index-based seed)
    const barData = Array(numBars).fill(0).map((_, i) => {
      // Create a deterministic pattern based on index
      return 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(i * 0.2))
    })
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Calculate bar width with small gap
    const barWidth = canvas.width / numBars * 0.8
    const gap = canvas.width / numBars * 0.2
    
    // Calculate progress index
    const progressIndex = Math.floor(progressPercent * numBars)
    
    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const barHeight = barData[i] * canvas.height * 0.8
      const x = i * (barWidth + gap)
      const y = (canvas.height - barHeight) / 2
      
      // Set color based on progress
      if (i <= progressIndex) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.9)' // Played portion
      } else {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.3)' // Unplayed portion
      }
      
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }, [currentTime, duration, audioReady])
  
  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current || !audioReady) return
    
    if (isPlaying) {
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Error playing audio:", err)
          setIsPlaying(false)
        })
      }
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, audioReady])
  
  // Handle playback speed changes
  useEffect(() => {
    if (!audioRef.current || !audioReady) return
    audioRef.current.playbackRate = Number.parseFloat(playbackSpeed)
  }, [playbackSpeed, audioReady])
  
  // Handle volume and mute changes
  useEffect(() => {
    if (!audioRef.current || !audioReady) return
    
    if (isMuted) {
      audioRef.current.volume = 0
    } else {
      audioRef.current.volume = volume / 100
    }
  }, [volume, isMuted, audioReady])

  const togglePlayback = () => {
    if (!audioReady) return
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !audioReady || !duration) return
    
    const newTime = value[0]
    if (isNaN(newTime) || !isFinite(newTime)) {
      return
    }
    
    // Ensure time is within valid range
    const validTime = Math.min(Math.max(0, newTime), duration)
    
    setCurrentTime(validTime)
    try {
      audioRef.current.currentTime = validTime
    } catch (error) {
      console.error("Error setting current time:", error)
    }
    
    if (validTime >= duration) {
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

  const skipForward = () => {
    if (!audioRef.current || !audioReady || !duration) return
    
    try {
      const newTime = Math.min(Math.max(0, audioRef.current.currentTime + 10), duration)
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    } catch (error) {
      console.error("Error skipping forward:", error)
    }
  }
  
  const skipBackward = () => {
    if (!audioRef.current || !audioReady) return
    
    try {
      const newTime = Math.max(audioRef.current.currentTime - 10, 0)
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    } catch (error) {
      console.error("Error skipping backward:", error)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Demo bookmarks
  const bookmarks: any[] = []

  // Calculate slider max value
  const sliderMax = duration > 0 && isFinite(duration) ? duration : 100

  return (
    <div className="space-y-4">
      {/* Waveform visualization */}
      <div className="relative h-16 bg-muted/30 rounded-md overflow-hidden">
        {/* Empty waveform or loading state */}
        {!audioReady && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {audioUrl ? "Loading audio..." : "No audio loaded"}
          </div>
        )}

        {/* Canvas for waveform */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full" 
          width={600} 
          height={64}
        />

        {/* Progress indicator - thin line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
          style={{ left: `${duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0}%` }}
        />

        {/* Bookmarks */}
        {showBookmarks &&
          bookmarks.map((bookmark, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-1 bg-red-500 z-20"
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
            if (!audioReady || !audioRef.current || !duration) return
            
            try {
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = (e.clientX - rect.left) / rect.width
              const newTime = pos * duration
              
              if (isFinite(newTime)) {
                setCurrentTime(newTime)
                audioRef.current.currentTime = newTime
              }
            } catch (error) {
              console.error("Error seeking in waveform:", error)
            }
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBackward} disabled={!audioReady}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 rounded-full" 
            onClick={togglePlayback}
            disabled={!audioReady}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward} disabled={!audioReady}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 mx-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider 
            value={[isNaN(currentTime) || !isFinite(currentTime) ? 0 : currentTime]} 
            min={0} 
            max={sliderMax} 
            step={0.1} 
            onValueChange={handleSeek} 
            className="h-1" 
            disabled={!audioReady}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute} disabled={!audioReady}>
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
            disabled={!audioReady}
          />
          <Select value={playbackSpeed} onValueChange={setPlaybackSpeed} disabled={!audioReady}>
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

// Add default export that references the named export
export default MediaPlayer
