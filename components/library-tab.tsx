"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { RefreshCw, ChevronLeft, ChevronRight, Search, FileAudio, Clock, Calendar, Download, FileText, MoreHorizontal, ArrowUpRight, CalendarCheck, Brain, Zap, Cloud, Database, ExternalLink, Settings, Moon, ArrowDownRight, FolderOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import MediaPlayer from "./media-player"
import { getSupabaseClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { r2Service } from "@/lib/cloudflare/r2-service"
import { unifiedRecordingsService } from "@/lib/recordings-service"
import { useSettingsStore } from "@/lib/settings-store"
import { indexedDBService } from "@/lib/indexeddb/indexed-db-service"
import RecordingHeatmap from "./recording-heatmap"

// Update the downloadTranscript function to handle unprocessed recordings
const downloadTranscript = async (recordingId: string, recordingName: string) => {
  try {
    // Check if we should use local storage (from cookies)
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('storageLocation='))
      ?.split('=')[1];
      
    const storageLocation = cookieValue || 'cloud';
    
    let transcriptText: string;
    
    if (storageLocation === 'local') {
      console.log("Downloading local recording transcript", { recordingId });
      try {
        const localRecording = await indexedDBService.getRecording(recordingId);
        if (localRecording?.transcript) {
          console.log("Found local transcript for download");
          transcriptText = localRecording.transcript;
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
      
      // Get transcript
      const { data, error } = await supabase
        .from("transcripts")
        .select("full_text")
        .eq("recording_id", recordingId)
        .single()
      
      if (error || !data) {
        console.error("Error fetching transcript:", error)
        alert("No transcript available. This recording may not have been processed yet.")
        return
      }
      
      transcriptText = data.full_text;
    }
    
    // Create a blob with the transcript text
    const blob = new Blob([transcriptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    // Create download link and trigger click
    const a = document.createElement("a")
    a.href = url
    a.download = `${recordingName}-transcript.txt`
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading transcript:", error)
    alert("Error downloading transcript.")
  }
}

interface Recording {
  id: string
  name: string
  description: string | null
  duration_seconds: number // maps to durationSeconds in the service
  created_at: string      // maps to createdAt in the service
  is_processed: boolean   // maps to isProcessed in the service
  storage_path: string    // maps to storagePath in the service
  user_id: string         // maps to userId in the service
}

interface PeakTimeResult {
  hour: number;
  count: number;
  daysCount?: number;
}

export default function LibraryTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(null)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)
  const [currentTranscriptTitle, setCurrentTranscriptTitle] = useState("")
  // Add state for transcript previews
  const [transcriptPreviews, setTranscriptPreviews] = useState<Record<string, string>>({})
  const [expandedRecordings, setExpandedRecordings] = useState<Record<string, boolean>>({})
  // Get storage location from settings
  const storageLocation = useSettingsStore(state => state.storageLocation)
  // Add sort state
  const [sortBy, setSortBy] = useState<"name" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"calendar" | "heatmap">("calendar")
  
  // Add duration filter states
  const [durationUnit, setDurationUnit] = useState<"seconds" | "minutes" | "hours">("minutes")
  const [durationRange, setDurationRange] = useState<{ min: string; max: string }>({ min: "", max: "" })
  
  // Week navigation state
  const [currentWeek, setCurrentWeek] = useState<number>(0)
  const [isWeekView, setIsWeekView] = useState<boolean>(false)
  const [selectedHourRecordings, setSelectedHourRecordings] = useState<Recording[]>([])
  const [selectedHourInfo, setSelectedHourInfo] = useState<{day: string, hour: number} | null>(null)
  
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
    const currentWeekNumber = getWeekNumber(today);
    console.log("Current week calculation:", { 
      today, 
      currentWeekNumber, 
      calculated: getWeekNumber(today) 
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
      setLoading(true)
      const supabase = getSupabaseClient()
      
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("User not authenticated")
        setLoading(false)
        return
      }

      // Use the unified recordings service instead of directly querying Supabase
      const data = await unifiedRecordingsService.getRecordings(user.id)
      
      // Map the returned data to match our local interface
      const mappedData = data.map(rec => ({
        id: rec.id,
        name: rec.name,
        description: rec.description || null,
        duration_seconds: rec.durationSeconds,
        created_at: rec.createdAt,
        is_processed: rec.isProcessed,
        storage_path: rec.storagePath,
        user_id: rec.userId
      }));
      
      setRecordings(mappedData)
    } catch (error) {
      console.error("Error fetching recordings:", error)
    } finally {
      setLoading(false)
    }
  }

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
      return (
        recordingDate.getDate() === date.getDate() &&
        recordingDate.getMonth() === date.getMonth() &&
        recordingDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Get recordings for the selected week
  const getRecordingsForWeek = (weekNumber: number) => {
    if (!recordings.length || weekNumber === 0) return [];
    
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
    startOfWeek.setDate(firstSundayOfYear.getDate() + (weekNumber - 1) * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log("Fetching recordings for week:", { 
      weekNumber, 
      startOfWeek, 
      endOfWeek 
    });
    
    return recordings.filter((recording) => {
      const recordingDate = new Date(recording.created_at);
      return recordingDate >= startOfWeek && recordingDate <= endOfWeek;
    });
  };

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
    // Extract date and time from the created_at field
    const date = new Date(recording.created_at);
    
    // Format as YYMMDD_HHMMSS
    const yy = date.getFullYear().toString().substring(2); // Last 2 digits of year
    const mm = (date.getMonth() + 1).toString().padStart(2, '0'); // Month (1-12)
    const dd = date.getDate().toString().padStart(2, '0'); // Day
    
    const hh = date.getHours().toString().padStart(2, '0'); // Hours
    const min = date.getMinutes().toString().padStart(2, '0'); // Minutes
    const ss = date.getSeconds().toString().padStart(2, '0'); // Seconds
    
    // Basic format: YYMMDD_HHMMSS
    let formattedName = `${yy}${mm}${dd}_${hh}${min}${ss}`;
    
    // Check if the name includes a description/bookmark
    if (recording.description) {
      // Format with bookmark: YYMMDD_HHMM_Description
      formattedName = `${yy}${mm}${dd}_${hh}${min}_${recording.description}`;
    }
    
    return `${formattedName}.mp3`;
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

  // Update filtered recordings to include duration filter
  const filteredRecordings = recordings
    .filter(recording => {
      const formattedName = formatRecordingName(recording).toLowerCase();
      return recording.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formattedName.includes(searchQuery.toLowerCase()) ||
        (recording.description && recording.description.toLowerCase().includes(searchQuery.toLowerCase()))
    })
    .filter(recording => filterByDurationRange([recording]).length > 0);

  // Update filtered date recordings as well
  const filteredDateRecordings = useMemo(() => {
    const sourceRecordings = selectedHourRecordings.length > 0 ? 
      selectedHourRecordings : 
      (isWeekView && viewMode === "heatmap" ? 
        getRecordingsForWeek(currentWeek) : 
        getRecordingsForDate(selectedDate));
    
    return sourceRecordings
      .filter(recording => {
        const formattedName = formatRecordingName(recording).toLowerCase();
        return recording.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formattedName.includes(searchQuery.toLowerCase()) ||
          (recording.description && recording.description.toLowerCase().includes(searchQuery.toLowerCase()))
      })
      .filter(recording => filterByDurationRange([recording]).length > 0);
  }, [selectedHourRecordings, isWeekView, currentWeek, selectedDate, searchQuery, recordings, viewMode, durationRange, durationUnit]);

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
          `}
          onClick={() => {
            // When selecting a calendar date, clear hour selections
            setSelectedHourRecordings([]);
            setSelectedHourInfo(null);
            setSelectedDate(date);
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-0.5">
              <span className={`text-[10px] font-medium ${isToday ? "text-white bg-primary h-4 w-4 flex items-center justify-center rounded-full" : ""}`}>
                {i}
              </span>
              {isToday && !isSelected && (
                <span className="text-[7px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-0.5 rounded-sm">Today</span>
              )}
            </div>
            {hasRecordings && (
              <div className={`flex items-center gap-0.5 ${indicatorBgClass} px-1 py-0.5 rounded-full`}>
                <span className={`h-1.5 w-1.5 rounded-full ${indicatorColorClass} border border-white/50 dark:border-gray-800/50`}></span>
                <span className={`text-[8px] font-medium ${indicatorTextClass}`}>{recordingsCount}</span>
              </div>
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
                    <span className="text-yellow-600 dark:text-yellow-400"> • {unprocessedCount} UnProceesed</span>
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
      setIsLoadingTranscript(true)
      setCurrentTranscriptTitle(recording.name)
      setShowTranscriptDialog(true)
      
      // Check if we should use local storage (from cookies)
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('storageLocation='))
        ?.split('=')[1];
        
      const storageLocation = cookieValue || 'cloud';
      
      if (storageLocation === 'local') {
        console.log("Fetching local recording transcript", { recordingId: recording.id });
        try {
          const localRecording = await indexedDBService.getRecording(recording.id);
          if (localRecording && localRecording.transcript) {
            console.log("Found local transcript, length:", localRecording.transcript.length);
            setCurrentTranscript(localRecording.transcript);
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
        
        // Get transcript
        const { data, error } = await supabase
          .from("transcripts")
          .select("full_text")
          .eq("recording_id", recording.id)
          .single()
        
        if (error) {
          console.error("Error fetching transcript:", error)
          setCurrentTranscript("No transcript found. This recording may not have been processed yet.")
          return
        }
        
        setCurrentTranscript(data?.full_text || "No transcript text available.")
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
      // Check if we already have the preview
      if (transcriptPreviews[recordingId]) {
        return;
      }
      
      // Check if we should use local storage (from cookies)
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('storageLocation='))
        ?.split('=')[1];
        
      const storageLocation = cookieValue || 'cloud';
      
      if (storageLocation === 'local') {
        console.log("Fetching local recording transcript preview", { recordingId });
        try {
          const localRecording = await indexedDBService.getRecording(recordingId);
          
          if (localRecording?.transcript) {
            console.log("Found local transcript for preview");
            // Get the first 150 characters as a preview
            const previewText = localRecording.transcript.substring(0, 150) + 
              (localRecording.transcript.length > 150 ? "..." : "");
              
            setTranscriptPreviews(prev => ({
              ...prev,
              [recordingId]: previewText
            }));
          } else {
            console.log("No local transcript found for preview");
            setTranscriptPreviews(prev => ({
              ...prev,
              [recordingId]: "No transcript available."
            }));
          }
        } catch (localError) {
          console.error("Error accessing IndexedDB for preview:", localError);
          setTranscriptPreviews(prev => ({
            ...prev,
            [recordingId]: "Error loading transcript."
          }));
        }
      } else {
        // For cloud recordings, fetch from Supabase as before
        console.log("Fetching cloud recording transcript preview", { recordingId });
        const supabase = getSupabaseClient();
        
        // Get transcript
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
        
        // Get the first 150 characters as a preview
        const previewText = data.full_text.substring(0, 150) + (data.full_text.length > 150 ? "..." : "");
        
        setTranscriptPreviews(prev => ({
          ...prev,
          [recordingId]: previewText
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
    // We'll use DialogClose to wrap our buttons
    
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
      viewTranscript(recording);
    };
    
    const handleDownloadTranscript = () => {
      downloadTranscript(recording.id, recording.name);
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
          <div className="flex gap-2 mb-4 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {recording.duration_seconds > 0 ? formatDuration(recording.duration_seconds) : "Processing..."}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
              </div>
            </div>
            <div className="ml-auto">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${recording.is_processed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'}`}>
                {recording.is_processed ? 'Processed' : 'Unprocessed'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Transcript Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-start bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-900"
                    onClick={handleViewTranscript}
                    disabled={!recording.is_processed}
                  >
                    <FileText className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium">View Transcript</span>
                  </Button>
                </DialogClose>
                
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-start bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-900"
                    onClick={handleDownloadTranscript}
                    disabled={!recording.is_processed}
                  >
                    <Download className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Download</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Analysis Options</h4>
              <div className="grid grid-cols-2 gap-3">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-start bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-900"
                    onClick={handleDeepAnalysis}
                  >
                    <Brain className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium">Deep Analysis</span>
                  </Button>
                </DialogClose>
                
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-start bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-900"
                    onClick={handleLiveAnalysis}
                  >
                    <Zap className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium">Live Analysis</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
            
            <div className="pt-2">
              <DialogClose asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGoToDate}
                  className="flex items-center justify-center w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-900"
                >
                  <CalendarCheck className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium">Go to Date on Calendar</span>
                </Button>
              </DialogClose>
            </div>
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

  return (
    <div className="space-y-6">
      {/* Recording Statistics */}
      <div className="p-3 bg-gradient-to-br from-emerald-50/80 via-slate-50/90 to-teal-50/80 dark:from-emerald-900/20 dark:via-slate-900/40 dark:to-teal-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
        <div className="flex items-center justify-between gap-4">
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
                        const currentWeekNumber = getWeekNumber(today);
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
                {/* Search Input */}
          <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search files..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
            </div>

                {/* Duration Range Filter */}
                <div className="flex flex-wrap items-center gap-3 p-2 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Duration Filter</span>
          </div>
                    <select
                      className="text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-600"
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as "seconds" | "minutes" | "hours")}
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
          </div>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 min-w-[140px]">
                      <Input
                        type="number"
                        placeholder="Min"
                        className="w-16 h-7 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                        value={durationRange.min}
                        onChange={(e) => setDurationRange(prev => ({ ...prev, min: e.target.value }))}
                      />
                      <span className="text-blue-600 dark:text-blue-400">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        className="w-16 h-7 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                        value={durationRange.max}
                        onChange={(e) => setDurationRange(prev => ({ ...prev, max: e.target.value }))}
                      />
        </div>

                    {(durationRange.min || durationRange.max) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-blue-100/50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        onClick={() => setDurationRange({ min: "", max: "" })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {(durationRange.min || durationRange.max) && (
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {`${durationRange.min || '0'} - ${durationRange.max || '∞'} ${durationUnit}`}
                    </div>
                  )}
                </div>

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
                            {getRecordingsForWeek(currentWeek).length} recordings
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
                    
                    {sortedFilteredDateRecordings.map((recording) => (
                      <div 
                        key={recording.id}
                        className={`border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors 
                          ${selectedRecording?.id === recording.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedRecording(recording);
                        }}
                      >
                        <div className="flex items-center gap-0.5 px-2 py-1">
                          <span className="text-slate-500 text-[10px]">♪</span>
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate mr-auto">{formatRecordingName(recording)}</span>
                          
                          <span className={`h-1 w-1 rounded-full flex-shrink-0 ${recording.is_processed ? 'bg-green-500' : 'bg-yellow-500'} mx-0.5`} title={recording.is_processed ? "Processed" : "Not processed"} />
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
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
                            
                            <Link 
                              href={`/dashboard/recordings/${recording.id}`} 
                              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/30 p-0.5 rounded-sm flex items-center justify-center h-4 w-4 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation() // Prevent also selecting the recording
                              }}
                              title="View Details"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-sm flex items-center justify-center flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation() // Prevent also selecting the recording
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
                          <div className="text-[8px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 p-0.5 border-t border-slate-200 dark:border-slate-800 mx-1">
                            {transcriptPreviews[recording.id] ? (
                              <p className="leading-tight">{transcriptPreviews[recording.id]}</p>
                            ) : (
                              <div className="flex items-center justify-center py-0.5">
                                <div className="animate-spin h-1.5 w-1.5 border border-primary rounded-full border-t-transparent"></div>
                                <span className="ml-1">Loading transcript...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {selectedHourInfo
                      ? "No recordings found for this hour"
                      : isWeekView 
                        ? searchQuery && getRecordingsForWeek(currentWeek).length > 0
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
                    {sortedFilteredRecordings.map((recording) => (
                      <div 
                        key={recording.id}
                        className={`border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors 
                          ${selectedRecording?.id === recording.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedRecording(recording);
                        }}
                      >
                        <div className="flex items-center gap-1 px-2 py-0.5">
                          <span className="text-emerald-500">♪</span>
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate mr-auto">{formatRecordingName(recording)}</span>
                          
                          <span className={`h-1 w-1 rounded-full flex-shrink-0 ${recording.is_processed ? 'bg-emerald-500' : 'bg-yellow-500'} mx-1`} title={recording.is_processed ? "Processed" : "Not processed"} />
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
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
                                className="h-4 w-4 p-0 flex-shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                title="Show/hide transcript preview"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTranscriptPreview(recording.id, recording.is_processed);
                                }}
                              >
                                <FileText className="h-2.5 w-2.5 text-emerald-500" />
                              </Button>
                            )}
                            
                            <Link 
                              href={`/dashboard/recordings/${recording.id}`} 
                              className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 p-1 rounded-sm flex items-center justify-center h-5 w-5 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                              title="View Details"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 rounded-sm flex items-center justify-center flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                  }}
                                  title="View Options"
                                >
                                  <Settings className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                              </DialogTrigger>
                              <RecordingOptionsModal recording={recording} />
                            </Dialog>
                          </div>
                        </div>
                        
                        {/* Transcript Preview */}
                        {expandedRecordings[recording.id] && recording.is_processed && (
                          <div className="text-[9px] text-slate-600 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 p-1 border-t border-emerald-200 dark:border-emerald-800 mx-1">
                            {transcriptPreviews[recording.id] ? (
                              <p className="leading-tight">{transcriptPreviews[recording.id]}</p>
                            ) : (
                              <div className="flex items-center justify-center py-0.5">
                                <div className="animate-spin h-2 w-2 border border-emerald-500 rounded-full border-t-transparent"></div>
                                <span className="ml-1">Loading transcript...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
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
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="space-y-2">
                  {currentTranscript?.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

