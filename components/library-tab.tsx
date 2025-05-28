"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { RefreshCw, ChevronLeft, ChevronRight, Search, FileAudio, Clock, Calendar, Download, FileText, MoreHorizontal, ArrowUpRight, CalendarCheck, Brain, Zap, Cloud, Database, ExternalLink, Settings, Moon, ArrowDownRight, FolderOpen, CalendarDays, Copy, X, Tag as TagIcon, Wand2, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"
import MediaPlayer from "./media-player"
import { getSupabaseClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { r2Service } from "@/lib/cloudflare/r2-service"
import { unifiedRecordingsService } from "@/lib/recordings-service"
import { useSettingsStore } from "@/lib/settings-store"
import { indexedDBService } from "@/lib/indexeddb/indexed-db-service"
import RecordingHeatmap from "./recording-heatmap"
import { cn } from "@/lib/utils"
import { getWeekNumber, getCurrentWeek } from "@/lib/date-utils"

// Add useDebounce hook at the top after imports
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Update the downloadTranscript function to handle unprocessed recordings
const downloadTranscript = async (recordingId: string, recordingName: string) => {
  try {
    // Use storageLocation from settings store instead of cookies
    const storageLocation = useSettingsStore.getState().storageLocation
    console.log("downloadTranscript using storageLocation:", storageLocation);
    
    let transcriptText: string;
    let summaryText: string | null = null;
    
    if (storageLocation === 'local') {
      console.log("Downloading local recording transcript", { recordingId });
      try {
        const localRecording = await indexedDBService.getRecording(recordingId);
        if (localRecording?.transcript) {
          console.log("Found local transcript for download");
          transcriptText = localRecording.transcript;
          summaryText = localRecording.summary || null;
        } else {
          console.log("No local transcript found for download");
          alert("No transcript available. This recording may not have been processed yet.");
          return;
        }
      } catch (localError) {
        console.error("Error accessing IndexedDB:", localError);
        alert("Error accessing local storage: " + String(localError));
        return;
      }
    } else {
      // For cloud recordings, fetch from Supabase as before
      console.log("Downloading cloud recording transcript", { recordingId });
      const supabase = getSupabaseClient()
      
      // Get transcript and summary
      const { data, error } = await supabase
        .from("transcripts")
        .select("full_text, summary")
        .eq("recording_id", recordingId)
        .single()
      
      if (error || !data) {
        console.error("Error fetching transcript:", error)
        alert("No transcript available. This recording may not have been processed yet.")
        return
      }
      
      transcriptText = data.full_text;
      summaryText = data.summary;
    }
    
    // Create a blob with the transcript text, including summary if available
    let finalText = transcriptText;
    if (summaryText) {
      finalText = `SUMMARY:\n${summaryText}\n\nFULL TRANSCRIPT:\n${transcriptText}`;
    }
    
    const blob = new Blob([finalText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    // Create a temporary link element
    const a = document.createElement('a')
    a.href = url
    a.download = `${recordingName.replace(/[^\w\s-]/g, '')}_transcript.txt`
    
    // Trigger the download
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading transcript:", error)
    alert("Failed to download transcript: " + String(error))
  }
}

interface Recording {
  id: string;
  name: string;
  description: string | null;
  duration_seconds: number;
  created_at: string;
  is_processed: boolean;
  storage_path: string;
  user_id: string;
  tags: string | null; // JSON string of Tag[] - [{name: string, color: string}]
}

interface CloudRecording {
  id: string;
  name: string;
  description: string | null;
  durationSeconds: number;
  createdAt: string;
  isProcessed: boolean;
  storagePath: string;
  userId: string;
  tags: string | null; // JSON string of Tag[] - [{name: string, color: string}]
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface RecordingTag {
  recordingId: string;
  tags: Tag[];
}

// Define the shape of the IndexedDB recording
interface IndexedDBRecording {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  durationSeconds: number;
  audioBlob: Blob;
  createdAt: string;
  isProcessed: boolean;
  isPublic: boolean;
  transcript?: string | null;
  summary?: string | null;
  tags: string | null; // JSON string of Tag[] - [{name: string, color: string}]
  type?: string;
  mimeType?: string;
}

// Helper function to convert IndexedDB recording to our Recording format
const convertIndexedDBRecording = (dbRecording: IndexedDBRecording): Recording => {
  console.log("Converting recording:", dbRecording);
  return {
    id: dbRecording.id,
    name: dbRecording.name,
    description: dbRecording.description || null,
    duration_seconds: dbRecording.durationSeconds,
    created_at: dbRecording.createdAt,
    is_processed: dbRecording.isProcessed,
    storage_path: dbRecording.id, // Use ID as storage path for local recordings
    user_id: dbRecording.userId,
    tags: dbRecording.tags || null // Ensure null if tags is undefined
  };
};

// Available tag colors
const TAG_COLORS = [
  { name: 'Red', value: 'red', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { name: 'Green', value: 'green', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
];

// Constants from IndexedDB service
const RECORDINGS_STORE = "recordings"
const DB_NAME = "talkadvantage-local"
const DB_VERSION = 1

// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    console.log("Initializing IndexedDB...");
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error opening IndexedDB:", event);
      reject(new Error("Could not open IndexedDB database"));
    };

    request.onsuccess = (event) => {
      console.log("IndexedDB opened successfully");
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      console.log("Upgrading IndexedDB...");
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        console.log("Creating recordings store...");
        const store = db.createObjectStore(RECORDINGS_STORE, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        console.log("Recordings store created");
      }
    };
  });
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

interface PeakTimeResult {
  hour: number;
  count: number;
  daysCount?: number;
}

// Custom hook for managing tags
function useTagManagement() {
  const [recordingTags, setRecordingTags] = useState<Record<string, Tag[]>>({});
  const storageLocation = useSettingsStore(state => state.storageLocation);

  const tagsToJSON = (tags: Tag[]): string => {
    return JSON.stringify(tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color
    })));
  };

  const JSONToTags = (jsonString: string | null): Tag[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return parsed.map((tag: { id: string; name: string; color: string }) => ({
        id: tag.id || crypto.randomUUID(),
        name: tag.name,
        color: tag.color
      }));
    } catch (error) {
      console.error('Error parsing tags JSON:', error);
      return [];
    }
  };

  const saveTags = async (recordingId: string, tags: Tag[]) => {
    try {
      console.log("Saving tags for recording:", { recordingId, tags });
      const tagsJSON = tagsToJSON(tags);

      if (storageLocation === 'local') {
        // Save tags in IndexedDB
        const dbRecording = await indexedDBService.getRecording(recordingId);
        if (!dbRecording) {
          throw new Error(`Recording ${recordingId} not found in local storage`);
        }

        console.log("Found local recording:", dbRecording);
        const updatedRecording = {
          ...dbRecording,
          tags: tagsJSON
        };
        
        // Update the recording in IndexedDB
        console.log("Updating recording with tags:", updatedRecording);
        await indexedDBService.updateRecording(updatedRecording);
        console.log("Tags saved locally:", { recordingId, tags });
      } else {
        // Save tags in Supabase recordings table
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('recordings')
          .update({ 
            tags: tagsJSON,
            updated_at: new Date().toISOString()
          })
          .eq('id', recordingId);
        
        if (error) {
          throw error;
        }
        console.log("Tags saved to cloud:", { recordingId, tags });
      }

      // Update local state
      setRecordingTags(prev => {
        const newTags = {
          ...prev,
          [recordingId]: tags
        };
        console.log("Updated tags in state:", newTags);
        return newTags;
      });
    } catch (error) {
      console.error("Error saving tags:", error);
      throw error;
    }
  };

  const loadTags = async () => {
    try {
      if (storageLocation === 'local') {
        // Get current user
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error("User not authenticated");
          return;
        }
        
        // Load tags from IndexedDB
        const dbRecordings = await indexedDBService.getRecordings(user.id);
        console.log("Loading tags from local recordings:", dbRecordings);
        
        const tags: Record<string, Tag[]> = {};
        dbRecordings.forEach(recording => {
          if (recording.tags) {
            try {
              const parsedTags = JSONToTags(recording.tags);
              if (parsedTags.length > 0) {
                tags[recording.id] = parsedTags;
              }
              console.log(`Loaded ${parsedTags.length} tags for recording ${recording.id}`);
            } catch (error) {
              console.error(`Error parsing tags for recording ${recording.id}:`, error);
            }
          }
        });
        
        console.log("Setting tags in state:", tags);
        setRecordingTags(tags);
      } else {
        // Load tags from Supabase recordings table
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('recordings')
          .select('id, tags');
        
        if (error) {
          throw error;
        }

        const tags: Record<string, Tag[]> = {};
        data?.forEach(recording => {
          if (recording.tags) {
            tags[recording.id] = JSONToTags(recording.tags);
          }
        });
        setRecordingTags(tags);
      }
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  // Load tags when storage location changes
  useEffect(() => {
    loadTags();
  }, [storageLocation]);

  return {
    recordingTags,
    saveTags,
    loadTags
  };
}

export default function LibraryTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchingTranscripts, setIsSearchingTranscripts] = useState(false)
  const [transcriptSearchCache, setTranscriptSearchCache] = useState<Record<string, string>>({})
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(null)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)
  const [currentTranscriptTitle, setCurrentTranscriptTitle] = useState("")
  const [transcriptPreviews, setTranscriptPreviews] = useState<Record<string, string>>({})
  const [expandedRecordings, setExpandedRecordings] = useState<Record<string, boolean>>({})
  const [sortBy, setSortBy] = useState<"name" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"calendar" | "heatmap">("calendar")
  const [durationUnit, setDurationUnit] = useState<"seconds" | "minutes" | "hours">("minutes")
  const [durationRange, setDurationRange] = useState<{ min: string; max: string }>({ min: "", max: "" })
  const [currentWeek, setCurrentWeek] = useState<number>(0)
  const [isWeekView, setIsWeekView] = useState<boolean>(false)
  const [selectedHourRecordings, setSelectedHourRecordings] = useState<Recording[]>([])
  const [selectedHourInfo, setSelectedHourInfo] = useState<{day: string, hour: number} | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({})
  const [hasDeepAnalysis, setHasDeepAnalysis] = useState<Record<string, boolean>>({})
  const [searchType, setSearchType] = useState<"filename" | "transcript" | "tags" | "interaction">("filename")
  const [transcriptSearchResults, setTranscriptSearchResults] = useState<Record<string, boolean>>({})
  const [activeTagFilters, setActiveTagFilters] = useState<Tag[]>([])
  // Add new state for selected recordings
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Add rename state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [recordingToRename, setRecordingToRename] = useState<Recording | null>(null);
  // Add state for transcript summaries
  const [transcriptSummaries, setTranscriptSummaries] = useState<Record<string, string | null>>({});
  const [isFetchingSummary, setIsFetchingSummary] = useState<Record<string, boolean>>({});
  // Add state for transcript metadata (duration, speakers, sentiment)
  const [transcriptMetadata, setTranscriptMetadata] = useState<Record<string, {
    duration?: string;
    speakers?: number;
    sentiment?: string;
    meta?: any;
  }>>({});

  // Use the tag management hook
  const { recordingTags, saveTags, loadTags } = useTagManagement();

  // Get storage location from settings store
  const storageLocation = useSettingsStore(state => state.storageLocation)

  // Add search button state
  const [searchProgress, setSearchProgress] = useState(0);
  const [totalSearchItems, setTotalSearchItems] = useState(0);
  const [isActiveSearch, setIsActiveSearch] = useState(false);
  
  // Increase debounce time for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Memoize the basic search function to improve performance
  const performBasicSearch = useCallback((recording: Recording, query: string): boolean => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase();
    
    // Cache the formatted name to avoid recalculating
    const formattedName = formatRecordingName(recording).toLowerCase();
    const description = (recording.description || '').toLowerCase();
    
    return formattedName.includes(searchTerm) || description.includes(searchTerm);
  }, []);

  // Add the copyAnalysisSummary function here, inside the component
  const copyAnalysisSummary = (recording: Recording) => {
    const metadata = transcriptMetadata[recording.id] || {
      duration: formatDuration(recording.duration_seconds),
      speakers: 2,
      sentiment: "Positive"
    };
    
    // Build a comprehensive summary with available metadata
    let summaryText = `Deep Analysis Summary for ${formatRecordingName(recording)}\n\n`;
    
    // Basic info
    summaryText += `Duration: ${metadata.duration}\n`;
    summaryText += `Speakers: ${metadata.speakers} detected\n`;
    summaryText += `Overall Sentiment: ${metadata.sentiment}\n\n`;
    
    // Show topics if available
    if (metadata.meta?.topics) {
      summaryText += "Topics Detected:\n";
      Object.entries(metadata.meta.topics).slice(0, 6).forEach(([topic, relevance]) => {
        summaryText += `• ${topic}\n`;
      });
      summaryText += "\n";
    }
    
    // Key points
    summaryText += "Key Points:\n";
    if (transcriptSummaries[recording.id]) {
      transcriptSummaries[recording.id]
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .forEach(point => {
          summaryText += `• ${point.trim().replace(/^[•-]\s*/, '')}\n`;
        });
    } else {
      // Fallback points
      summaryText += "• Discussion about project timeline\n";
      summaryText += "• Budget considerations\n";
      summaryText += "• Team resource allocation\n";
    }
    
    // Processing details
    if (metadata.meta) {
      summaryText += "\nProcessing Details:\n";
      if (metadata.meta.speaker_labels) summaryText += "✓ Speaker Detection\n";
      if (metadata.meta.timestamps) summaryText += "✓ Timestamps\n";
      if (metadata.meta.sentiment_analysis) summaryText += "✓ Sentiment Analysis\n";
      if (metadata.meta.topic_detection) summaryText += "✓ Topic Detection\n";
      if (metadata.meta.entity_detection) summaryText += "✓ Entity Detection\n";
      if (metadata.meta.summarization) summaryText += `✓ Summary (${metadata.meta.summary_type || "bullets"})\n`;
    }

    navigator.clipboard.writeText(summaryText)
      .then(() => {
        // You could add a toast notification here if you have one
        console.log('Analysis summary copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Week number calculation
  const getWeekNumber = (date: Date): number => {
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    
    // Adjust to get the first Sunday of the year
    const daysOffset = firstDayOfYear.getDay();
    const firstSundayOfYear = new Date(firstDayOfYear);
    if (daysOffset > 0) {
      firstSundayOfYear.setDate(firstDayOfYear.getDate() + (7 - daysOffset));
    }
    
    // Calculate days from the first Sunday to the given date
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysSinceFirstSunday = Math.floor(
      (date.getTime() - firstSundayOfYear.getTime()) / millisecondsPerDay
    );
    
    // Adding 1 because weeks are 1-indexed
    return Math.floor(daysSinceFirstSunday / 7) + 1;
  };
  
  // Initialize currentWeek after definition
  useEffect(() => {
    // Set current week to include today's date
    const today = new Date();
    const currentWeekNumber = getCurrentWeek();
    console.log("Current week calculation:", { 
      today, 
      currentWeekNumber
    });
    setCurrentWeek(currentWeekNumber);
    // Also set the week view flag to true to default to week view
    setIsWeekView(true);
    
    // Set view mode to heatmap by default
    setViewMode("heatmap");
  }, []);
  
  // Handle hour selection in heatmap
  const handleHourSelect = (dayIndex: number, hourIndex: number, hourRecordings: any[]) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Clear any selected date to avoid conflicts
    setSelectedDate(null);
    
    setSelectedHourInfo({
      day: daysOfWeek[dayIndex],
      hour: hourIndex
    });
    
    setSelectedHourRecordings(hourRecordings);
    
    // Ensure we're in week view
    setIsWeekView(true);
    
    // Switch to By Date tab if we're not already on it
    setTimeout(() => {
      const tabsElement = document.querySelector('[data-radix-collection-item][data-state="active"]');
      if (tabsElement && tabsElement.getAttribute('data-value') !== 'by-date') {
        const byDateTab = document.querySelector('[data-radix-collection-item][data-value="by-date"]');
        if (byDateTab) {
          (byDateTab as HTMLElement).click();
        }
      }
    }, 0);
  };
  
  // Handle week change in heatmap
  const handleWeekChange = (weekNumber: number) => {
    setCurrentWeek(weekNumber);
    setIsWeekView(true);
    // Clear any selected hour recordings when changing weeks
    setSelectedHourRecordings([]);
    setSelectedHourInfo(null);
  };

  // Create a fetchRecordings function
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("User not authenticated");
        setLoading(false);
        return;
      }

      let mappedData: Recording[];
      
      if (storageLocation === 'local') {
        // Get recordings from IndexedDB
        console.log("Fetching local recordings for user:", user.id);
        try {
          const dbRecordings = await indexedDBService.getRecordings(user.id);
          console.log("Raw local recordings:", dbRecordings);
          
          // Explicitly map the recordings with type safety
          mappedData = dbRecordings.map(dbRecording => ({
            id: dbRecording.id,
            name: dbRecording.name,
            description: dbRecording.description || null,
            duration_seconds: dbRecording.durationSeconds,
            created_at: dbRecording.createdAt,
            is_processed: dbRecording.isProcessed,
            storage_path: dbRecording.id, // Use ID as storage path for local recordings
            user_id: dbRecording.userId,
            tags: dbRecording.tags || null // Ensure null if tags is undefined
          }));
          
          console.log("Mapped local recordings:", mappedData);
        } catch (error) {
          console.error("Error fetching local recordings:", error);
          mappedData = [];
        }
      } else {
        // Get recordings from cloud
        const cloudData = await unifiedRecordingsService.getRecordings(user.id);
        // Cast the raw data to CloudRecording type
        const data = cloudData as unknown as CloudRecording[];
        mappedData = data.map(rec => ({
        id: rec.id,
        name: rec.name,
          description: rec.description,
        duration_seconds: rec.durationSeconds,
        created_at: rec.createdAt,
        is_processed: rec.isProcessed,
        storage_path: rec.storagePath,
          user_id: rec.userId,
          tags: rec.tags
        }));
      }
      
      console.log("Final recordings to set:", mappedData);
      setRecordings(mappedData);

      // Load tags after fetching recordings
      await loadTags();
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setRecordings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Hook up the fetchRecordings function to an effect that runs on mount and when storage location changes
  useEffect(() => {
    fetchRecordings()
  }, [storageLocation])

  // Clear selectedHourRecordings when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setSelectedHourRecordings([]);
      setSelectedHourInfo(null);
    }
  }, [selectedDate]);
  
  // Update isWeekView when viewMode changes
  useEffect(() => {
    if (viewMode === "calendar") {
      setIsWeekView(false);
    } else if (viewMode === "heatmap") {
      setIsWeekView(true);
    }
  }, [viewMode]);

  // Get recordings for the selected date
  const getRecordingsForDate = (date: Date | null) => {
    if (!date || !recordings.length) return []
    
    return recordings.filter((recording) => {
      const recordingDate = new Date(recording.created_at)
      const isOnDate = recordingDate.getDate() === date.getDate() &&
        recordingDate.getMonth() === date.getMonth() &&
        recordingDate.getFullYear() === date.getFullYear()
      
      // Check if recording is within selected date range
      const isInRange = dateRange?.from && dateRange?.to ? 
        isWithinInterval(recordingDate, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        }) : true
      
      return isOnDate && isInRange
    })
  }

  // Memoize date range check
  const isDateInRange = useCallback((date: Date) => {
    if (!dateRange?.from || !dateRange?.to) return true;
    return isWithinInterval(date, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });
  }, [dateRange]);

  // Memoize duration check
  const isDurationInRange = useCallback((duration: number) => {
    if (!durationRange.min && !durationRange.max) return true;
    const durationInUnit = getDurationInUnit(duration, durationUnit);
    const min = durationRange.min ? parseFloat(durationRange.min) : 0;
    const max = durationRange.max ? parseFloat(durationRange.max) : Infinity;
    return durationInUnit >= min && durationInUnit <= max;
  }, [durationRange, durationUnit]);

  // Memoize getRecordingsForWeek result
  const currentWeekRecordings = useMemo(() => {
    if (!recordings.length || currentWeek === 0) return [];
    
    // Calculate the date range for the selected week
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    
    // Adjust to get the first Sunday of the year
    const daysOffset = firstDayOfYear.getDay();
    const firstSundayOfYear = new Date(firstDayOfYear);
    if (daysOffset > 0) {
      firstSundayOfYear.setDate(firstDayOfYear.getDate() + (7 - daysOffset));
    }
    
    // Get the start date for the week
    const startOfWeek = new Date(firstSundayOfYear);
    startOfWeek.setDate(firstSundayOfYear.getDate() + (currentWeek - 1) * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return recordings.filter((recording) => {
      const recordingDate = new Date(recording.created_at);
      return recordingDate >= startOfWeek && recordingDate <= endOfWeek;
    });
  }, [recordings, currentWeek]);

  // Update the filteredRecordings useMemo to include selectedRecordings
  const filteredRecordings = useMemo(() => {
    return recordings.filter(recording => {
      // Check date range first (most efficient)
      if (!isDateInRange(new Date(recording.created_at))) return false;

      // Check duration next
      if (!isDurationInRange(recording.duration_seconds)) return false;

      // Check active tag filters
      if (activeTagFilters.length > 0) {
        const recordingTagList = recordingTags[recording.id] || [];
        // Recording must match ALL selected tag filters
        const hasAllSelectedTags = activeTagFilters.every(filterTag => 
          recordingTagList.some(tag => 
            tag.name === filterTag.name && tag.color === filterTag.color
          )
        );
        if (!hasAllSelectedTags) return false;
      }

      // Finally check search
      if (searchQuery.trim()) {
        // For all search types, check if this recording is in the search results
        return Boolean(transcriptSearchResults[recording.id]);
      }
      
      // If no search query, show all recordings
      return true;
    });
  }, [
    recordings,
    isDateInRange,
    isDurationInRange,
    searchQuery,
    transcriptSearchResults,
    recordingTags,
    activeTagFilters
  ]);

  // Update filteredDateRecordings similarly
  const filteredDateRecordings = useMemo(() => {
    const baseRecordings = selectedHourRecordings.length > 0
      ? selectedHourRecordings
      : isWeekView && viewMode === "heatmap"
        ? currentWeekRecordings
        : selectedDate
          ? getRecordingsForDate(selectedDate)
          : [];

    return baseRecordings.filter(recording => {
      // Check duration first
      if (!isDurationInRange(recording.duration_seconds)) return false;

      // Check active tag filters
      if (activeTagFilters.length > 0) {
        const recordingTagList = recordingTags[recording.id] || [];
        // Recording must match ALL selected tag filters
        const hasAllSelectedTags = activeTagFilters.every(filterTag => 
          recordingTagList.some(tag => 
            tag.name === filterTag.name && tag.color === filterTag.color
          )
        );
        if (!hasAllSelectedTags) return false;
      }

      // Then check search
      if (searchQuery.trim()) {
        // For all search types, check if this recording is in the search results
        return Boolean(transcriptSearchResults[recording.id]);
      }
      
      // If no search query, show all recordings
      return true;
    });
  }, [
    selectedHourRecordings,
    isWeekView,
    viewMode,
    currentWeekRecordings,
    selectedDate,
    isDurationInRange,
    searchQuery,
    transcriptSearchResults,
    recordingTags,
    activeTagFilters,
    getRecordingsForDate
  ]);

  // Get recordings count by date for the current month
  const getRecordingsCountByDate = () => {
    const result = new Map<number, { total: number, processed: number, unprocessed: number }>()
    
    recordings.forEach((recording) => {
      const recordingDate = new Date(recording.created_at)
      if (
        recordingDate.getMonth() === currentMonth.getMonth() &&
        recordingDate.getFullYear() === currentMonth.getFullYear()
      ) {
        const day = recordingDate.getDate()
        const existing = result.get(day) || { total: 0, processed: 0, unprocessed: 0 }
        
        existing.total += 1
        if (recording.is_processed) {
          existing.processed += 1
        } else {
          existing.unprocessed += 1
        }
        
        result.set(day, existing)
      }
    })
    
    return result
  }

  // Load the audio URL when a recording is selected
  useEffect(() => {
    async function loadAudioUrl() {
      if (!selectedRecording) {
        setAudioUrl(null);
        return;
      }
      
      try {
        // Log details about the selected recording for debugging
        console.log("Loading audio for recording:", {
          id: selectedRecording.id,
          name: selectedRecording.name,
          storagePath: selectedRecording.storage_path,
          storageLocation: storageLocation
        });
        
        let url;
        // Handle different storage types
        if (storageLocation === "local") {
          // Local storage uses the unified service
          url = await unifiedRecordingsService.getRecordingUrl(selectedRecording.storage_path);
        } else {
          // Cloud storage - use R2 service directly instead of Supabase
          url = await r2Service.getFileUrl(selectedRecording.storage_path);
        }
        
        console.log("Audio URL received:", url);
        
        // Set the URL in state
        setAudioUrl(url);
      } catch (error) {
        console.error("Error getting audio URL:", error);
        setAudioUrl(null);
      }
    }
    
    // Load the audio URL immediately
    loadAudioUrl();
  }, [selectedRecording, storageLocation]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatRecordingName = (recording: Recording): string => {
    // Get name without extension and the original extension
    const nameWithoutExt = recording.name.replace(/\.[^/.]+$/, "");
    const originalExtension = recording.name.match(/\.[^/.]+$/);
    
    // If the name already follows our convention
    if (isValidFilenameFormat(nameWithoutExt)) {
      // Return with original extension, or .mp3 if none exists
      return `${nameWithoutExt}${originalExtension ? originalExtension[0] : '.mp3'}`;
    }
    
    // Otherwise, format according to convention
    const date = new Date(recording.created_at);
    
    // Format as YYMMDD_HHMMSS
    const yy = date.getFullYear().toString().substring(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    
    // Create the datetime part
    const dateTime = `${yy}${mm}${dd}_${hh}${min}${ss}`;
    
    // Keep the original name after the date/time pattern
    return `${dateTime}_${nameWithoutExt}${originalExtension ? originalExtension[0] : '.mp3'}`;
  }

  // Helper to safely format recording name
  const safeFormatRecordingName = (recording: Recording | null): string => {
    if (!recording) return "";
    return formatRecordingName(recording);
  }

  // Format exact date for display (DD/MM/YYYY HH:MM)
  const formatExactDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  // Convert duration to selected unit
  const getDurationInUnit = (seconds: number, unit: "seconds" | "minutes" | "hours"): number => {
    switch (unit) {
      case "seconds":
        return seconds;
      case "minutes":
        return seconds / 60;
      case "hours":
        return seconds / 3600;
      default:
        return seconds;
    }
  }

  // Filter recordings by duration range
  const filterByDurationRange = (recordings: Recording[]) => {
    if (!durationRange.min && !durationRange.max) return recordings;
    
    return recordings.filter(recording => {
      const duration = getDurationInUnit(recording.duration_seconds, durationUnit);
      const min = durationRange.min ? parseFloat(durationRange.min) : 0;
      const max = durationRange.max ? parseFloat(durationRange.max) : Infinity;
      
      return duration >= min && duration <= max;
    });
  }

  // Add tag search functionality - no longer used automatically
  const searchInTags = useCallback((query: string) => {
    if (searchType !== "tags" || !query.trim()) return;

    const results: Record<string, boolean> = {};
    Object.entries(recordingTags).forEach(([recordingId, tags]) => {
      if (tags.some(tag => tag.name.toLowerCase().includes(query.toLowerCase()))) {
        results[recordingId] = true;
      }
    });
    setTranscriptSearchResults(results);
  }, [searchType, recordingTags]);
  
  // Perform manual search with progress tracking for all search types
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsActiveSearch(true);
    setSearchProgress(0);
    
    try {
      // For transcript search, we need to fetch transcripts
      if (searchType === "transcript") {
        setIsSearchingTranscripts(true);
    const results: Record<string, boolean> = {};
    
        // First check already loaded transcripts
    Object.entries(transcriptPreviews).forEach(([recordingId, transcript]) => {
          if (transcript.toLowerCase().includes(searchQuery.toLowerCase())) {
        results[recordingId] = true;
      }
    });

    // Update results immediately with what we have
    setTranscriptSearchResults(results);

        // Then get recordings that need transcript fetching
    const unloadedRecordings = recordings.filter(
          rec => rec.is_processed && 
          !transcriptPreviews[rec.id] && 
          !transcriptSearchCache[rec.id]
        );
        
        setTotalSearchItems(unloadedRecordings.length);
        let processedItems = 0;
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < unloadedRecordings.length; i += batchSize) {
          const batch = unloadedRecordings.slice(i, i + batchSize);
          await Promise.all(batch.map(async (recording) => {
      try {
        if (storageLocation === "local") {
          const localRecording = await indexedDBService.getRecording(recording.id);
                const transcript = localRecording?.transcript || "";
                
                // Update cache and check search
                setTranscriptSearchCache(prev => ({
                  ...prev,
                  [recording.id]: transcript
                }));
                
                if (transcript.toLowerCase().includes(searchQuery.toLowerCase())) {
              results[recording.id] = true;
            }
                
                // Update preview
            setTranscriptPreviews(prev => ({
              ...prev,
                  [recording.id]: transcript
            }));
        } else {
                // For cloud recordings
          const supabase = getSupabaseClient();
          const { data, error } = await supabase
            .from("transcripts")
            .select("full_text")
            .eq("recording_id", recording.id)
            .single();
          
                const transcript = (!error && data?.full_text) ? data.full_text : "";
                
                // Update cache and check search
                setTranscriptSearchCache(prev => ({
                  ...prev,
                  [recording.id]: transcript
                }));
                
                if (transcript.toLowerCase().includes(searchQuery.toLowerCase())) {
              results[recording.id] = true;
            }
                
                // Update preview
            setTranscriptPreviews(prev => ({
              ...prev,
                  [recording.id]: transcript
            }));
        }
      } catch (error) {
        console.error("Error searching transcript:", error);
              setTranscriptSearchCache(prev => ({
                ...prev,
                [recording.id]: ""
              }));
            } finally {
              // Update progress
              processedItems++;
              const progressPercent = Math.round((processedItems / unloadedRecordings.length) * 100);
              setSearchProgress(progressPercent);
            }
          }));
          
          // Update results after each batch
          setTranscriptSearchResults({...results});
        }
      } else if (searchType === "tags") {
        // Process tag search with progress tracking
        const results: Record<string, boolean> = {};
        const totalTags = Object.keys(recordingTags).length;
        setTotalSearchItems(totalTags);
        
        let processedItems = 0;
        
        // Process in batches for smoother UI
        const batchSize = 50;
        const allEntries = Object.entries(recordingTags);
        
        for (let i = 0; i < allEntries.length; i += batchSize) {
          const batch = allEntries.slice(i, i + batchSize);
          
          batch.forEach(([recordingId, tags]) => {
            if (tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
              results[recordingId] = true;
            }
            
            processedItems++;
            const progressPercent = Math.round((processedItems / totalTags) * 100);
            setSearchProgress(progressPercent);
          });
          
          // Update results and yield to UI
          setTranscriptSearchResults({...results});
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } else {
        // For filename and other searches with progress tracking
        const results: Record<string, boolean> = {};
        setTotalSearchItems(recordings.length);
        
        let processedItems = 0;
        
        // Process in batches for smoother UI
        const batchSize = 50;
        for (let i = 0; i < recordings.length; i += batchSize) {
          const batch = recordings.slice(i, i + batchSize);
          
          batch.forEach(recording => {
            if (performBasicSearch(recording, searchQuery)) {
              results[recording.id] = true;
            }
            
            processedItems++;
            const progressPercent = Math.round((processedItems / recordings.length) * 100);
            setSearchProgress(progressPercent);
          });
          
          // Update results and yield to UI
          setTranscriptSearchResults({...results});
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Ensure progress reaches 100% at the end
      setSearchProgress(100);
    } finally {
      setIsSearchingTranscripts(false);
      // Reset active search after a delay to show completion
      setTimeout(() => {
        setIsActiveSearch(false);
        setSearchProgress(0);
      }, 500);
    }
  }, [
    searchQuery, 
    searchType,
    recordings, 
    transcriptPreviews, 
    transcriptSearchCache, 
    storageLocation, 
    performBasicSearch, 
    recordingTags
  ]);
  
  // Update search effect - only clear results when query is empty
  useEffect(() => {
    // Clear results when search query is empty
    if (!searchQuery.trim()) {
      setTranscriptSearchResults({});
    }
    // No longer perform live search for any search type
  }, [searchQuery]);

  // Add function to get all unique tags
  const getAllUniqueTags = useMemo(() => {
    const uniqueTags = new Map<string, Tag>();
    Object.values(recordingTags).forEach(tags => {
      tags.forEach(tag => {
        const key = `${tag.name}-${tag.color}`;
        if (!uniqueTags.has(key)) {
          uniqueTags.set(key, tag);
        }
      });
    });
    return Array.from(uniqueTags.values());
  }, [recordingTags]);

  // Apply sorting to recordings
  const sortedFilteredRecordings = [...filteredRecordings].sort((a, b) => {
    if (sortBy === "name") {
      // Sort by formatted name instead of raw name
      const nameA = formatRecordingName(a).toLowerCase();
      const nameB = formatRecordingName(b).toLowerCase();
      return sortOrder === "asc" 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else {
      // Sort by date
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" 
        ? dateA - dateB 
        : dateB - dateA;
    }
  });
  
  // Apply same sorting to date recordings
  const sortedFilteredDateRecordings = [...filteredDateRecordings].sort((a, b) => {
    if (sortBy === "name") {
      // Sort by formatted name instead of raw name
      const nameA = formatRecordingName(a).toLowerCase();
      const nameB = formatRecordingName(b).toLowerCase();
      return sortOrder === "asc" 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else {
      // Sort by date
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" 
        ? dateA - dateB 
        : dateB - dateA;
    }
  });

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    const recordingsCountByDate = getRecordingsCountByDate()

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div 
          key={`empty-${i}`} 
          className="h-14 border border-blue-100 dark:border-blue-900/20 bg-gray-50/50 dark:bg-blue-950/10 rounded-lg"
        ></div>
      )
    }

    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      const isToday = new Date().toDateString() === date.toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()
      
      // Check if date is in selected range from date picker
      const isInDateRange = dateRange?.from && dateRange?.to && 
        isWithinInterval(date, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        });
      const isRangeStart = dateRange?.from && date.toDateString() === dateRange.from.toDateString();
      const isRangeEnd = dateRange?.to && date.toDateString() === dateRange.to.toDateString();

      // Get recording stats for this day
      const dayStats = recordingsCountByDate.get(i) || { total: 0, processed: 0, unprocessed: 0 }
      const recordingsCount = dayStats.total
      const processedCount = dayStats.processed
      const unprocessedCount = dayStats.unprocessed
      const hasRecordings = recordingsCount > 0
      
      // Determine the indicator color
      let indicatorColorClass = "bg-blue-500"
      let indicatorBgClass = "bg-blue-50 dark:bg-blue-900/30"
      let indicatorTextClass = "text-blue-700 dark:text-blue-300"
      
      if (hasRecordings) {
        if (unprocessedCount === 0) {
          indicatorColorClass = "bg-green-500" // All processed
          indicatorBgClass = "bg-green-50 dark:bg-green-900/30"
          indicatorTextClass = "text-green-700 dark:text-green-300"
        } else if (processedCount === 0) {
          indicatorColorClass = "bg-yellow-500" // None processed
          indicatorBgClass = "bg-yellow-50 dark:bg-yellow-900/30"
          indicatorTextClass = "text-yellow-700 dark:text-yellow-300"
        } else {
          indicatorColorClass = "bg-blue-500" // Mix of processed and unprocessed
          indicatorBgClass = "bg-blue-50 dark:bg-blue-900/30"
          indicatorTextClass = "text-blue-700 dark:text-blue-300"
        }
      }

      days.push(
        <div
          key={`day-${i}`}
          className={`h-10 border rounded-lg p-1 relative cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 overflow-hidden group
            ${isToday ? "bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" : "border-border"}
            ${isSelected ? "ring-2 ring-primary shadow-md" : "shadow-sm hover:shadow"}
            ${hasRecordings ? "border-blue-200 dark:border-blue-800" : ""}
            ${isInDateRange ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}
            ${isRangeStart ? "border-l-2 border-l-indigo-500" : ""}
            ${isRangeEnd ? "border-r-2 border-r-indigo-500" : ""}
          `}
          onClick={() => {
            setSelectedDate(date);
            setSelectedHourRecordings([]);
            setSelectedHourInfo(null);
          }}
        >
            <div className="flex items-center gap-0.5">
            <span className={`text-[10px] font-medium 
              ${isToday ? "text-white bg-primary h-4 w-4 flex items-center justify-center rounded-full" : ""}
              ${isInDateRange ? "text-indigo-700 dark:text-indigo-300" : ""}
              ${(isRangeStart || isRangeEnd) ? "text-indigo-800 dark:text-indigo-200 font-semibold" : ""}
            `}>
                {i}
              </span>
              {isToday && !isSelected && (
                <span className="text-[7px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-0.5 rounded-sm">Today</span>
              )}
            {(isRangeStart || isRangeEnd) && (
              <span className="text-[7px] text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-0.5 rounded-sm">
                {isRangeStart ? 'Start' : 'End'}
              </span>
            )}
          </div>
          
          {hasRecordings && (
            <div className="mt-0.5 overflow-hidden">
              <div className="flex flex-wrap items-center gap-0.5">
                {processedCount > 0 && (
                  <div 
                    className="flex items-center gap-0.5 bg-green-50 dark:bg-green-900/20 rounded-full px-1 py-0.5 border border-green-100 dark:border-green-800/30" 
                    title={`${processedCount} processed recordings`}
                  >
                    <span className="h-1 w-1 rounded-full bg-green-500 inline-block border border-green-600/50"></span>
                    <span className="text-[8px] font-medium text-green-600 dark:text-green-400">{processedCount}</span>
                  </div>
                )}
                
                {unprocessedCount > 0 && (
                  <div 
                    className="flex items-center gap-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-full px-1 py-0.5 border border-yellow-100 dark:border-yellow-800/30" 
                    title={`${unprocessedCount} unprocessed recordings`}
                  >
                    <span className="h-1 w-1 rounded-full bg-yellow-500 inline-block border border-yellow-600/50"></span>
                    <span className="text-[8px] font-medium text-yellow-600 dark:text-yellow-400">{unprocessedCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tooltip-like hover effect */}
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-1 text-center">
            <div className="text-[10px] font-medium">
              {date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
            </div>
            {hasRecordings ? (
              <div className="text-[8px] text-muted-foreground mt-0.5">
                {recordingsCount} recording{recordingsCount > 1 ? "s" : ""}
                <div className="text-[7px] mt-0.5">
                  <span className="text-green-600 dark:text-green-400">{processedCount} processed</span>
                  {unprocessedCount > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400"> • {unprocessedCount} Unprocessed</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[8px] text-muted-foreground mt-0.5">No recordings</div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  // Update the viewTranscript function to handle unprocessed recordings better
  const viewTranscript = async (recording: Recording) => {
    try {
      // Set loading state and open dialog first
      setIsLoadingTranscript(true);
      setCurrentTranscriptTitle(recording.name);
      
      // Ensure dialog is open with a slight delay to avoid animation conflicts
     
        setShowTranscriptDialog(true);
  
      
      // Use storageLocation from settings store instead of cookies
      const storageLocation = useSettingsStore.getState().storageLocation
      console.log("viewTranscript using storageLocation:", storageLocation);
      
      if (storageLocation === 'local') {
        console.log("Fetching local recording transcript", { recordingId: recording.id });
        try {
          const localRecording = await indexedDBService.getRecording(recording.id);
          if (localRecording && localRecording.transcript) {
            console.log("Found local transcript, length:", localRecording.transcript.length);
            
            let displayText = "";
            
            // 1. Add summary if available
            if (localRecording.summary) {
              displayText += `SUMMARY: ${localRecording.summary}\n\n`;
            }
            
            // 2. Extract metadata
            try {
              let metaData = null;
              if (localRecording.meta) {
                metaData = JSON.parse(localRecording.meta);
              }
              
              // Add basic info
              displayText += `Duration: ${formatDuration(localRecording.durationSeconds)}\n`;
              displayText += `Speakers: ${localRecording.speakers || "Unknown"}\n`;
              displayText += `Overall Sentiment: ${localRecording.sentiment || "Neutral"}\n`;
              
              // Add topics if available
              if (metaData && metaData.topics) {
                displayText += `Topics: ${Object.keys(metaData.topics).slice(0, 5).join(", ")}\n`;
              }
              
              // Add entities if available
              if (metaData && metaData.entities) {
                displayText += `Entities: ${Object.keys(metaData.entities).slice(0, 5).join(", ")}\n`;
              }
              
              // Add sentiment analysis if available in meta
              if (metaData && metaData.sentiment_analysis) {
                displayText += `Sentiment Analysis: Enabled\n`;
              }
              
              displayText += "\n";
            } catch (error) {
              console.error("Error parsing metadata:", error);
            }
            
            // 3. Add full transcript
            displayText += `FULL TRANSCRIPT: ${localRecording.transcript}`;
            
            setCurrentTranscript(displayText);
          } else {
            console.log("No local transcript found");
            setCurrentTranscript("No transcript found. This recording may not have been processed yet.");
          }
        } catch (localError) {
          console.error("Error accessing IndexedDB:", localError);
          setCurrentTranscript("Error accessing local storage: " + String(localError));
        }
      } else {
        // For cloud recordings, fetch from Supabase as before
        console.log("Fetching cloud recording transcript", { recordingId: recording.id });
        const supabase = getSupabaseClient()
        
        // Get transcript, summary, and metadata
        const { data, error } = await supabase
          .from("transcripts")
          .select("full_text, summary, speakers, overall_sentiment, meta")
          .eq("recording_id", recording.id)
          .single()
        
        if (error) {
          console.error("Error fetching transcript:", error)
          setCurrentTranscript("No transcript found. This recording may not have been processed yet.")
          return
        }
        
        let displayText = "";
        
        // 1. Add summary if available
        if (data.summary) {
          displayText += `SUMMARY: ${data.summary}\n\n`;
        }
        
        // 2. Extract metadata
        try {
          let metaData = null;
          if (data.meta) {
            metaData = typeof data.meta === 'string' ? JSON.parse(data.meta) : data.meta;
          }
          
          // Add basic info
          displayText += `Duration: ${formatDuration(recording.duration_seconds)}\n`;
          displayText += `Speakers: ${data.speakers || "Unknown"}\n`;
          displayText += `Overall Sentiment: ${data.overall_sentiment || "Neutral"}\n`;
          
          // Add topics if available
          if (metaData && metaData.topics) {
            displayText += `Topics: ${Object.keys(metaData.topics).slice(0, 5).join(", ")}\n`;
          }
          
          // Add entities if available
          if (metaData && metaData.entities) {
            displayText += `Entities: ${Object.keys(metaData.entities).slice(0, 5).join(", ")}\n`;
          }
          
          // Add sentiment analysis if available in meta
          if (metaData && metaData.sentiment_analysis) {
            displayText += `Sentiment Analysis: Enabled\n`;
          }
          
          displayText += "\n";
        } catch (error) {
          console.error("Error parsing metadata:", error);
        }
        
        // 3. Add full transcript
        displayText += `FULL TRANSCRIPT: ${data.full_text || "No transcript text available."}`;
        
        setCurrentTranscript(displayText);
      }
    } catch (error) {
      console.error("Error viewing transcript:", error)
      setCurrentTranscript("Error loading transcript.")
    } finally {
      setIsLoadingTranscript(false)
    }
  }

  // Add a function to fetch transcript preview
  const fetchTranscriptPreview = async (recordingId: string) => {
    try {
      if (transcriptPreviews[recordingId]) return;
      
      // Use storageLocation from settings store instead of cookies
      const storageLocation = useSettingsStore.getState().storageLocation
      console.log("fetchTranscriptPreview using storageLocation:", storageLocation);
      
      if (storageLocation === 'local') {
        try {
          const localRecording = await indexedDBService.getRecording(recordingId);
            setTranscriptPreviews(prev => ({
              ...prev,
            [recordingId]: localRecording?.transcript || "No transcript available."
          }));
        } catch (error) {
          console.error("Error accessing IndexedDB for preview:", error);
          setTranscriptPreviews(prev => ({
            ...prev,
            [recordingId]: "Error loading transcript."
          }));
        }
      } else {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("transcripts")
          .select("full_text")
          .eq("recording_id", recordingId)
          .single();
        
        if (error || !data) {
          console.error("Error fetching transcript preview:", error);
          setTranscriptPreviews(prev => ({
            ...prev,
            [recordingId]: "No transcript available."
          }));
          return;
        }
        
        setTranscriptPreviews(prev => ({
          ...prev,
          [recordingId]: data.full_text || "No transcript available."
        }));
      }
    } catch (error) {
      console.error("Error fetching transcript preview:", error);
      setTranscriptPreviews(prev => ({
        ...prev,
        [recordingId]: "Error loading transcript."
      }));
    }
  };
  
  // Function to fetch transcript summary
  const fetchTranscriptSummary = async (recordingId: string) => {
    try {
      // Set loading state
      setIsFetchingSummary(prev => ({
        ...prev,
        [recordingId]: true
      }));
      
      // Use storageLocation from settings store instead of cookies
      const storageLocation = useSettingsStore.getState().storageLocation
      console.log("fetchTranscriptSummary using storageLocation:", storageLocation);
      
      if (storageLocation === 'local') {
        try {
          const localRecording = await indexedDBService.getRecording(recordingId);
          setTranscriptSummaries(prev => ({
            ...prev,
            [recordingId]: localRecording?.summary || null
          }));
          
          // Parse meta data if available
          let metaData = null;
          if (localRecording?.meta) {
            try {
              metaData = JSON.parse(localRecording.meta);
            } catch (error) {
              console.error("Error parsing meta data:", error);
            }
          }
          
          // Set metadata for local recordings - use actual values if available
          setTranscriptMetadata(prev => ({
            ...prev,
            [recordingId]: {
              duration: formatDuration(localRecording?.durationSeconds || 0),
              speakers: localRecording?.speakers || 2,
              sentiment: localRecording?.sentiment || "Positive",
              meta: metaData
            }
          }));
        } catch (error) {
          console.error("Error accessing IndexedDB for summary:", error);
          setTranscriptSummaries(prev => ({
            ...prev,
            [recordingId]: null
          }));
        }
      } else {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("transcripts")
          .select("summary, speakers, overall_sentiment, meta")
          .eq("recording_id", recordingId)
          .single();
        
        if (error || !data) {
          console.error("Error fetching transcript summary:", error);
          setTranscriptSummaries(prev => ({
            ...prev,
            [recordingId]: null
          }));
          return;
        }
        
        setTranscriptSummaries(prev => ({
          ...prev,
          [recordingId]: data.summary
        }));
        
        // Get recording for duration
        const recording = recordings.find(r => r.id === recordingId);
        
        // Parse meta data if available
        let metaData = null;
        if (data.meta) {
          try {
            metaData = JSON.parse(data.meta);
          } catch (error) {
            console.error("Error parsing meta data:", error);
          }
        }
        
        // Set metadata from Supabase and recording
        setTranscriptMetadata(prev => ({
          ...prev,
          [recordingId]: {
            duration: recording ? formatDuration(recording.duration_seconds) : "0:00",
            speakers: data.speakers || 2,
            sentiment: data.overall_sentiment || "Positive",
            meta: metaData
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching transcript summary:", error);
      setTranscriptSummaries(prev => ({
        ...prev,
        [recordingId]: null
      }));
    } finally {
      setIsFetchingSummary(prev => ({
        ...prev,
        [recordingId]: false
      }));
    }
  };
  
  // Toggle transcript preview for a recording
  const toggleTranscriptPreview = (recordingId: string, isProcessed: boolean) => {
    if (!isProcessed) return; // Only allow for processed recordings
    
    // Toggle the expanded state
    setExpandedRecordings(prev => {
      const newState = {
        ...prev,
        [recordingId]: !prev[recordingId]
      };
      
      // If expanding and we don't have the preview yet, fetch it
      if (newState[recordingId] && !transcriptPreviews[recordingId]) {
        fetchTranscriptPreview(recordingId);
      }
      
      return newState;
    });
  };

  // Recording options modal component
  const RecordingOptionsModal = ({ recording }: { recording: Recording }) => {
    const handleDeepAnalysis = () => {
      alert("Deep Analysis feature coming soon");
    };

    const handleLiveAnalysis = () => {
      alert("Live Analysis feature coming soon");
    };

    const handleGoToDate = () => {
      const recordingDate = new Date(recording.created_at);
      setCurrentMonth(new Date(recordingDate.getFullYear(), recordingDate.getMonth(), 1));
      setSelectedDate(recordingDate);
    };
    
    const handleViewTranscript = () => {
      // Close the options dialog first
      setShowTranscriptDialog(false); // Reset transcript dialog state
      
      // Use a longer timeout to ensure the first dialog is fully closed
      // before opening the transcript view
    
      viewTranscript(recording);
  
    };
    
    const handleDownloadTranscript = () => {
      downloadTranscript(recording.id, recording.name);
    };
  
    const handleRenameClick = () => {
      setRecordingToRename(recording);
      setShowRenameDialog(true);
    };

    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900 pb-4">
          <DialogTitle className="text-xl flex items-center">
            <FileAudio className="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" />
            Recording Options
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {formatRecordingName(recording)}
          </p>
        </DialogHeader>
        <div className="py-3">
          {/* Add Rename button */}
          <div className="flex gap-2 mb-4">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                className="flex items-center justify-start flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-900"
                onClick={handleRenameClick}
                  >
                <FileAudio className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Rename</span>
                  </Button>
                </DialogClose>
          </div>
          
          {/* Rest of the options */}
          <div className="flex gap-2 mb-4 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Analysis Options</h3>
              <div className="mt-2 space-y-2">
                  <Button 
                    variant="outline" 
                  className="w-full justify-start"
                  onClick={handleDeepAnalysis}
                  >
                  <Brain className="mr-2 h-4 w-4" />
                  Deep Analysis
                  </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleLiveAnalysis}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Live Analysis
                </Button>
              </div>
              </div>
            </div>
            
          <div className="flex gap-2 mb-4">
                  <Button 
                    variant="outline" 
              className="flex-1 justify-start"
              onClick={handleGoToDate}
                  >
              <Calendar className="mr-2 h-4 w-4" />
              Go to Date
                  </Button>
          </div>
                
          <div className="flex gap-2">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                className="flex-1 justify-start"
                onClick={handleViewTranscript}
                  >
                <FileText className="mr-2 h-4 w-4" />
                View Transcript
                  </Button>
                </DialogClose>
                <Button 
                  variant="outline" 
              className="flex-1 justify-start"
              onClick={handleDownloadTranscript}
                >
              <Download className="mr-2 h-4 w-4" />
              Download Transcript
                </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  // Add these helper functions near the other utility functions
  const getLongestRecording = () => {
    if (recordings.length === 0) return { duration: 0, date: null };
    
    const longest = recordings.reduce((max, recording) => 
      recording.duration_seconds > max.duration_seconds ? recording : max, 
      recordings[0]
    );
    
    return { 
      duration: longest.duration_seconds, 
      date: new Date(longest.created_at)
    };
  };

  const getPeakRecordingTime = (): PeakTimeResult => {
    if (recordings.length === 0) return { hour: 0, count: 0 };
    
    // Approach: Calculate average recordings per hour accounting for days with activity
    const hourCounts = new Array(24).fill(0);
    const activeDaysPerHour = new Array(24).fill(0);
    const recordingDates = new Set<string>();
    
    // Count recordings by hour and track unique active days
    recordings.forEach(recording => {
      const date = new Date(recording.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const hour = date.getHours();
      
      // Track this date as having recordings
      recordingDates.add(dateKey);
      
      // Count recordings for this hour
      hourCounts[hour]++;
      
      // Track active days for each hour (only increment once per day per hour)
      const hourDateKey = `${dateKey}-${hour}`;
      if (!recordingDates.has(hourDateKey)) {
        recordingDates.add(hourDateKey);
        activeDaysPerHour[hour]++;
      }
    });
    
    // Calculate recordings per active day for each hour
    const averageRecordingsPerHour = hourCounts.map((count, hour) => ({
      hour,
      count,
      activeDays: activeDaysPerHour[hour],
      average: activeDaysPerHour[hour] > 0 ? count / activeDaysPerHour[hour] : 0
    }));
    
    // Find peak hour by average recordings per active day
    const peakHour = averageRecordingsPerHour.reduce(
      (max, current) => (current.average > max.average ? current : max),
      averageRecordingsPerHour[0]
    );
    
    return { 
      hour: peakHour.hour, 
      count: peakHour.count,
      daysCount: peakHour.activeDays
    };
  };

  // Add these helper functions near the other utility functions
  const getShortestRecording = () => {
    if (recordings.length === 0) return { duration: 0, date: null };
    
    const validRecordings = recordings.filter(r => r.duration_seconds > 0);
    if (validRecordings.length === 0) return { duration: 0, date: null };
    
    const shortest = validRecordings.reduce((min, recording) => 
      recording.duration_seconds < min.duration_seconds ? recording : min, 
      validRecordings[0]
    );
    
    return { 
      duration: shortest.duration_seconds, 
      date: new Date(shortest.created_at)
    };
  };

  const getQuietestTime = (): PeakTimeResult => {
    if (recordings.length === 0) return { hour: 0, count: 0 };
    
    // Count recordings by hour
    const hourCounts = new Array(24).fill(0);
    const activeDaysPerHour = new Array(24).fill(0);
    const recordingDates = new Set<string>();
    
    recordings.forEach(recording => {
      const date = new Date(recording.created_at);
      const dateKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      recordingDates.add(dateKey);
      hourCounts[hour]++;
      
      const hourDateKey = `${dateKey}-${hour}`;
      if (!recordingDates.has(hourDateKey)) {
        recordingDates.add(hourDateKey);
        activeDaysPerHour[hour]++;
      }
    });
    
    // Find the hour with the least activity (excluding hours with zero recordings)
    const activeHours = hourCounts.map((count, hour) => ({
      hour,
      count,
      activeDays: activeDaysPerHour[hour],
      average: activeDaysPerHour[hour] > 0 ? count / activeDaysPerHour[hour] : 0
    })).filter(h => h.count > 0);
    
    if (activeHours.length === 0) return { hour: 0, count: 0 };
    
    const quietestHour = activeHours.reduce(
      (min, current) => (current.average < min.average ? current : min),
      activeHours[0]
    );
    
    return { 
      hour: quietestHour.hour, 
      count: quietestHour.count,
      daysCount: quietestHour.activeDays
    };
  };

  // Get stats data
  const longestRecording = getLongestRecording();
  const peakTime = getPeakRecordingTime();
  const shortestRecording = getShortestRecording();
  const quietestTime = getQuietestTime();
  
  // Format peak hour for display (12-hour format with AM/PM)
  const formatHour = (hour: number): string => {
    const h = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h} ${ampm}`;
  };

  // Add date range handler
  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  // Add effect to update selected date when date range changes
  useEffect(() => {
    if (dateRange?.from) {
      setSelectedDate(dateRange.from);
    }
  }, [dateRange]);

  // Toggle Deep Analysis panel
  const toggleAnalysisPanel = (recordingId: string) => {
    setExpandedAnalysis(prev => {
      const newState = {
        ...prev,
        [recordingId]: !prev[recordingId]
      };
      
      // If expanding and it's processed, fetch the summary
      if (newState[recordingId]) {
        const recording = recordings.find(r => r.id === recordingId);
        if (recording?.is_processed) {
          fetchTranscriptSummary(recordingId);
        }
      }
      
      return newState;
    });
  };

  // Add delete handlers
  const handleDelete = async (recordingIds: string[]) => {
    try {
      setIsDeleting(true);
      
      // Delete each recording
      for (const id of recordingIds) {
        await unifiedRecordingsService.deleteRecording(id);
      }
      
      // Update local state
      setRecordings(prev => prev.filter(rec => !recordingIds.includes(rec.id)));
      setSelectedRecordings(new Set());
      setShowDeleteDialog(false);
      
      // Clear selected recording if it was deleted
      if (selectedRecording && recordingIds.includes(selectedRecording.id)) {
        setSelectedRecording(null);
        setAudioUrl(null);
      }
    } catch (error) {
      console.error('Error deleting recordings:', error);
      alert('Failed to delete recordings. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRecordingSelection = (recordingId: string) => {
    setSelectedRecordings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordingId)) {
        newSet.delete(recordingId);
      } else {
        newSet.add(recordingId);
      }
      return newSet;
    });
  };

  // Add this before the renderRecordingItem function
  const renderDeleteDialog = () => (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Recordings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {selectedRecordings.size} recording{selectedRecordings.size !== 1 ? 's' : ''}? This action cannot be undone.
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDelete(Array.from(selectedRecordings))}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Memoize the renderRecordingItem function
  const renderRecordingItem = useCallback((recording: Recording, isDateView: boolean = false) => (
    <div 
      key={recording.id}
      className={`border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors 
        ${selectedRecording?.id === recording.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onClick={() => setSelectedRecording(recording)}
    >
      <div className="flex items-center gap-0.5 px-2 py-1">
        {/* Add checkbox for selection */}
        <div 
          className="mr-2"
      onClick={(e) => {
            e.stopPropagation();
            toggleRecordingSelection(recording.id);
          }}
        >
          <input
            type="checkbox"
            checked={selectedRecordings.has(recording.id)}
            onChange={() => {}}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>

        <span className="text-slate-500 text-[10px]">♪</span>
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate mr-auto">{formatRecordingName(recording)}</span>
        
        <span className={`h-1 w-1 rounded-full flex-shrink-0 ${recording.is_processed ? 'bg-green-500' : 'bg-yellow-500'} mx-0.5`} title={recording.is_processed ? "Processed" : "Not processed"} />
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Display Tags */}
          <div className="flex items-center gap-1 mr-2">
            {recordingTags[recording.id]?.slice(0, 4).map(tag => (
              <div 
                key={tag.id}
                className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium border ${TAG_COLORS.find(c => c.value === tag.color)?.class} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTagFilters.some(filterTag => 
                    filterTag.name === tag.name && filterTag.color === tag.color
                  )) {
                    setActiveTagFilters(prev => 
                      prev.filter(filterTag => 
                        filterTag.name !== tag.name || filterTag.color !== tag.color
                      )
                    );
                  } else {
                    setActiveTagFilters(prev => [...prev, tag]);
                  }
                }}
                title={`${activeTagFilters.some(filterTag => 
  filterTag.name === tag.name && filterTag.color === tag.color
) ? "Click to remove filter" : "Click to filter by"} "${tag.name}"`}
              >
                {tag.name}
              </div>
            ))}
            {recordingTags[recording.id]?.length > 4 && (
              <div 
                className="px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                title={`${recordingTags[recording.id].length - 4} more tags`}
              >
                +{recordingTags[recording.id].length - 4}
              </div>
            )}
          </div>

          <span className="text-[8px] text-slate-500 dark:text-slate-400 flex items-center">
            <Clock className="mr-0.5 h-2 w-2" />
            {recording.duration_seconds > 0 ? formatDuration(recording.duration_seconds) : "..."}
          </span>
          
          <span className="text-[8px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 px-1 rounded-sm border border-slate-200 dark:border-slate-800 flex-shrink-0">
            {formatExactDate(recording.created_at)}
          </span>
          
          {recording.is_processed && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 flex-shrink-0"
              title="Show/hide transcript preview"
              onClick={(e) => {
                e.stopPropagation();
                toggleTranscriptPreview(recording.id, recording.is_processed);
              }}
            >
              <FileText className="h-2.5 w-2.5 text-slate-500" />
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 flex-shrink-0"
            title="Show/hide Deep Analysis"
            onClick={(e) => {
              e.stopPropagation();
              toggleAnalysisPanel(recording.id);
            }}
          >
            <Brain className={`h-2.5 w-2.5 text-slate-500 transition-transform duration-200 ${expandedAnalysis[recording.id] ? 'rotate-180' : ''}`} />
          </Button>

          {/* Add Tag Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 flex-shrink-0"
                title="Edit Tags"
                onClick={(e) => e.stopPropagation()}
              >
                <TagIcon className="h-2.5 w-2.5 text-slate-500" />
              </Button>
            </DialogTrigger>
            <TagEditorModal 
              recording={recording}
              existingTags={recordingTags[recording.id] || []}
              onSave={async (tags) => {
                await saveTags(recording.id, tags);
              }}
              onClose={() => {
                const dialogClose = document.querySelector('[data-dialog-close]');
                if (dialogClose instanceof HTMLElement) {
                  dialogClose.click();
                }
              }}
            />
          </Dialog>

          <Link 
            href={`/dashboard/recordings/${recording.id}?mode=${storageLocation}`} 
            className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/30 p-0.5 rounded-sm flex items-center justify-center h-4 w-4 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
            }}
            title="View Details"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
          
          <Dialog onOpenChange={(open) => {
            // When the dialog is closed, we can ensure there are no conflicts
            if (!open) {
              // If we were going to view transcript, allow time for dialog to close
           
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-sm flex items-center justify-center flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                }}
                title="View Options"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <RecordingOptionsModal recording={recording} />
          </Dialog>
        </div>
      </div>
      
      {/* Transcript Preview */}
      {expandedRecordings[recording.id] && recording.is_processed && (
        <div className="bg-slate-50 dark:bg-slate-900/20 p-3 border-t border-slate-200 dark:border-slate-800 mx-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript Preview
            </h4>
          </div>
          {transcriptPreviews[recording.id] ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{transcriptPreviews[recording.id]}</p>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin h-4 w-4 border-2 border-slate-500 rounded-full border-t-transparent"></div>
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Loading transcript...</span>
            </div>
          )}
        </div>
      )}

      {/* Deep Analysis Panel */}
      {expandedAnalysis[recording.id] && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-t border-blue-200 dark:border-blue-800 mx-1">
          {!recording.is_processed ? (
            <div className="flex flex-col items-center justify-center py-2">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">Start Deep Analysis</p>
              <Link
                href={`/dashboard/recordings/${recording.id}?mode=${storageLocation}`}
                className="flex items-center gap-2 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Brain className="h-4 w-4" />
                Run Deep Analysis
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Deep Analysis Summary
                </h4>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchTranscriptSummary(recording.id);
                    }}
                    title="Refresh summary"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyAnalysisSummary(recording);
                    }}
                    title="Copy summary to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                </div>
              </div>
              
              {/* Display summary content */}
              {isFetchingSummary[recording.id] ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">Loading summary...</span>
                </div>
              ) : transcriptSummaries[recording.id] ? (
                <div className="text-sm space-y-1.5">
                  <p className="text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Duration:</span> {transcriptMetadata[recording.id]?.duration || formatDuration(recording.duration_seconds)}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Speakers:</span> {transcriptMetadata[recording.id]?.speakers || 2} detected
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Overall Sentiment:</span> {transcriptMetadata[recording.id]?.sentiment || "Positive"}
                  </p>
                  
                  {/* Show topics if available in meta */}
                  {transcriptMetadata[recording.id]?.meta?.topics && (
                    <div>
                      <p className="text-blue-700 dark:text-blue-300 font-medium mt-2">
                        Topics Detected:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(transcriptMetadata[recording.id].meta.topics)
                          .slice(0, 4)
                          .map(([topic, relevance], idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                              {topic}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-blue-700 dark:text-blue-300 mt-2">
                    <span className="font-medium">Key Points:</span>
                  </p>
                  <ul className="list-disc list-inside text-blue-600 dark:text-blue-400 pl-2">
                    {transcriptSummaries[recording.id]
                      ?.split('\n')
                      .filter(line => line.trim().length > 0)
                      .map((point, idx) => (
                        <li key={idx}>{point.trim().replace(/^[•-]\s*/, '')}</li>
                      ))}
                  </ul>
                  
                  {/* Show processing details if available */}
                  {transcriptMetadata[recording.id]?.meta && (
                    <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                        Processing Details:
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {transcriptMetadata[recording.id].meta.speaker_labels && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Speaker Detection
                          </p>
                        )}
                        {transcriptMetadata[recording.id].meta.timestamps && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Timestamps
                          </p>
                        )}
                        {transcriptMetadata[recording.id].meta.sentiment_analysis && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Sentiment Analysis
                          </p>
                        )}
                        {transcriptMetadata[recording.id].meta.topic_detection && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Topic Detection
                          </p>
                        )}
                        {transcriptMetadata[recording.id].meta.entity_detection && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Entity Detection
                          </p>
                        )}
                        {transcriptMetadata[recording.id].meta.summarization && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ Summary ({transcriptMetadata[recording.id].meta.summary_type || "bullets"})
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Link
                      href={`/dashboard/recordings/${recording.id}?mode=${storageLocation}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Full Analysis
                    </Link>
                  </div>
                </div>
              ) : (
              <div className="text-sm space-y-1.5">
                <p className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Duration:</span> {formatDuration(recording.duration_seconds)}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Speakers:</span> 2 detected
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Overall Sentiment:</span> Positive
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Key Points:</span>
                </p>
                <ul className="list-disc list-inside text-blue-600 dark:text-blue-400 pl-2">
                  <li>Discussion about project timeline</li>
                  <li>Budget considerations</li>
                  <li>Team resource allocation</li>
                </ul>
                <div className="pt-2">
                  <Link
                      href={`/dashboard/recordings/${recording.id}?mode=${storageLocation}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Full Analysis
                  </Link>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  ), [selectedRecording, selectedRecordings, toggleRecordingSelection]);

  // Add loading indicator to search bar
  const renderSearchBar = () => (
    <div className="relative flex-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder={`Search ${searchType === "filename" ? "file names" : 
              searchType === "transcript" ? "transcript contents" :
              searchType === "tags" ? "tags" : "interactions"}...`}
            className="pl-8 h-7 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          {isSearchingTranscripts && searchType === "transcript" && !isActiveSearch && (
            <div className="absolute right-2.5 top-1.5 flex items-center gap-1.5">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-primary rounded-full border-t-transparent"></div>
              <span className="text-xs text-muted-foreground">Searching...</span>
            </div>
          )}
        </div>
        
        {/* Add search button for all search types */}
        <Button 
          size="sm"
          className="h-7 bg-blue-500 hover:bg-blue-600"
          disabled={!searchQuery.trim() || isSearchingTranscripts || isActiveSearch}
          onClick={handleSearch}
        >
          {isActiveSearch ? (
            <div className="flex items-center gap-1.5">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent"></div>
              <span>Searching...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Search className="h-3.5 w-3.5 mr-1" />
              <span>Search</span>
            </div>
          )}
        </Button>
      </div>
      
      {/* Add progress bar for search */}
      {isActiveSearch && (
        <div className="mt-1.5 w-full">
          <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
              style={{ width: `${searchProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs text-muted-foreground">
              Searching {searchType === "transcript" ? "transcripts" : 
                searchType === "tags" ? "tags" : 
                searchType === "filename" ? "filenames" : "interactions"}...
            </span>
            <span className="text-xs text-muted-foreground">{searchProgress}% complete</span>
          </div>
        </div>
      )}
      
      {/* Add help text for search */}
      {!isActiveSearch && searchQuery.trim() && (
        <div className="mt-1">
          <p className="text-xs text-blue-500 dark:text-blue-400">
            Press Enter or click Search to search
          </p>
        </div>
      )}
    </div>
  );

  // Add bulk action controls to the search bar area
  const renderBulkActions = () => {
    // Check if any selected recordings are processed
    const hasProcessedRecordings = Array.from(selectedRecordings).some(id => 
      recordings.find(r => r.id === id)?.is_processed
    );

    return (
      <div className="flex items-center gap-2">
        {selectedRecordings.size > 0 && (
          <>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-1 flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {selectedRecordings.size} selected
              </span>
            </div>
            {hasProcessedRecordings && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Get IDs of processed recordings
                        const processedIds = Array.from(selectedRecordings).filter(id => 
                          recordings.find(r => r.id === id)?.is_processed
                        );
                        
                        // Get the processed recordings
                        const processedRecordings = recordings.filter(r => 
                          processedIds.includes(r.id)
                        );

                        // Store the selected recordings in localStorage
                        localStorage.setItem('selectedTranscripts', JSON.stringify(processedRecordings));
                        
                        // Dispatch a custom event to switch tabs
                        const event = new CustomEvent('switchTab', { detail: 'analysis' });
                        window.dispatchEvent(event);
                      }}
                      className="h-7 w-7"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send to Deep Analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete selected recordings (Delete)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedRecordings(new Set())}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear selection (Ctrl/Cmd + A)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    );
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected recordings with Delete key
      if (e.key === 'Delete' && selectedRecordings.size > 0) {
        setShowDeleteDialog(true);
      }
      
      // Select all with Ctrl/Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(recordings.map(r => r.id));
        setSelectedRecordings(prev => 
          prev.size === allIds.size ? new Set() : allIds
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecordings, recordings]);

  // Add rename handler
  const handleRename = async (id: string, newName: string, newDescription: string) => {
    try {
      const recording = recordings.find(r => r.id === id);
      if (!recording) return;

      // Keep the date part of the name if it exists
      const dateMatch = recording.name.match(/^\d{6}_\d{6}/);
      const datePart = dateMatch ? dateMatch[0] : "";
      
      // Construct the new name
      const finalName = datePart 
        ? `${datePart}_${newName.trim()}.mp3`
        : `${newName.trim()}.mp3`;

      if (storageLocation === 'local') {
        const localRecording = await indexedDBService.getRecording(id);
        if (!localRecording) {
          throw new Error('Recording not found in local storage');
        }

        await indexedDBService.updateRecording({
          ...localRecording,
          name: finalName,
          description: newDescription.trim() || null
        });
      } else {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('recordings')
          .update({ 
            name: finalName,
            description: newDescription.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      }

      // Update local state
      setRecordings(prev => prev.map(rec => 
        rec.id === id 
          ? { ...rec, name: finalName, description: newDescription.trim() || null }
          : rec
      ));
    } catch (error) {
      console.error('Error renaming recording:', error);
      throw error;
    }
  };

  // Add these memoized values near the top of the LibraryTab component
  const memoizedRecordingIds = useMemo(() => new Set(recordings.map(r => r.id)), [recordings]);

  // Memoize the checkbox toggle handler
  const memoizedToggleRecordingSelection = useCallback((recordingId: string) => {
    setSelectedRecordings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordingId)) {
        newSet.delete(recordingId);
      } else {
        newSet.add(recordingId);
      }
      return newSet;
    });
  }, []);

  // Memoize search type change handler
  const handleSearchTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchType(e.target.value as "filename" | "transcript" | "tags" | "interaction");
  }, []);

  // Memoize search query change handler
  const handleSearchQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <div className="space-y-4">
      {/* Recording Statistics */}
      
      <div className="p-3 bg-gradient-to-br from-emerald-50/80 via-slate-50/90 to-teal-50/80 dark:from-emerald-900/20 dark:via-slate-900/40 dark:to-teal-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
        <div className="flex items-center justify-between gap-4">
             {/* Storage & Refresh */}
             <div className="flex items-center gap-3 ml-4">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full border shadow-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800`}>
              <RefreshCw className="h-5 w-5" onClick={fetchRecordings} />
              <span className="text-xs font-medium">Storage:</span>
              <span className="flex items-center gap-1 text-xs font-bold">
                {storageLocation === "local" ? <Database className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                {storageLocation === "local" ? "Local" : "Cloud"}
              </span>
            </div>
          </div>
          {/* White box for all stats */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl px-6 py-3 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            {/* Stats Group 1: Totals */}
            <div className="flex items-center gap-4">
              {/* Total Recordings */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[150px]">
                <div className="h-8 w-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                  <FileAudio className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-200 leading-none">{recordings.length}</span>
                  <span className="text-xs text-blue-700/80 dark:text-blue-200/80">Recordings</span>
                </div>
              </div>
              {/* Processed */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[150px]">
                <div className="h-8 w-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-green-700 dark:text-green-200 leading-none">{recordings.filter(r => r.is_processed).length}</span>
                  <span className="text-xs text-green-700/80 dark:text-green-200/80">Processed</span>
                </div>
              </div>
              {/* Unprocessed */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[150px]">
                <div className="h-8 w-8 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-yellow-700 dark:text-yellow-200 leading-none">{recordings.filter(r => !r.is_processed).length}</span>
                  <span className="text-xs text-yellow-700/80 dark:text-yellow-200/80">Unprocessed</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            {/* Stats Group 2: Time Stats (now with Quiet and Shortest) */}
            <div className="flex items-center gap-4">
              {/* Peak Time */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[180px]">
                <div className="h-8 w-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-purple-700 dark:text-purple-200 leading-none flex items-center gap-1">{formatHour(peakTime.hour)} <span className="text-xs font-normal">({peakTime.count} recordings)</span></span>
                  <span className="text-xs text-purple-700/80 dark:text-purple-200/80">Peak Time</span>
                </div>
              </div>
              {/* Quiet Time */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[180px]">
                <div className="h-8 w-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                  <Moon className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-indigo-700 dark:text-indigo-200 leading-none flex items-center gap-1">{formatHour(quietestTime.hour)} <span className="text-xs font-normal">({quietestTime.count} recordings)</span></span>
                  <span className="text-xs text-indigo-700/80 dark:text-indigo-200/80">Quiet Time</span>
                </div>
              </div>
              {/* Longest Recording */}
              <div className="flex items-center gap-2  rounded-full px-4 py-2 min-w-[180px]">
                <div className="h-8 w-8 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-rose-700 dark:text-rose-200 leading-none flex items-center gap-1">{longestRecording.duration > 0 ? formatDuration(longestRecording.duration) : "--"} {longestRecording.date && <span className="text-xs font-normal">({longestRecording.date.toLocaleDateString()})</span>}</span>
                  <span className="text-xs text-rose-700/80 dark:text-rose-200/80">Longest Recording</span>
                </div>
              </div>
              {/* Shortest Recording */}
              <div className="flex items-center gap-2 rounded-full px-4 py-2 min-w-[180px]">
                <div className="h-8 w-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-amber-700 dark:text-amber-200 leading-none flex items-center gap-1">{shortestRecording.duration > 0 ? formatDuration(shortestRecording.duration) : "--"} {shortestRecording.date && <span className="text-xs font-normal">({shortestRecording.date.toLocaleDateString()})</span>}</span>
                  <span className="text-xs text-amber-700/80 dark:text-amber-200/80">Shortest Recording</span>
                </div>
              </div>
            </div>
          </div>

       
        </div>
      </div>

      {/* Search Bar - Full Width */}
      <div className="relative flex gap-2">
        {renderSearchBar()}
        {renderBulkActions()}
        
        {/* Tag Filters */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 flex items-center gap-1"
              >
                <TagIcon className="h-3.5 w-3.5" />
                <span>Filter by Tags</span>
                {activeTagFilters.length > 0 && (
                  <span className="ml-1 bg-primary/20 text-primary rounded-full px-1.5 text-xs">
                    {activeTagFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Filter by Tags</h4>
                {getAllUniqueTags.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {getAllUniqueTags.map(tag => (
                        <div
                          key={`${tag.name}-${tag.color}`}
                          className={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all
                            ${TAG_COLORS.find(c => c.value === tag.color)?.class}
                            ${activeTagFilters.some(t => t.name === tag.name && t.color === tag.color) 
                              ? 'ring-2 ring-primary shadow-sm' 
                              : 'opacity-70 hover:opacity-100'}`}
                          onClick={() => {
                            setActiveTagFilters(prev => {
                              const isSelected = prev.some(t => 
                                t.name === tag.name && t.color === tag.color
                              );
                              if (isSelected) {
                                return prev.filter(t => 
                                  t.name !== tag.name || t.color !== tag.color
                                );
                              } else {
                                return [...prev, tag];
                              }
                            });
                          }}
                        >
                          {tag.name}
                        </div>
                      ))}
                    </div>
                    {activeTagFilters.length > 0 && (
                      <div className="pt-2 flex justify-between items-center border-t">
                        <span className="text-xs text-muted-foreground">
                          {activeTagFilters.length} tag{activeTagFilters.length !== 1 ? 's' : ''} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTagFilters([])}
                          className="h-7 px-2 text-xs"
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    No tags available
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Tag Filters Display */}
          {activeTagFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeTagFilters.map(tag => (
                <div
                  key={`${tag.name}-${tag.color}`}
                  className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1
                    ${TAG_COLORS.find(c => c.value === tag.color)?.class}`}
                >
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                    onClick={() => setActiveTagFilters(prev => 
                      prev.filter(t => t.name !== tag.name || t.color !== tag.color)
                    )}
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={() => setActiveTagFilters([])}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
        
        <select
          className="h-7 text-xs bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={searchType}
          onChange={handleSearchTypeChange}
        >
          <option value="filename">File Name</option>
          <option value="transcript">Transcript</option>
          <option value="tags">Tags</option>
          <option value="interaction">Interaction</option>
        </select>
      </div>

      {renderDeleteDialog()}

      {/* Global Filters Row */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 py-2 px-3 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Date Range</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-6 text-xs justify-start text-left font-normal ${!dateRange?.from && "text-muted-foreground"}`}
              >
                <CalendarCheck className="mr-1 h-3 w-3" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {dateRange?.from && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setDateRange(undefined)
                setSelectedDate(null)
              }}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-blue-200 dark:bg-blue-800"></div>

        {/* Duration Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Duration</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <select
              className="h-6 text-xs bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md px-1.5 py-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as "seconds" | "minutes" | "hours")}
            >
              <option value="seconds">Sec</option>
              <option value="minutes">Min</option>
              <option value="hours">Hr</option>
            </select>

            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min"
                className="w-16 h-6 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                value={durationRange.min}
                onChange={(e) => setDurationRange(prev => ({ ...prev, min: e.target.value }))}
              />
              <span className="text-blue-600 dark:text-blue-400">-</span>
              <Input
                type="number"
                placeholder="Max"
                className="w-16 h-6 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                value={durationRange.max}
                onChange={(e) => setDurationRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>

            {(durationRange.min || durationRange.max) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-blue-100/50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                onClick={() => setDurationRange({ min: "", max: "" })}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Calendar and Media Player */}
        <div className="flex flex-col gap-4">
          {/* Calendar/Heatmap View */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-3 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800">
              <h3 className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                {viewMode === "calendar" ? "Calendar" : "Activity Heatmap"}
              </h3>
              
              {/* View Toggle for All Screens */}
              <div className="flex items-center gap-2">
                <div className="flex bg-emerald-100 dark:bg-emerald-900/30 rounded-md p-0.5 border border-emerald-200 dark:border-emerald-800">
                  <button 
                    onClick={() => {
                      setViewMode("calendar");
                      setIsWeekView(false);
                      setSelectedHourRecordings([]);
                      setSelectedHourInfo(null);
                    }}
                    className={`px-3 py-1 text-xs rounded ${viewMode === "calendar" ? "bg-white dark:bg-emerald-800 shadow-sm" : "text-emerald-700 dark:text-emerald-300"}`}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => {
                      setViewMode("heatmap");
                      setIsWeekView(true);
                      setSelectedDate(null);
                    }}
                    className={`px-3 py-1 text-xs rounded ${viewMode === "heatmap" ? "bg-white dark:bg-emerald-800 shadow-sm" : "text-emerald-700 dark:text-emerald-300"}`}
                  >
                    Heatmap
                  </button>
                </div>
                
                {/* Only show date navigation in calendar view */}
                {viewMode === "calendar" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium bg-white dark:bg-blue-900/40 px-3 py-1 rounded-md shadow-sm border border-blue-200 dark:border-blue-800">
                      {formatMonth(currentMonth)}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Show week navigation in heatmap view */}
                {viewMode === "heatmap" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => setCurrentWeek(currentWeek - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium bg-white dark:bg-indigo-900/40 px-3 py-1 rounded-md shadow-sm border border-indigo-200 dark:border-indigo-800">
                      Week {currentWeek}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => setCurrentWeek(currentWeek + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-xs ml-1 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={() => {
                        const today = new Date();
                        const currentWeekNumber = getCurrentWeek();
                        setCurrentWeek(currentWeekNumber);
                      }}
                      title="Jump to current week"
                    >
                      <Calendar className="h-3 w-3" />
                      Today
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* View Content */}
            {viewMode === "calendar" ? (
              <div className="p-3 bg-white dark:bg-background h-[400px] overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 text-xs flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(today);
                    }}
                    title="Jump to today"
                  >
                    <Calendar className="h-3 w-3" />
                    Today
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      className="text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={currentMonth.getMonth()}
                      onChange={(e) => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(parseInt(e.target.value));
                        setCurrentMonth(newMonth);
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    
                    <select 
                      className="text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={currentMonth.getFullYear()}
                      onChange={(e) => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setFullYear(parseInt(e.target.value));
                        setCurrentMonth(newMonth);
                      }}
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold py-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
           
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs p-2 border border-emerald-100 dark:border-emerald-900 rounded-lg bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 shadow-sm">
                  <div className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Legend
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-green-500 border border-white/70 dark:border-slate-800 shadow-sm flex items-center justify-center">
                        <FileText className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-green-700 dark:text-green-400">Processed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-yellow-500 border border-white/70 dark:border-slate-800 shadow-sm flex items-center justify-center">
                        <Clock className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-yellow-700 dark:text-yellow-400">Unprocessed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-blue-500 border border-white/70 dark:border-slate-800 shadow-sm flex items-center justify-center">
                        <FileAudio className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-blue-700 dark:text-blue-400">Recordings</span>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-background h-[400px] overflow-y-auto">
                <RecordingHeatmap 
                  recordings={recordings}
                  currentWeek={currentWeek}
                  onWeekChange={handleWeekChange}
                  onHourSelect={handleHourSelect}
                />
              </div>
            )}
          </Card>

          {/* Media Player */}
          <Card className="overflow-hidden">
            <div className={`p-1.5 ${selectedRecording ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'}`}>
              <h3 className="font-medium flex items-center text-sm">
                <FileAudio className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Media Player
              </h3>
              {selectedRecording && (
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center">
                  <span className="bg-emerald-200 dark:bg-emerald-800 px-1 py-0.5 rounded mr-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                    Now Playing:
                  </span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-300 truncate">
                    {formatRecordingName(selectedRecording)}
                  </span>
                </div>
              )}
            </div>
            <div className="p-2">
              {selectedRecording && audioUrl ? (
                <MediaPlayer audioUrl={audioUrl} />
              ) : selectedRecording && !audioUrl ? (
                <div className="flex flex-col items-center justify-center h-[100px] text-muted-foreground">
                  <p className="mb-2 text-sm">Loading audio...</p>
                  <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
                  Select a recording to play
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: File Tabs */}
        <Card className="overflow-hidden">
          <Tabs defaultValue="by-date">
            <div className="bg-muted p-2">
              {/* TabsList styling update: make active tab white, remove colored backgrounds */}
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="by-date" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100">
                  <Calendar className="h-4 w-4" />
                  {selectedHourInfo 
                    ? `${selectedHourInfo.day} ${selectedHourInfo.hour}:00` 
                    : viewMode === "calendar" && selectedDate
                      ? selectedDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
                      : isWeekView && viewMode === "heatmap"
                        ? `Week ${currentWeek}`
                        : "By Date"}
                </TabsTrigger>
                <TabsTrigger value="all-files" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100">
                  <FolderOpen className="h-4 w-4" />
                  All Files
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-2">
              {/* Search and Filters */}
              <div className="space-y-3 mb-4">
                {/* Sort Controls */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Sort by:
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className={`px-2 py-1 text-xs rounded ${sortBy === 'name' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs rounded ${sortBy === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => {
                        if (sortBy === 'date') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('date');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </div>
                </div>
              </div>

              <TabsContent value="by-date" className="h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading recordings...
                  </div>
                ) : (isWeekView || selectedDate || selectedHourRecordings.length > 0) && sortedFilteredDateRecordings.length > 0 ? (
                  <div className="space-y-2">
                    {/* Selected Hour Info */}
                    {selectedHourInfo && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-md mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-emerald-700 dark:text-emerald-300">
                            {selectedHourInfo.day} {selectedHourInfo.hour}:00
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            {selectedHourRecordings.length} recordings
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isWeekView && !selectedHourInfo && viewMode === "heatmap" && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-md mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-emerald-700 dark:text-emerald-300">
                            Week {currentWeek}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            {currentWeekRecordings.length} recordings
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedDate && viewMode === "calendar" && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-md mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-emerald-700 dark:text-emerald-300">
                            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            {getRecordingsForDate(selectedDate).length} recordings
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {sortedFilteredDateRecordings.map((recording) => renderRecordingItem(recording, true))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {selectedHourInfo
                      ? "No recordings found for this hour"
                      : isWeekView 
                        ? searchQuery && currentWeekRecordings.length > 0
                          ? "No recordings matching your search for this week"
                          : "No recordings for this week" 
                        : selectedDate
                          ? searchQuery && getRecordingsForDate(selectedDate).length > 0
                            ? "No recordings matching your search for this date"
                            : "No recordings for this date" 
                          : "Select a date or hour to view recordings"}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all-files" className="h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading recordings...
                  </div>
                ) : sortedFilteredRecordings.length > 0 ? (
                  <div className="space-y-2">
                    {sortedFilteredRecordings.map((recording) => renderRecordingItem(recording))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {searchQuery ? "No recordings found matching your search" : "No recordings found"}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Transcript Dialog */}
      <Dialog 
        open={showTranscriptDialog} 
        onOpenChange={(open) => {
          setShowTranscriptDialog(open);
          if (!open) {
            // Clear transcript state when dialog closes
           
              setCurrentTranscript(null);
              setCurrentTranscriptTitle("");
      
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> 
              {currentTranscriptTitle} - Transcript
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectedRecording ? downloadTranscript(selectedRecording.id, selectedRecording.name) : null}
              disabled={!currentTranscript || isLoadingTranscript}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Transcript
            </Button>
          </div>
          
          <ScrollArea className="h-[60vh]">
            {isLoadingTranscript ? (
              <div className="py-8 flex justify-center">
                <div className="animate-pulse space-y-3 w-full">
                  <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                  <div className="h-4 bg-primary/20 rounded w-full"></div>
                  <div className="h-4 bg-primary/20 rounded w-5/6"></div>
                  <div className="h-4 bg-primary/20 rounded w-4/5"></div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none p-2">
                {currentTranscript?.split('\n').map((line, idx) => {
                  // Apply special formatting to section headers
                  if (line.startsWith('SUMMARY:')) {
                    return (
                      <h3 key={idx} className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800 pb-2 mb-3">
                        {line}
                      </h3>
                    );
                  } else if (line.startsWith('FULL TRANSCRIPT:')) {
                    return (
                      <h3 key={idx} className="text-lg font-semibold text-purple-600 dark:text-purple-400 border-b border-purple-200 dark:border-purple-800 pb-2 mb-3 mt-6">
                        {line}
                      </h3>
                    );
                  } else if (line.startsWith('Duration:') || line.startsWith('Speakers:') || line.startsWith('Overall Sentiment:') || line.startsWith('Topics:') || line.startsWith('Entities:')) {
                    // Format metadata lines
                    const [label, value] = line.split(':', 2);
                    return (
                      <div key={idx} className="flex items-start mb-1">
                        <span className="font-medium text-blue-600 dark:text-blue-400 mr-2 min-w-[100px]">{label}:</span>
                        <span className="text-slate-700 dark:text-slate-300">{value}</span>
                </div>
                    );
                  } else if (line.trim() === '') {
                    // Empty line
                    return <div key={idx} className="h-2"></div>;
                  } else {
                    // Regular transcript text
                    return <p key={idx} className="my-1">{line}</p>;
                  }
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add RenameDialog */}
      <RenameDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        recording={recordingToRename}
        onSave={handleRename}
      />
    </div>
  )
}

// Tag Editor Modal Component
const TagEditorModal = ({ 
  recording, 
  onClose,
  existingTags,
  onSave
}: { 
  recording: Recording; 
  onClose: () => void;
  existingTags: Tag[];
  onSave: (tags: Tag[]) => Promise<void>;
}) => {
  const [tags, setTags] = useState<Tag[]>(existingTags);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [isSaving, setIsSaving] = useState(false);

  // Group tags by color for better organization
  const groupedTags = useMemo(() => {
    return tags.reduce((acc, tag) => {
      const colorGroup = acc[tag.color] || [];
      return {
        ...acc,
        [tag.color]: [...colorGroup, tag]
      };
    }, {} as Record<string, Tag[]>);
  }, [tags]);

  const addTag = () => {
    if (newTagName.trim()) {
      setTags([...tags, { 
        id: crypto.randomUUID(), 
        name: newTagName.trim(), 
        color: selectedColor 
      }]);
      setNewTagName('');
    }
  };

  const removeTag = (tagId: string) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(tags);
      onClose();
    } catch (error) {
      console.error('Error saving tags:', error);
      alert('Failed to save tags. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-primary" />
          Edit Tags
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {recording.name}
        </p>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Current Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Current Tags ({tags.length})</label>
            {tags.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Click on a tag to remove it
              </span>
            )}
          </div>
          
          {Object.entries(groupedTags).map(([color, colorTags]) => (
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
                    onClick={() => removeTag(tag.id)}
                    title="Click to remove"
                  >
                    <span>{tag.name}</span>
                    <TagIcon className="h-3 w-3 opacity-50" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {tags.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
              No tags added yet. Add your first tag below.
            </div>
          )}
        </div>

        {/* Add New Tag */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">Add New Tag</label>
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter tag name"
              className="flex-1"
            />
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-input rounded-md text-sm"
            >
              {TAG_COLORS.map(color => (
                <option key={color.value} value={color.value}>
                  {color.name}
                </option>
              ))}
            </select>
            <Button 
              onClick={addTag} 
              disabled={!newTagName.trim()}
              className="shrink-0"
            >
              Add Tag
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Add RenameDialog component
const RenameDialog = ({
  open,
  onOpenChange,
  recording,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
  onSave: (id: string, newName: string, newDescription: string) => Promise<void>;
}) => {
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    isSaving: false
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && recording) {
      // Remove date prefix and .mp3 extension for display
      const displayName = recording.name.replace(/^\d{6}_\d{6}_?/, "").replace(/\.mp3$/, "");
      setFormState(prev => ({
        ...prev,
        name: displayName,
        description: displayName // Set description to match name initially
      }));
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset form when dialog closes
      setFormState({
        name: "",
        description: "",
        isSaving: false
      });
    }
  }, [open, recording]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormState(prev => ({
      ...prev,
      name: newName,
      description: newName // Update description to match name
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      description: e.target.value // Allow manual description override
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recording || !formState.name.trim() || formState.isSaving) return;

    try {
      setFormState(prev => ({ ...prev, isSaving: true }));
      await onSave(recording.id, formState.name, formState.description);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setFormState(prev => ({ ...prev, isSaving: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Rename Recording
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Current Name
              </label>
              <p className="text-sm text-muted-foreground">
                {recording?.name || ""}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                New Name
              </label>
              <Input
                id="name"
                ref={inputRef}
                value={formState.name}
                onChange={handleNameChange}
                placeholder="Enter new name"
                disabled={formState.isSaving}
              />
              <p className="text-xs text-muted-foreground">
                The date prefix will be preserved automatically.
              </p>
            </div>

        
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={formState.isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={formState.isSaving || !formState.name.trim()}
            >
              {formState.isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

