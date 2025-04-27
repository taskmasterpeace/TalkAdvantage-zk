export interface Recording {
  id: string
  userId: string
  name: string
  description?: string
  durationSeconds: number
  storagePath: string
  createdAt: string
  updatedAt: string
  isProcessed: boolean
  isPublic: boolean
}

export interface CreateRecordingParams {
  name: string
  description?: string
  durationSeconds?: number
  isPublic?: boolean
}

export interface TranscriptionOptions {
  speakerLabels: boolean
  timestamps: boolean
  sentimentAnalysis: boolean
  topicDetection: boolean
  summarization: boolean
  summaryType?: "bullets" | "paragraph" | "headline"
}

export interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "complete" | "error"
  progress: number
  message?: string
}
