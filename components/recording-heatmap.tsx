"use client"

import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { parseISO, getHours, getDay, format, addWeeks, subWeeks, getMonth } from "date-fns"
import { FileAudio, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getWeekNumber, getWeekDateRange, getCurrentWeek } from "@/lib/date-utils"

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

type ViewMode = 'week' | 'month' | 'year';
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function RecordingHeatmap({ 
  recordings, 
  className, 
  embedded = false, 
  currentWeek,
  onWeekChange,
  onHourSelect
}: RecordingHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{day: number, hour: number} | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

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
    const today = new Date();
    const { start, end } = getWeekDateRange(weekNumber);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
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
    if (intensity === 0) return "bg-slate-100 dark:bg-slate-800/60";
    if (intensity <= 0.25) return "bg-emerald-100 dark:bg-emerald-800";
    if (intensity <= 0.5) return "bg-emerald-300 dark:bg-emerald-600";
    if (intensity <= 0.75) return "bg-emerald-500 dark:bg-emerald-400";
    return "bg-emerald-700 dark:bg-emerald-300";
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

  // Get period label based on view mode
  const getPeriodLabel = () => {
    switch (viewMode) {
      case 'week':
        return `Week ${currentWeek}: ${getWeekDateRange(currentWeek).formatted}`;
      case 'month':
        return format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
      case 'year':
        return `${selectedYear}`;
    }
  };

  // Handle navigation
  const handlePrevious = () => {
    switch (viewMode) {
      case 'week':
        onWeekChange(currentWeek - 1);
        break;
      case 'month':
        if (selectedMonth === 0) {
          setSelectedYear(selectedYear - 1);
          setSelectedMonth(11);
        } else {
          setSelectedMonth(selectedMonth - 1);
        }
        break;
      case 'year':
        setSelectedYear(selectedYear - 1);
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'week':
        onWeekChange(currentWeek + 1);
        break;
      case 'month':
        if (selectedMonth === 11) {
          setSelectedYear(selectedYear + 1);
          setSelectedMonth(0);
        } else {
          setSelectedMonth(selectedMonth + 1);
        }
        break;
      case 'year':
        setSelectedYear(selectedYear + 1);
        break;
    }
  };

  const renderMonthView = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const monthData = Array(daysInMonth).fill(0).map(() => Array(24).fill(0));
    
    // Fill the month data
    recordings.forEach(recording => {
      const date = new Date(recording.created_at);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const day = date.getDate() - 1;
        const hour = date.getHours();
        monthData[day][hour]++;
      }
    });

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}
          </h3>
          <div className="flex gap-2">
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-[auto_repeat(31,minmax(22px,1fr))] gap-1 min-w-[800px]">
          {/* Day numbers on top */}
          <div className="sticky left-0 z-10 bg-background flex items-end justify-center h-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Hour ↓ Day →
          </div>
          {Array.from({ length: daysInMonth }, (_, i) => (
            <div key={i} className="text-center text-xs py-1 font-medium text-slate-600 dark:text-slate-400">
              {i + 1}
            </div>
          ))}
          
          {/* Hours with recordings */}
          {HOURS_OF_DAY.map(hour => (
            <React.Fragment key={hour}>
              <div className="sticky left-0 z-10 bg-background text-xs py-1 px-2 font-medium text-right text-slate-600 dark:text-slate-400">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                const count = monthData[dayIndex][hour];
                const intensity = getIntensity(count);
                const date = new Date(selectedYear, selectedMonth, dayIndex + 1, hour);
                
                return (
                  <TooltipProvider key={dayIndex}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div 
                          className={cn(
                            "aspect-square min-w-5 min-h-5 rounded-sm transition-all duration-200",
                            getCellClass(intensity, false),
                            count > 0 ? "cursor-pointer hover:ring-2 hover:ring-emerald-500/50 dark:hover:ring-emerald-400/50" : ""
                          )}
                          onClick={() => count > 0 && onHourSelect(dayIndex, hour, [])}
                        />
                      </TooltipTrigger>
                      <TooltipContent 
                        hidden={count === 0}
                        className="bg-slate-900 text-white border-slate-900 px-3 py-2"
                        side="top"
                      >
                        <p className="text-xs whitespace-nowrap font-medium">
                          {count} recording{count !== 1 ? 's' : ''} on {format(date, 'MMMM do')} at {format(date, 'HH:mm')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-6 text-sm text-slate-600 dark:text-slate-400 font-medium">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
              <div 
                key={intensity} 
                className={cn(
                  "w-[10px] h-[10px] rounded-sm", 
                  getCellClass(intensity, false)
                )}
              />
            ))}
          </div>
          <span>More</span>
          <span className="mx-1">→</span>
          <span>recordings</span>
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const totalRecordings = recordings.filter(r => new Date(r.created_at).getFullYear() === selectedYear).length;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {totalRecordings.toLocaleString()} recordings in {selectedYear}
          </h3>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1000px] rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4 shadow-md">
            {/* Month Labels */}
            <div className="flex ml-14 mb-2">
              {MONTHS.map((month) => (
                <div key={month} className="flex-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {month.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Days and Grid */}
            <div className="flex">
              {/* Day Labels */}
              <div className="flex flex-col gap-[2px] mr-4 pt-[2px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                  <div key={day} className="h-[15px] text-[11px] leading-[15px] text-right font-medium text-slate-500 dark:text-slate-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Contribution Grid */}
              <div className="flex gap-[2px]">
                {Array.from({ length: 52 }, (_, weekIndex) => {
                  const weekStart = new Date(selectedYear, 0, 1 + weekIndex * 7);
                  return (
                    <div key={weekIndex} className="flex flex-col gap-[2px]">
                      {[0, 1, 2, 3, 4].map((dayOffset) => {
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + dayOffset);
                        const isCurrentYear = date.getFullYear() === selectedYear;
                        const dayRecordings = isCurrentYear ? recordings.filter(recording => {
                          const recordingDate = new Date(recording.created_at);
                          return (
                            recordingDate.getFullYear() === date.getFullYear() &&
                            recordingDate.getMonth() === date.getMonth() &&
                            recordingDate.getDate() === date.getDate()
                          );
                        }) : [];
                        const count = dayRecordings.length;
                        const intensity = getIntensity(count);
                        return (
                          <TooltipProvider key={dayOffset}>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div 
                                  className={cn(
                                    "h-[15px] w-[15px] aspect-square rounded-sm shadow-sm transition-all duration-200 border border-slate-200 dark:border-slate-800",
                                    isCurrentYear ? getCellClass(intensity, false) : "bg-slate-100 dark:bg-slate-800",
                                    count > 0 && isCurrentYear ? "cursor-pointer hover:scale-110 hover:shadow-lg hover:ring-2 hover:ring-emerald-400/60 dark:hover:ring-emerald-400/40" : ""
                                  )}
                                  onClick={() => {
                                    if (count > 0 && isCurrentYear) {
                                      onHourSelect(dayOffset, weekIndex, dayRecordings);
                                    }
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent 
                                hidden={!isCurrentYear || count === 0}
                                className="bg-slate-900 text-white border-slate-900 px-3 py-2"
                                side="top"
                              >
                                <p className="text-xs whitespace-nowrap font-medium">
                                  {count} recording{count !== 1 ? 's' : ''} on {format(date, 'MMMM do')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-6 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <span>Less</span>
              <div className="h-3 w-32 rounded-full bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-700 mx-2 flex items-center">
                {/* Empty, just for gradient bar */}
              </div>
              <span>More</span>
              <span className="mx-1">→</span>
              <span>recordings</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update renderHeatmapGrid to use the new view renderers
  const renderHeatmapGrid = () => {
    switch (viewMode) {
      case 'week':
        return (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {getPeriodLabel()}
              </h3>
            </div>
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
                              onClick={() => count > 0 && onHourSelect(dayIndex, hourIndex, recordingsForCell)}
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
        );
      case 'month':
        return renderMonthView();
      case 'year':
        return renderYearView();
    }
  };

  // Embedded view for mobile devices
  if (embedded) {
    return (
      <div className="bg-white dark:bg-background p-3">
        <div className="flex justify-between items-center mb-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium text-center">
            {getPeriodLabel()}
            {isCurrentWeek(currentWeek) && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Current)</span>}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={handleNext}
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
      <CardHeader className="py-3 px-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="h-4 w-4 text-slate-500" />
            Recording Activity
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          {renderHeatmapGrid()}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecordingHeatmap 