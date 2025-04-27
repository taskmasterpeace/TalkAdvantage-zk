"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRecordingManagement } from "@/hooks/use-recording-management"
import { useRecordingsStore, useUIStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export function RecordingManagement() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { recordings, isLoading: isLoadingRecordings } = useRecordingsStore()
  const { notifications, removeNotification } = useUIStore()
  const { isUploading, uploadProgress, uploadRecording, isProcessing, processRecording } = useRecordingManagement()

  // Fetch recordings on component mount
  useEffect(() => {
    useRecordingsStore.getState().fetchRecordings()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !name) return

    try {
      const recordingId = await uploadRecording(file, {
        name,
        description: description || undefined,
        isPublic,
      })

      // Reset form
      setName("")
      setDescription("")
      setIsPublic(false)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Optionally start processing immediately
      await processRecording(recordingId)
    } catch (error) {
      // Error is handled in the hook
      console.error("Upload failed:", error)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-white">
        <h2 className="text-xl font-semibold">Upload New Recording</h2>

        <div className="space-y-2">
          <Label htmlFor="file">Audio File</Label>
          <Input
            ref={fileInputRef}
            type="file"
            id="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={isUploading || isProcessing}
            className="cursor-pointer"
          />
          {file && (
            <p className="text-sm text-gray-500">
              Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isUploading || isProcessing}
            placeholder="Enter recording name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading || isProcessing}
            placeholder="Enter optional description"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={setIsPublic}
            disabled={isUploading || isProcessing}
          />
          <Label htmlFor="isPublic">Make recording public</Label>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Uploading...</span>
              <span className="text-sm font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-amber-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Processing recording...</span>
          </div>
        )}

        <Button type="submit" disabled={isUploading || isProcessing || !file || !name} className="w-full">
          {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Upload Recording"}
        </Button>
      </form>

      {/* Notifications */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg flex items-start justify-between ${
              notification.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : notification.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Recordings List */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="text-xl font-semibold mb-4">Your Recordings</h2>
        {isLoadingRecordings ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : recordings.length > 0 ? (
          <ul className="divide-y">
            {recordings.map((recording) => (
              <li key={recording.id} className="py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{recording.name}</h3>
                    {recording.description && <p className="text-sm text-gray-500">{recording.description}</p>}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {new Date(recording.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          recording.isProcessed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {recording.isProcessed ? "Processed" : "Processing"}
                      </span>
                      {recording.isPublic && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Public</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to recording details
                        window.location.href = `/dashboard/recordings/${recording.id}`
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No recordings yet. Upload your first recording above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
