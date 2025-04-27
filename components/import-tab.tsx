"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, File, X, AlertCircle, FileAudio, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function ImportTab() {
  const [sourceType, setSourceType] = useState("file")
  const [service, setService] = useState("assemblyai")
  const [path, setPath] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [enableTimestamps, setEnableTimestamps] = useState(true)
  const [enableSpeakerDetection, setEnableSpeakerDetection] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [transcriptionResults, setTranscriptionResults] = useState<
    Array<{
      fileName: string
      transcriptId: string
      status: string
      transcript?: string
      summary?: string
      sentiment?: any
      topics?: any
    }>
  >([])

  // Add new state variables for additional features
  const [enableSentimentAnalysis, setEnableSentimentAnalysis] = useState(false)
  const [enableTopicDetection, setEnableTopicDetection] = useState(false)
  const [enableSummarization, setEnableSummarization] = useState(false)
  const [summaryType, setSummaryType] = useState<"bullets" | "paragraph" | "headline">("bullets")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles([...selectedFiles, ...newFiles])
      setPath(newFiles[0].name) // Update path with first file name for display
    }
  }

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)
    if (newFiles.length === 0) {
      setPath("")
    }
  }

  const handleProcess = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to process")
      return
    }

    setError(null)
    setIsProcessing(true)
    setProgress(0)

    try {
      // Process each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("speakerLabels", enableSpeakerDetection.toString())
        formData.append("timestamps", enableTimestamps.toString())
        formData.append("sentimentAnalysis", enableSentimentAnalysis.toString())
        formData.append("topicDetection", enableTopicDetection.toString())
        formData.append("summarization", enableSummarization.toString())
        formData.append("summaryType", summaryType)

        // Update progress for file upload
        setProgress((i / selectedFiles.length) * 50)

        // Send the file for transcription
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to transcribe ${file.name}`)
        }

        const data = await response.json()

        // Add the result to our state
        setTranscriptionResults((prev) => [
          ...prev,
          {
            fileName: file.name,
            transcriptId: data.transcriptId,
            status: "completed",
            transcript: data.transcript,
            summary: data.summary,
            sentiment: data.sentiment,
            topics: data.topics,
          },
        ])

        // Update progress
        setProgress(((i + 1) / selectedFiles.length) * 100)
      }

      toast({
        title: "Transcription complete",
        description: `Successfully transcribed ${selectedFiles.length} file(s)`,
      })
    } catch (err) {
      console.error("Error processing files:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        variant: "destructive",
        title: "Transcription failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
      })
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  const handleCancel = () => {
    setIsProcessing(false)
    setProgress(0)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Import Audio Files</h2>

        {/* Source Selection */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Source</h3>
            <RadioGroup value={sourceType} onValueChange={setSourceType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="file" />
                <Label htmlFor="file">File(s)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="folder" id="folder" disabled />
                <Label htmlFor="folder" className="text-muted-foreground">
                  Folder (Coming soon)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">{sourceType === "file" ? "File Path" : "Folder Path"}</Label>
            <div className="flex gap-2">
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={sourceType === "file" ? "Select audio file(s)" : "/path/to/folder"}
                className="flex-1"
                readOnly
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="audio/*"
                multiple
              />
              <Button variant="outline" className="flex items-center gap-2" onClick={handleFileSelect}>
                {sourceType === "file" ? <File className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                <span>Select {sourceType === "file" ? "File(s)" : "Folder"}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transcription Service</h3>
              <RadioGroup value={service} onValueChange={setService} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assemblyai" id="assemblyai" />
                  <Label htmlFor="assemblyai">AssemblyAI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai" id="openai" disabled />
                  <Label htmlFor="openai" className="text-muted-foreground">
                    OpenAI Whisper (Coming soon)
                  </Label>
                </div>
              </RadioGroup>

              <div className="space-y-2 mt-4">
                <Label htmlFor="model">Model</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {service === "assemblyai" ? (
                      <>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="enhanced">Enhanced</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="whisper-1">Whisper-1</SelectItem>
                        <SelectItem value="whisper-large">Whisper Large</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Features</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="timestamps">Include Timestamps</Label>
                  <Switch id="timestamps" checked={enableTimestamps} onCheckedChange={setEnableTimestamps} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="speaker-detection">Speaker Detection</Label>
                  <Switch
                    id="speaker-detection"
                    checked={enableSpeakerDetection}
                    onCheckedChange={setEnableSpeakerDetection}
                  />
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h4 className="font-medium">Advanced Features</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sentiment-analysis">Sentiment Analysis</Label>
                    <Switch
                      id="sentiment-analysis"
                      checked={enableSentimentAnalysis}
                      onCheckedChange={setEnableSentimentAnalysis}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="topic-detection">Topic Detection</Label>
                    <Switch
                      id="topic-detection"
                      checked={enableTopicDetection}
                      onCheckedChange={setEnableTopicDetection}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="summarization">Summarization</Label>
                    <Switch id="summarization" checked={enableSummarization} onCheckedChange={setEnableSummarization} />
                  </div>

                  {enableSummarization && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="summary-type">Summary Type</Label>
                      <Select value={summaryType} onValueChange={(value) => setSummaryType(value as any)}>
                        <SelectTrigger id="summary-type">
                          <SelectValue placeholder="Select summary type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bullets">Bullet Points</SelectItem>
                          <SelectItem value="paragraph">Paragraph</SelectItem>
                          <SelectItem value="headline">Headline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="naming">File Naming</Label>
                <Select defaultValue="original">
                  <SelectTrigger id="naming">
                    <SelectValue placeholder="Select naming convention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original filename</SelectItem>
                    <SelectItem value="date">Date + Original filename</SelectItem>
                    <SelectItem value="custom">Custom pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Progress Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Progress</h2>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Status</Label>
              <span className="text-sm font-medium">
                {!isProcessing && progress === 0 && "Ready"}
                {isProcessing && "Processing..."}
                {!isProcessing && progress === 100 && "Complete"}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {isProcessing && <p className="text-sm text-muted-foreground text-right">{progress.toFixed(0)}%</p>}
          </div>

          <div className="space-y-2">
            <Label>Files</Label>
            <div className="border rounded-md overflow-hidden">
              {selectedFiles.length > 0 ? (
                <div className="max-h-[200px] overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`file-${index}`} className="text-sm cursor-pointer">
                          {file.name}
                        </Label>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">No files selected</div>
              )}
            </div>
          </div>

          {transcriptionResults.length > 0 && (
            <div className="space-y-2">
              <Label>Transcription Results</Label>
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  {transcriptionResults.map((result, index) => (
                    <div key={index} className="p-3 border-b last:border-b-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          {result.fileName}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          {result.status}
                        </span>
                      </div>
                      {result.transcript && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{result.transcript}</div>
                      )}
                      {result.summary && (
                        <div className="mt-2 border-t pt-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Summary:</h5>
                          <p className="text-sm mt-1">{result.summary}</p>
                        </div>
                      )}
                      {result.sentiment && result.sentiment.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Overall Sentiment:</h5>
                          <div className="flex gap-2 mt-1">
                            {result.sentiment.some((s) => s.sentiment === "POSITIVE") && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Positive
                              </span>
                            )}
                            {result.sentiment.some((s) => s.sentiment === "NEGATIVE") && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">Negative</span>
                            )}
                            {result.sentiment.some((s) => s.sentiment === "NEUTRAL") && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Neutral</span>
                            )}
                          </div>
                        </div>
                      )}
                      {result.topics && result.topics.results && result.topics.results.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Topics:</h5>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.topics.results.slice(0, 3).map((topic, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                {topic.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel}>
                Cancel
              </Button>
            ) : (
              <Button onClick={handleProcess} disabled={selectedFiles.length === 0}>
                Process
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
