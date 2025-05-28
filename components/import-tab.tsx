"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  FolderOpen, 
  FileIcon,
  X, 
  AlertCircle, 
  FileAudio, 
  Brain, 
  Heart, 
  ListTree,
  CheckCircle2,
  Clock,
  Upload as UploadIcon,
  FileCheck,
  FileX,
  FileQuestion,
  FileText,
  Tag as TagIcon
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { unifiedRecordingsService } from "@/lib/recordings-service"
import { indexedDBService, type LocalRecording } from "@/lib/indexeddb/indexed-db-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Tag types and constants
interface Tag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  { name: 'Red', value: 'red', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { name: 'Green', value: 'green', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
];

interface ImportFile {
  file: File
  id: string
  name: string
  formattedName: string
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  recordingId?: string
  transcriptFile?: File | null
  transcriptContent?: string | null
  tags?: Tag[]
  suggestedTags?: Tag[] // Add suggested tags from entity detection
}

// Regular expression for the correct filename format:
// YYMMDD_HHMMSS (e.g., 250513_210134)
// YYMMDD_HHMMSS_* (e.g., 250513_210134_ssss)
// YYMMDD_HHMM (e.g., 250513_2101)
// YYMMDD_HHMM_* (e.g., 250513_2101_something)
const FILENAME_FORMAT_REGEX = /^\d{6}_\d{6}$|^\d{6}_\d{6}_.*$|^\d{6}_\d{4}$|^\d{6}_\d{4}_.*$/;

// Function to check if a filename follows the correct format
const isValidFilenameFormat = (filename: string): boolean => {
  // Remove extension before checking format
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  return FILENAME_FORMAT_REGEX.test(nameWithoutExt);
}

// Function to format the filename according to the pattern
const formatFileName = (originalName: string): string => {
  // If the original filename format is correct, keep it exactly as is
  if (isValidFilenameFormat(originalName)) {
    return originalName;
  }
  
  // Otherwise, generate a system convention filename
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  
  // Create the datetime part
  const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`
  
  // Get name without extension and the extension
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const extension = originalName.slice(nameWithoutExt.length) || '.mp3';
  
  // If there's a base name, include it in the formatted name
  if (nameWithoutExt.trim()) {
    return `${dateTime}_${nameWithoutExt}${extension}`
  }
  
  // Otherwise just use the datetime
  return `${dateTime}${extension}`
}

// Remove the incorrect LocalRecording interface definition and keep only the AssemblyAI related interfaces
interface AssemblyAIEntity {
  entity_type: string;
  text: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  entities?: AssemblyAIEntity[];
  summary?: string;
}

// Update the generateTagFromEntity function
const generateTagFromEntity = (entity: AssemblyAIEntity): Tag => {
  return {
    id: crypto.randomUUID(),
    name: entity.text,
    // Use different colors for different entity types
    color: entity.entity_type === 'person_name' ? 'green' : 
           entity.entity_type === 'organization' ? 'blue' : 'purple'
  }
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
  const [enableEntityDetection, setEnableEntityDetection] = useState(true)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Hooks
  const { toast } = useToast()

  // Tag state
  const [fileTags, setFileTags] = useState<Record<string, Tag[]>>({})
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false)
  const [selectedFileForTags, setSelectedFileForTags] = useState<ImportFile | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value)

  // Add storage location state
  const [storageLocation, setStorageLocation] = useState<'local' | 'cloud'>(
    unifiedRecordingsService.isLocalStorage() ? 'local' : 'cloud'
  );

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    const newFiles: ImportFile[] = Array.from(event.target.files).map(file => ({
      file,
      id: crypto.randomUUID(),
      name: file.name,
      formattedName: formatFileName(file.name),
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

  // Add transcript file to a queued audio file
  const handleTranscriptSelect = (event: React.ChangeEvent<HTMLInputElement>, fileId: string) => {
    const transcriptFile = event.target.files?.[0];
    if (!transcriptFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, transcriptFile, transcriptContent: content }
          : f
      ));
    };
    reader.readAsText(transcriptFile);
    // Reset input
    event.target.value = '';
  };

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

      // Convert the file to a blob and create a new file with the formatted name
      const blob = await file.file.arrayBuffer().then(buffer => new Blob([buffer], { type: 'audio/mp3' }))
      const renamedFile = new window.File([blob], file.formattedName, { type: 'audio/mp3' })

      // Get the display name - if original format was correct, use original name without extension
      const displayName = isValidFilenameFormat(file.name) 
        ? file.name.replace(/\.[^/.]+$/, '') 
        : file.formattedName.replace(/\.[^/.]+$/, '')

      // Upload the recording using unified service
      const recording = await unifiedRecordingsService.createRecording(user.id, renamedFile, {
        name: displayName,
        description: displayName,
        durationSeconds: 0,
        isPublic: false,
        tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : undefined,
      })

      // Update file status with recording ID
      setFiles(prev => prev.map(f =>
        f.id === file.id
          ? { ...f, recordingId: recording.id, progress: 30 }
          : f
      ))

      // If user provided a transcript, store it directly and skip AssemblyAI
      if (file.transcriptContent) {
        if (unifiedRecordingsService.isLocalStorage()) {
          await indexedDBService.addTranscriptToRecording(
            recording.id,
            file.transcriptContent,
            null // No summary
          );

          // Update the recording with tags in local storage
          const existingRecording = await indexedDBService.getRecording(recording.id);
          if (existingRecording) {
            const updatedRecording: LocalRecording = {
              ...existingRecording,
              tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : null,
              isProcessed: true
            };
            await indexedDBService.updateRecording(updatedRecording);
          }
        } else {
          // For cloud, upload transcript and tags to Supabase
          const { error } = await supabase
            .from('transcripts')
            .insert({
              recording_id: recording.id,
              full_text: file.transcriptContent
            });
          if (error) throw new Error('Failed to upload transcript to cloud');

          // Update recording with tags and processed status
          const { error: updateError } = await supabase
            .from('recordings')
            .update({ 
              is_processed: true,
              tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : undefined
            })
            .eq('id', recording.id);
          if (updateError) throw new Error('Failed to update recording status in cloud');
        }
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));
        toast({
          title: "File Imported with Transcript",
          description: `${file.formattedName} and transcript have been imported.`
        });
        return;
      }

      // Prepare transcription options (if no transcript provided)
      const formData = new FormData()
      formData.append('recordingId', recording.id)
      formData.append('speakerLabels', enableSpeakerDetection.toString())
      formData.append('timestamps', enableTimestamps.toString())
      formData.append('summarization', enableSummarization.toString())
      formData.append('sentimentAnalysis', enableSentimentAnalysis.toString())
      formData.append('topicDetection', enableTopicDetection.toString())
      formData.append('entityDetection', enableEntityDetection.toString())
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

      const result = await response.json() as TranscriptionResult;

      // Handle entity detection results before updating storage
      let suggestedTags: Tag[] = [];
      if (result.entities && result.entities.length > 0) {
        console.log('Detected entities:', result.entities)
        suggestedTags = result.entities
          .filter(entity => entity.entity_type === 'person_name' || entity.entity_type === 'organization')
          .map(entity => generateTagFromEntity(entity));

        // Update file with suggested tags
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, suggestedTags, status: 'processing', progress: 75 }
            : f
        ))
      }

      // If storage is local, update the local recording with transcript and summary
      if (unifiedRecordingsService.isLocalStorage()) {
        await indexedDBService.addTranscriptToRecording(
          recording.id,
          result.transcript,
          result.summary || null
        );

        // Update the recording with any existing tags
        const existingRecording = await indexedDBService.getRecording(recording.id);
        if (existingRecording) {
          const updatedRecording: LocalRecording = {
            ...existingRecording,
            tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : null,
            isProcessed: true
          };
          await indexedDBService.updateRecording(updatedRecording);
        }
      }

      // Update file status to completed and preserve suggested tags
      setFiles(prev => prev.map(f =>
        f.id === file.id
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              suggestedTags // Ensure we keep the suggested tags
            }
          : f
      ))

      // Update the toast message to mention suggested tags if any were found
      const tagSuggestionMessage = suggestedTags.length 
        ? ` ${suggestedTags.length} name suggestions available in tags.` 
        : '';

      toast({
        title: "File Processed Successfully",
        description: `${file.formattedName} has been processed with AssemblyAI.${tagSuggestionMessage}`
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

  // Tag management functions
  const handleAddTag = () => {
    if (!selectedFileForTags || !newTagName.trim()) return;
    
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      color: selectedColor
    };

    setFileTags(prev => ({
      ...prev,
      [selectedFileForTags.id]: [...(prev[selectedFileForTags.id] || []), newTag]
    }));

    setNewTagName('');
    setSelectedColor(TAG_COLORS[0].value);
  };

  const handleRemoveTag = async (fileId: string, tagId: string) => {
    try {
      // First update the local state
      setFileTags(prev => {
        const newTags = {
          ...prev,
          [fileId]: prev[fileId].filter(tag => tag.id !== tagId)
        };
        return newTags;
      });

      // Get the file from our state
      const file = files.find(f => f.id === fileId);
      if (!file || !file.recordingId) return;

      // Save to appropriate storage
      if (unifiedRecordingsService.isLocalStorage()) {
        // Update IndexedDB
        const existingRecording = await indexedDBService.getRecording(file.recordingId);
        if (existingRecording) {
          const updatedRecording: LocalRecording = {
            ...existingRecording,
            tags: JSON.stringify(fileTags[fileId].filter(tag => tag.id !== tagId))
          };
          await indexedDBService.updateRecording(updatedRecording);
        }
      } else {
        // Update Supabase
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('recordings')
          .update({ 
            tags: JSON.stringify(fileTags[fileId].filter(tag => tag.id !== tagId))
          })
          .eq('id', file.recordingId);

        if (error) {
          throw new Error('Failed to update recording tags');
        }
      }

    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        variant: "destructive",
        title: "Failed to Remove Tag",
        description: error instanceof Error ? error.message : "Failed to remove tag"
      });

      // Revert the local state change on error
      setFileTags(prev => {
        const newTags = {
          ...prev,
          [fileId]: [...prev[fileId], fileTags[fileId].find(tag => tag.id === tagId)!]
        };
        return newTags;
      });
    }
  };

  const openTagEditor = (file: ImportFile) => {
    setSelectedFileForTags(file);
    setIsTagEditorOpen(true);
  };

  const handleUpload = async (file: ImportFile) => {
    try {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f))

      // Get current user
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Upload to selected storage
      if (storageLocation === 'local') {
        // Save to IndexedDB
        const recording: LocalRecording = {
          id: file.id,
          userId: user.id,
          name: file.formattedName,
          description: null,
          durationSeconds: 0,
          audioBlob: file.file,
          createdAt: new Date().toISOString(),
          isProcessed: false,
          isPublic: false,
          transcript: file.transcriptContent || null,
          summary: null,
          tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : null
        };

        await indexedDBService.updateRecording(recording)
      } else {
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(`${user.id}/${file.id}`, file.file)

        if (uploadError) throw uploadError

        // Create recording entry in database with tags
        const { error: dbError } = await supabase
          .from('recordings')
          .insert({
            id: file.id,
            user_id: user.id,
            name: file.formattedName,
            original_filename: file.name,
            transcript: file.transcriptContent,
            tags: fileTags[file.id] ? JSON.stringify(fileTags[file.id]) : undefined,
            storage_path: uploadData.path,
            processing_options: {
              speaker_detection: enableSpeakerDetection,
              timestamps: enableTimestamps,
              summarization: enableSummarization,
              sentiment_analysis: enableSentimentAnalysis,
              topic_detection: enableTopicDetection,
              entity_detection: enableEntityDetection
            }
          })

        if (dbError) throw dbError
      }

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f))

      toast({
        title: "File uploaded successfully",
        description: `${file.formattedName} has been uploaded and will be processed shortly.`,
      })
    } catch (error: unknown) {
      console.error('Upload error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setFiles(prev => prev.map(f => f.id === file.id ? { 
        ...f, 
        status: 'failed', 
        error: errorMessage 
      } : f))

      toast({
        variant: "destructive",
        title: "Upload failed",
        description: `Failed to upload ${file.formattedName}. ${errorMessage}`
      })
    }
  }

  // Update the handleAddSuggestedTag function to save changes
  const handleAddSuggestedTag = async (fileId: string, tag: Tag) => {
    try {
      // First update the local state
      setFileTags(prev => {
        const newTags = {
          ...prev,
          [fileId]: [...(prev[fileId] || []), tag]
        };
        return newTags;
      });

      // Get the file from our state
      const file = files.find(f => f.id === fileId);
      if (!file || !file.recordingId) return;

      // Save to appropriate storage
      if (unifiedRecordingsService.isLocalStorage()) {
        // Update IndexedDB
        const existingRecording = await indexedDBService.getRecording(file.recordingId);
        if (existingRecording) {
          const updatedRecording: LocalRecording = {
            ...existingRecording,
            tags: JSON.stringify([...(existingRecording.tags ? JSON.parse(existingRecording.tags) : []), tag])
          };
          await indexedDBService.updateRecording(updatedRecording);
        }
      } else {
        // Update Supabase
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('recordings')
          .update({ 
            tags: JSON.stringify([...(fileTags[fileId] || []), tag])
          })
          .eq('id', file.recordingId);

        if (error) {
          throw new Error('Failed to update recording tags');
        }
      }

      toast({
        title: "Tag Added",
        description: `Added "${tag.name}" to recording tags.`
      });

    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        variant: "destructive",
        title: "Failed to Save Tag",
        description: error instanceof Error ? error.message : "Failed to save tag"
      });

      // Revert the local state change on error
      setFileTags(prev => {
        const newTags = {
          ...prev,
          [fileId]: (prev[fileId] || []).filter(t => t.id !== tag.id)
        };
        return newTags;
      });
    }
  };

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
            <FileIcon className="mr-2 h-4 w-4" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <Label htmlFor="speaker-detection" className="text-sm">Speaker Detection</Label>
            </div>
            <Switch
              id="speaker-detection"
              checked={enableSpeakerDetection}
              onCheckedChange={setEnableSpeakerDetection}
            />
          </div>

          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-blue-500" />
              <Label htmlFor="timestamps" className="text-sm">Word Timestamps</Label>
            </div>
            <Switch
              id="timestamps"
              checked={enableTimestamps}
              onCheckedChange={setEnableTimestamps}
            />
          </div>

          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <ListTree className="h-4 w-4 text-blue-500" />
              <Label htmlFor="summary" className="text-sm">Generate Summary</Label>
            </div>
            <Switch
              id="summary"
              checked={enableSummarization}
              onCheckedChange={setEnableSummarization}
            />
          </div>

          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <Heart className="h-4 w-4 text-blue-500" />
              <Label htmlFor="sentiment" className="text-sm">Sentiment Analysis</Label>
            </div>
            <Switch
              id="sentiment"
              checked={enableSentimentAnalysis}
              onCheckedChange={setEnableSentimentAnalysis}
            />
          </div>

          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <ListTree className="h-4 w-4 text-blue-500" />
              <Label htmlFor="topics" className="text-sm">Topic Detection</Label>
            </div>
            <Switch
              id="topics"
              checked={enableTopicDetection}
              onCheckedChange={setEnableTopicDetection}
            />
          </div>

          <div className="flex items-center gap-4 bg-accent/5 p-3 rounded-lg">
            <div className="flex-1 flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-blue-500" />
              <Label htmlFor="entities" className="text-sm">Entity Detection</Label>
            </div>
            <Switch
              id="entities"
              checked={enableEntityDetection}
              onCheckedChange={setEnableEntityDetection}
            />
          </div>
        </div>
      </Card>

      {/* Tag Editor Dialog */}
      <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              Edit Tags
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Suggested Tags from Entity Detection */}
            {selectedFileForTags?.suggestedTags && selectedFileForTags.suggestedTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Suggested Names & Organizations
                    <span className="px-2 py-0.5 bg-primary/10 rounded-full text-xs font-semibold">
                      {selectedFileForTags.suggestedTags.length}
                    </span>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Click to add
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 p-2 bg-accent/5 rounded-lg">
                  {selectedFileForTags.suggestedTags.map(tag => {
                    const isAdded = fileTags[selectedFileForTags.id]?.some(t => t.name === tag.name);
                    return (
                      <div 
                        key={tag.id}
                        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-opacity
                          ${isAdded ? 'opacity-50' : 'hover:opacity-80'}
                          ${TAG_COLORS.find(c => c.value === tag.color)?.class}`}
                        onClick={() => !isAdded && handleAddSuggestedTag(selectedFileForTags.id, tag)}
                        title={isAdded ? 'Already added' : 'Click to add'}
                      >
                        <span>{tag.name}</span>
                        {isAdded ? (
                          <CheckCircle2 className="h-3 w-3 opacity-50" />
                        ) : (
                          <TagIcon className="h-3 w-3 opacity-50" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Current Tags ({selectedFileForTags ? (fileTags[selectedFileForTags.id]?.length || 0) : 0})
                </label>
                {selectedFileForTags && fileTags[selectedFileForTags.id]?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Click on a tag to remove it
                  </span>
                )}
              </div>
              
              {selectedFileForTags && Object.entries(
                (fileTags[selectedFileForTags.id] || []).reduce((acc, tag) => {
                  const colorGroup = acc[tag.color] || [];
                  return {
                    ...acc,
                    [tag.color]: [...colorGroup, tag]
                  };
                }, {} as Record<string, Tag[]>)
              ).map(([color, colorTags]) => (
                <div key={color} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TAG_COLORS.find(c => c.value === color)?.class}`} />
                    <span className="text-xs font-medium">{TAG_COLORS.find(c => c.value === color)?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-4">
                    {colorTags.map(tag => (
                      <div 
                        key={tag.id}
                        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${TAG_COLORS.find(c => c.value === color)?.class}`}
                        onClick={() => handleRemoveTag(selectedFileForTags.id, tag.id)}
                        title="Click to remove"
                      >
                        <span>{tag.name}</span>
                        <TagIcon className="h-3 w-3 opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {selectedFileForTags && (!fileTags[selectedFileForTags.id] || fileTags[selectedFileForTags.id].length === 0) && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                  No tags added yet. Add your first tag below.
                </div>
              )}
            </div>

