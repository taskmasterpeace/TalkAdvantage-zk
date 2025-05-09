"use client"

import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { parseISO, getHours, getDay, format, addWeeks, subWeeks } from "date-fns"
import { FileAudio, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecordingHeatmapProps {
  recordings: Array<{
    id: string;
    name: string;
    created_at: string;
    duration_seconds: number;
    is_processed: boolean;
  }>;
  className?: string;
  embedded?: boolean;
  currentWeek: number;
  onWeekChange: (weekNumber: number) => void;
  onHourSelect: (dayIndex: number, hourIndex: number, recordings: any[]) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i)

export function RecordingHeatmap({ 
  recordings, 
  className, 
  embedded = false, 
  currentWeek,
  onWeekChange,
  onHourSelect
}: RecordingHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{day: number, hour: number} | null>(null);

  // Get week date range for display
  const getWeekDateRange = useMemo(() => (weekNumber: number) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const firstDayOfYear = new Date(currentYear, 0, 1);
    
    // Get the first day of the week (Sunday)
    const daysOffset = firstDayOfYear.getDay();
    const firstSundayOfYear = new Date(firstDayOfYear);
    if (daysOffset > 0) {
      firstSundayOfYear.setDate(firstDayOfYear.getDate() + (7 - daysOffset));
    }
    
    // Get the start date for the week
    const startOfWeek = new Date(firstSundayOfYear);
    startOfWeek.setDate(firstSundayOfYear.getDate() + (weekNumber - 1) * 7);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return { 
      start: startOfWeek, 
      end: endOfWeek,
      formatted: `${format(startOfWeek, 'MMM d')} - ${format(endOfWeek, 'MMM d, yyyy')}`
    };
  }, []); // Empty dependency array since this calculation doesn't depend on any props/state
  
  // Get recordings for current week
  const weekRecordings = useMemo(() => {
    const { start, end } = getWeekDateRange(currentWeek);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return recordings.filter(recording => {
      const recordingDate = new Date(recording.created_at);
      return recordingDate >= start && recordingDate <= end;
    });
  }, [recordings, currentWeek]);

  // Check if a given week is the current week
  const isCurrentWeek = (weekNumber: number) => {
    const { start, end } = getWeekDateRange(weekNumber);
    const today = new Date();
    return today >= start && today <= end;
  };

  // Process recordings data into a heatmap format
  const heatmapData = useMemo(() => {
    // Create a 7×24 grid (days × hours) to hold recording counts
    const grid = Array(7).fill(0).map(() => Array(24).fill(0));
    
    // Count recordings for each day and hour
    weekRecordings.forEach((recording) => {
      const date = parseISO(recording.created_at);
      const dayIndex = getDay(date); // 0-6, Sunday is 0
      const hourIndex = getHours(date); // 0-23
      
      grid[dayIndex][hourIndex] += 1;
    });
    
    return grid;
  }, [weekRecordings]);
  
  // Find the maximum count for color intensity scaling
  const maxCount = useMemo(() => {
    let max = 0;
    heatmapData.forEach(day => {
      day.forEach(count => {
        if (count > max) max = count;
      });
    });
    return max;
  }, [heatmapData]);
  
  // Get color intensity based on count
  const getIntensity = (count: number) => {
    if (maxCount === 0) return 0;
    return Math.min(1, count / Math.max(1, maxCount));
  }
  
  // Get colored cell class based on intensity
  const getCellClass = (intensity: number, isSelected: boolean) => {
    // Create a gradient from light to dark emerald
    const baseClass = isSelected ? "ring-2 ring-emerald-500 dark:ring-emerald-400 " : "";
    
    if (intensity === 0) return baseClass + "bg-slate-100 dark:bg-slate-800";
    if (intensity < 0.2) return baseClass + "bg-emerald-100 dark:bg-emerald-900/30";
    if (intensity < 0.4) return baseClass + "bg-emerald-200 dark:bg-emerald-800/40";
    if (intensity < 0.6) return baseClass + "bg-emerald-300 dark:bg-emerald-700/60";
    if (intensity < 0.8) return baseClass + "bg-emerald-400 dark:bg-emerald-600/70";
    return baseClass + "bg-emerald-500 dark:bg-emerald-500/80";
  }
  
  // Get recordings for a specific day and hour
  const getRecordingsForCell = (dayIndex: number, hourIndex: number) => {
    const { start } = getWeekDateRange(currentWeek);
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + dayIndex);
    
    return weekRecordings.filter(recording => {
      const date = parseISO(recording.created_at);
      return getDay(date) === dayIndex && getHours(date) === hourIndex;
    });
  }
  
  // Handle cell click to select recordings
  const handleCellClick = (dayIndex: number, hourIndex: number) => {
    const cellRecordings = getRecordingsForCell(dayIndex, hourIndex);
    setSelectedCell({ day: dayIndex, hour: hourIndex });
    onHourSelect(dayIndex, hourIndex, cellRecordings);
  };
  
  // Format duration in minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Embedded view for mobile devices
  if (embedded) {
    return (
      <div className="bg-white dark:bg-background p-3">
        <div className="flex justify-between items-center mb-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => onWeekChange(currentWeek - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium text-center">
            Week {currentWeek}: {getWeekDateRange(currentWeek).formatted}
            {isCurrentWeek(currentWeek) && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Current)</span>}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => onWeekChange(currentWeek + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[auto_repeat(24,minmax(20px,1fr))] gap-1 min-w-[650px]">
            {/* Time headers */}
            <div className="sticky left-0 z-10 bg-background flex items-end justify-center h-6 text-xs text-slate-500 dark:text-slate-400">
              Hour ↓ Day →
            </div>
            {HOURS_OF_DAY.map(hour => (
              <div key={hour} className="text-center text-[10px] py-1 text-slate-500 dark:text-slate-400">
                {hour}
              </div>
            ))}
            
            {/* Day rows with hour cells */}
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <React.Fragment key={day}>
                <div className="sticky left-0 z-10 bg-background text-xs py-1 px-1 font-medium flex items-center text-emerald-600 dark:text-emerald-400">
                  {day}
                </div>
                {HOURS_OF_DAY.map(hourIndex => {
                  const count = heatmapData[dayIndex][hourIndex];
                  const intensity = getIntensity(count);
                  const isSelected = selectedCell?.day === dayIndex && selectedCell?.hour === hourIndex;
                  const cellClass = getCellClass(intensity, isSelected);
                  const recordingsForCell = getRecordingsForCell(dayIndex, hourIndex);
                  
                  return (
                    <TooltipProvider key={hourIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "aspect-square min-w-5 min-h-5 rounded-sm flex items-center justify-center text-[9px] font-medium transition-colors",
                              cellClass,
                              count > 0 ? "cursor-pointer hover:opacity-80" : ""
                            )}
                            onClick={() => count > 0 && handleCellClick(dayIndex, hourIndex)}
                          >
                            {count > 0 && count}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent hidden={count === 0}>
                          <div className="space-y-1 max-w-56">
                            <p className="font-medium text-xs">{day} {hourIndex}:00-{(hourIndex + 1) % 24}:00</p>
                            <p className="text-xs">{count} recording{count !== 1 ? 's' : ''}</p>
                            {count > 0 && (
                              <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                                {recordingsForCell.map(recording => (
                                  <div key={recording.id} className="text-xs flex items-center gap-1.5">
                                    <FileAudio className="h-3 w-3 text-emerald-500" />
                                    <span className="font-medium truncate">{recording.name}</span>
                                    <span className="text-muted-foreground">
                                      {formatDuration(recording.duration_seconds)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
                <div 
                  key={intensity} 
                  className={cn(
                    "w-4 h-4 rounded-sm", 
                    getCellClass(intensity, false)
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Less → More recordings</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {weekRecordings.length} recording{weekRecordings.length !== 1 ? 's' : ''} this week
          </div>
        </div>
      </div>
    );
  }

  // Full card when used standalone
  return (
    <Card className={cn("shadow-md overflow-hidden", className)}>
      <CardHeader className="py-2 px-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-emerald-200 dark:border-emerald-800 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center">
          <Clock className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
          Weekly Activity Heatmap
        </CardTitle>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => onWeekChange(currentWeek - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium">
            Week {currentWeek}: {getWeekDateRange(currentWeek).formatted}
            {isCurrentWeek(currentWeek) && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Current)</span>}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => onWeekChange(currentWeek + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 bg-white dark:bg-background">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[auto_repeat(24,minmax(22px,1fr))] gap-1 min-w-[700px]">
            {/* Time headers */}
            <div className="sticky left-0 z-10 bg-background flex items-end justify-center h-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Hour ↓ Day →
            </div>
            {HOURS_OF_DAY.map(hour => (
              <div key={hour} className="text-center text-[10px] py-1 text-slate-500 dark:text-slate-400">
                {hour}
              </div>
            ))}
            
            {/* Day rows with hour cells */}
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <React.Fragment key={day}>
                <div className="sticky left-0 z-10 bg-background text-xs py-1 px-1 font-medium flex items-center text-emerald-600 dark:text-emerald-400">
                  {day}
                </div>
                {HOURS_OF_DAY.map(hourIndex => {
                  const count = heatmapData[dayIndex][hourIndex];
                  const intensity = getIntensity(count);
                  const isSelected = selectedCell?.day === dayIndex && selectedCell?.hour === hourIndex;
                  const cellClass = getCellClass(intensity, isSelected);
                  const recordingsForCell = getRecordingsForCell(dayIndex, hourIndex);
                  
                  return (
                    <TooltipProvider key={hourIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "aspect-square min-w-5 min-h-5 rounded flex items-center justify-center text-[9px] font-medium transition-colors",
                              cellClass,
                              count > 0 ? "cursor-pointer hover:opacity-80" : ""
                            )}
                            onClick={() => count > 0 && handleCellClick(dayIndex, hourIndex)}
                          >
                            {count > 0 && count}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent hidden={count === 0}>
                          <div className="space-y-1 max-w-56">
                            <p className="font-medium text-xs">{day} {hourIndex}:00-{(hourIndex + 1) % 24}:00</p>
                            <p className="text-xs">{count} recording{count !== 1 ? 's' : ''}</p>
                            {count > 0 && (
                              <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                                {recordingsForCell.map(recording => (
                                  <div key={recording.id} className="text-xs flex items-center gap-1.5">
                                    <FileAudio className="h-3 w-3 text-emerald-500" />
                                    <span className="font-medium truncate">{recording.name}</span>
                                    <span className="text-muted-foreground">
                                      {formatDuration(recording.duration_seconds)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
                <div 
                  key={intensity} 
                  className={cn(
                    "w-4 h-4 rounded", 
                    getCellClass(intensity, false)
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Less → More recordings</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {weekRecordings.length} recording{weekRecordings.length !== 1 ? 's' : ''} this week
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecordingHeatmap 