export const FILE_UPLOAD_LIMITS = {
  AUDIO: {
    MAX_SIZE_MB: 100,
    ALLOWED_TYPES: ["audio/mp3", "audio/wav", "audio/mpeg", "audio/m4a", "audio/flac"],
    STORAGE_BUCKET: "audio-files",
    STORAGE_FOLDER: "recordings",
  },
}

export const TRANSCRIPTION_OPTIONS = {
  DEFAULT_SUMMARY_TYPE: "bullets" as const,
  POLLING_INTERVAL_MS: 5000,
  MAX_POLLING_ATTEMPTS: 60, // 5 minutes max
}

export const ROUTES = {
  DASHBOARD: "/dashboard",
  RECORDINGS: "/dashboard/recordings",
  RECORDING_DETAILS: (id: string) => `/dashboard/recordings/${id}`,
  UPLOAD: "/dashboard/recordings/upload",
}