            {/* Add New Tag */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Add New Tag</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-md text-sm"
                >
                  {TAG_COLORS.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
                <Button 
                  onClick={handleAddTag}
                  disabled={!newTagName.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File List */}
      <Card className="p-6">
        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <FileAudio className="h-16 w-16 mb-4 opacity-20" />
              <p>No files selected</p>
              <p className="text-sm mt-2">Click "Add Files" to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg border bg-card hover:bg-accent/5"
                >
                  {/* Status Icon */}
                  <div className="w-5 flex-shrink-0">
                    {file.status === 'queued' && <Clock className="h-4 w-4 text-blue-500" />}
                    {file.status === 'uploading' && <UploadIcon className="h-4 w-4 text-blue-500 animate-pulse" />}
                    {file.status === 'processing' && <Brain className="h-4 w-4 text-purple-500 animate-pulse" />}
                    {file.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {file.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{file.formattedName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ({Math.round(file.file.size / 1024 / 1024 * 100) / 100} MB)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-accent/5 px-2 py-0.5 rounded-full">
                          {isValidFilenameFormat(file.name) ? (
                            <>
                              <FileCheck className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">Format Valid</span>
                            </>
                          ) : (
                            <>
                              <FileQuestion className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600">Reformatted</span>
                            </>
                          )}
                        </div>
                        {file.transcriptFile && (
                          <div className="flex items-center gap-1 bg-accent/5 px-2 py-0.5 rounded-full">
                            <FileText className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600">Transcript Added</span>
                          </div>
                        )}
                        
                        {/* Display Tags */}
                        {fileTags[file.id]?.length > 0 && (
                          <div className="flex items-center gap-1">
                            {fileTags[file.id].slice(0, 3).map(tag => (
                              <div 
                                key={tag.id}
                                className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium border ${TAG_COLORS.find(c => c.value === tag.color)?.class}`}
                              >
                                {tag.name}
                              </div>
                            ))}
                            {fileTags[file.id].length > 3 && (
                              <div className="px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                +{fileTags[file.id].length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress and Actions */}
                  <div className="flex items-center gap-3">
                    {/* Show progress bar only when uploading or processing */}
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="w-24">
                        <Progress value={file.progress} className="h-1" />
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Tag Editor Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7"
                        onClick={() => openTagEditor(file)}
                        title="Edit Tags"
                      >
                        <TagIcon className="h-3 w-3" />
                      </Button>
                      
                      {/* Add Transcript button - only show for queued files without transcript */}
                      {file.status === 'queued' && !file.transcriptFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7"
                          title="Add transcript"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = '.txt'
                            input.onchange = (e) => handleTranscriptSelect(e as any, file.id)
                            input.click()
                          }}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeFile(file.id)}
                        disabled={isProcessing}
                        title="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
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
                size="sm"
                onClick={() => setFiles([])}
                disabled={isProcessing}
              >
                Clear All
              </Button>
              <Button
                size="sm"
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
