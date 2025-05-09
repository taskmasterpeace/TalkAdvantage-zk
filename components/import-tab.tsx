"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, File, X, AlertCircle, FileAudio, Brain, Heart, ListTree } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { unifiedRecordingsService } from "@/lib/recordings-service"

interface ImportFile {
  file: File
  id: string
  name: string
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  recordingId?: string
}

export default function ImportTab() {
  // State
  const [files, setFiles] = useState<ImportFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Transcription options
  const [enableSpeakerDetection, setEnableSpeakerDetection] = useState(true)
  const [enableTimestamps, setEnableTimestamps] = useState(true)
  const [enableSummarization, setEnableSummarization] = useState(true)
  const [enableSentimentAnalysis, setEnableSentimentAnalysis] = useState(false)
  const [enableTopicDetection, setEnableTopicDetection] = useState(false)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Hooks
  const { toast } = useToast()

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    const newFiles: ImportFile[] = Array.from(event.target.files).map(file => ({
      file,
      id: crypto.randomUUID(),
      name: file.name,
      status: 'queued',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
    
    // Reset input
    event.target.value = ''
  }

  // Remove file from queue
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // Process a single file
  const processFile = async (file: ImportFile): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'uploading', progress: 0 } 
          : f
      ))

      // Get current user
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("You must be logged in to import recordings")
      }

      // Upload the recording using unified service
      const recording = await unifiedRecordingsService.createRecording(user.id, file.file, {
        name: file.name,
        description: `Imported recording: ${file.name}`,
        durationSeconds: 0, // Will be updated after processing
        isPublic: false
      })

      // Update file status with recording ID
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, recordingId: recording.id, progress: 30 } 
          : f
      ))

      // Prepare transcription options
      const formData = new FormData()
      formData.append('recordingId', recording.id)
      formData.append('speakerLabels', enableSpeakerDetection.toString())
      formData.append('timestamps', enableTimestamps.toString())
      formData.append('summarization', enableSummarization.toString())
      formData.append('sentimentAnalysis', enableSentimentAnalysis.toString())
      formData.append('topicDetection', enableTopicDetection.toString())
      formData.append('file', file.file)

      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'processing', progress: 50 } 
          : f
      ))

      // Start AssemblyAI transcription
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Transcription failed')
      }

      const result = await response.json()

      // Update file status to completed
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'completed', progress: 100 } 
          : f
      ))

      toast({
        title: "File Processed Successfully",
        description: `${file.name} has been processed with AssemblyAI.`
      })

    } catch (error) {
      console.error("Error processing file:", error)
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            } 
          : f
      ))

      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process file"
      })
    }
  }

  // Process all files
  const processAllFiles = async () => {
    setIsProcessing(true)
    
    try {
      const queuedFiles = files.filter(f => f.status === 'queued')
      
      for (const file of queuedFiles) {
        await processFile(file)
      }

      // Show success message
      toast({
        title: "Import Complete",
        description: `Successfully imported ${queuedFiles.length} file(s) with AssemblyAI.`,
        variant: "default"
      })

      // Clear all files after successful import
      setTimeout(() => {
        setFiles([])
      }, 1500) // Give user time to see completion status

    } catch (error) {
      console.error("Error processing files:", error)
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to process files"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Import Recordings</h2>
          <p className="text-muted-foreground">
            Import audio files for transcription with AssemblyAI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <File className="mr-2 h-4 w-4" />
            Add Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Storage Info */}
      <Alert>
        <FileAudio className="h-4 w-4" />
        <AlertTitle>Storage Mode</AlertTitle>
        <AlertDescription>
          Files will be stored {unifiedRecordingsService.isLocalStorage() ? 'locally' : 'in the cloud'} and processed using AssemblyAI for transcription.
        </AlertDescription>
      </Alert>

      {/* Transcription Options */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Transcription Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <Label htmlFor="speaker-detection">Speaker Detection</Label>
            </div>
            <Switch
              id="speaker-detection"
              checked={enableSpeakerDetection}
              onCheckedChange={setEnableSpeakerDetection}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-blue-500" />
              <Label htmlFor="timestamps">Word Timestamps</Label>
            </div>
            <Switch
              id="timestamps"
              checked={enableTimestamps}
              onCheckedChange={setEnableTimestamps}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-blue-500" />
              <Label htmlFor="summary">Generate Summary</Label>
            </div>
            <Switch
              id="summary"
              checked={enableSummarization}
              onCheckedChange={setEnableSummarization}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-blue-500" />
              <Label htmlFor="sentiment">Sentiment Analysis</Label>
            </div>
            <Switch
              id="sentiment"
              checked={enableSentimentAnalysis}
              onCheckedChange={setEnableSentimentAnalysis}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-blue-500" />
              <Label htmlFor="topics">Topic Detection</Label>
            </div>
            <Switch
              id="topics"
              checked={enableTopicDetection}
              onCheckedChange={setEnableTopicDetection}
            />
          </div>
        </div>
      </Card>

      {/* File List */}
      <Card className="p-6">
        <div className="space-y-4">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <FileAudio className="h-16 w-16 mb-4 opacity-20" />
              <p>No files selected</p>
              <p className="text-sm mt-2">Click "Add Files" to begin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(file.file.size / 1024 / 1024 * 100) / 100} MB)
                      </span>
                    </div>
                    
                    {file.status !== 'queued' && (
                      <div className="mt-2">
                        <Progress value={file.progress} className="h-1" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {file.status === 'uploading' && 'Uploading...'}
                            {file.status === 'processing' && 'Processing with AssemblyAI...'}
                            {file.status === 'completed' && 'Completed'}
                            {file.status === 'failed' && 'Failed'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {file.progress}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {file.error && (
                      <div className="mt-2 text-xs text-red-500">
                        Error: {file.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {files.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={isProcessing}
              >
                Clear All
              </Button>
              <Button
                onClick={processAllFiles}
                disabled={isProcessing || !files.some(f => f.status === 'queued')}
              >
                {isProcessing ? 'Processing...' : 'Process All'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
