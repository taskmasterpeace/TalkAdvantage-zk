"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileAudio, AlertCircle, CheckCircle2, X } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useFileUpload } from "@/hooks/use-file-upload"
import type { CreateRecordingParams } from "@/types/recording"

export default function UploadRecording() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Use our custom hook for file upload logic
  const { file, fileInputRef, uploading, progress, error, handleFileChange, uploadFile, resetFile } = useFileUpload({
    maxSizeMB: 100,
    allowedTypes: ["audio/"],
  })

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = handleFileChange(e)

    // Auto-fill name with file name (without extension)
    if (selectedFile && !name) {
      const fileName = selectedFile.name.split(".").slice(0, -1).join(".")
      setName(fileName)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a file to upload",
      })
      return
    }

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name for the recording",
      })
      return
    }

    try {
      const supabase = getSupabaseClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Upload file to storage
      const result = await uploadFile(user.id)

      if (!result) {
        return // Error already handled in hook
      }

      // Create recording entry in database
      const recordingParams: CreateRecordingParams = {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      }

      const { data: recording, error: dbError } = await supabase
        .from("recordings")
        .insert({
          user_id: user.id,
          name: recordingParams.name,
          description: recordingParams.description || null,
          duration_seconds: 0, // Will be updated after processing
          storage_path: result.filePath,
          is_public: recordingParams.isPublic,
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Error creating recording entry: ${dbError.message}`)
      }

      setSuccess(true)
      setRecordingId(recording.id)

      toast({
        title: "Upload successful",
        description: "Your recording has been uploaded successfully",
      })

      // Redirect to recording page after a short delay
      setTimeout(() => {
        router.push(`/dashboard/recordings/${recording.id}`)
      }, 2000)
    } catch (err) {
      console.error("Upload error:", err)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
      })
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="file">Audio File</Label>
            <input
              type="file"
              id="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept="audio/*"
              className="hidden"
              aria-label="Upload audio file"
            />

            {!file ? (
              <div
                onClick={handleSelectFile}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleSelectFile()}
                aria-label="Click to upload audio file"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <h3 className="font-medium">Click to upload or drag and drop</h3>
                  <p className="text-sm text-muted-foreground">MP3, WAV, M4A, FLAC up to 100MB</p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="h-8 w-8 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetFile}
                    disabled={uploading}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Recording Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recording Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this recording"
                required
                disabled={uploading}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this recording"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={uploading}
                aria-label="Make recording public"
              />
              <Label htmlFor="public">Make this recording public</Label>
            </div>
          </div>

          {/* Progress and Status */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Upload Progress</Label>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" aria-label={`Upload progress: ${progress}%`} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
              <AlertTitle className="text-green-600 dark:text-green-400">Success</AlertTitle>
              <AlertDescription>
                Your recording has been uploaded successfully. Redirecting to recording page...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={uploading || !file || success}
              className="w-full sm:w-auto"
              aria-busy={uploading}
            >
              {uploading ? "Uploading..." : "Upload Recording"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
