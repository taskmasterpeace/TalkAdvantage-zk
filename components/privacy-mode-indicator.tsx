"use client"

import { useState, useEffect } from "react"
import { Database, Info } from "lucide-react"
import { useSettingsStore } from "@/lib/settings-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function PrivacyModeIndicator() {
  const [isLocalStorage, setIsLocalStorage] = useState(false)
  
  useEffect(() => {
    // Get initial state
    setIsLocalStorage(useSettingsStore.getState().storageLocation === "local")
    
    // Subscribe to changes
    const unsubscribe = useSettingsStore.subscribe(
      (state) => {
        setIsLocalStorage(state.storageLocation === "local")
      }
    )
    
    return () => unsubscribe()
  }, [])
  
  if (!isLocalStorage) return null
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-full bg-primary/10 cursor-help">
            <Database className="h-3.5 w-3.5" />
            <span>Privacy Mode</span>
            <Info className="h-3 w-3 ml-0.5 opacity-70" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>All recordings are saved locally on your device</p>
          <p className="text-xs opacity-70 mt-1">Your audio never leaves your device when Privacy Mode is enabled</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 