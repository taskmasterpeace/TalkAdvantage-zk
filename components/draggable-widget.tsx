"use client"

import React, { useState, useEffect, useRef } from "react"
import { useLayoutStore } from "@/lib/layout-store"
import { MinusIcon, Maximize2, X, Minimize2, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/lib/settings-store"

interface DraggableWidgetProps {
  id: string
  title: string
  className?: string
  defaultPosition?: { x: number, y: number }
  defaultSize?: { width: number, height: number }
  children: React.ReactNode
  forceVisible?: boolean
}

// Resize handle styling
const resizeHandleStyle = {
  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
  backgroundSize: "4px 4px",
  backgroundPosition: "center",
  opacity: 0.5,
}

export default function DraggableWidget({ 
  id, 
  title, 
  className = "", 
  defaultPosition = { x: 0, y: 0 }, 
  defaultSize = { width: 300, height: 300 },
  children,
  forceVisible = false
}: DraggableWidgetProps) {
  const { 
    layouts, 
    activeLayoutName, 
    updateWidgetPosition, 
    updateWidgetSize,
    removeWidgetFromLayout
  } = useLayoutStore()
  const { toast } = useToast()
  const settings = useSettingsStore()
  
  // Get the current layout
  const currentLayout = layouts[activeLayoutName]
  
  // Determine if this widget should be rendered based on the current layout
  const isWidgetVisible = forceVisible || 
    (currentLayout && currentLayout.visibleWidgets.includes(id))
  
  // Get position and size from layout store or use defaults
  const position = currentLayout?.widgetPositions[id] || defaultPosition
  const size = currentLayout?.widgetSizes[id] || defaultSize
  
  // State for drag/resize
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Check if widget is minimized in the settings store
  const isMinimized = settings.minimizedWidgets.includes(id)
  
  // Check if widget is maximized
  const isMaximized = settings.maximizedWidget === id
  
  // Refs
  const widgetRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  
  // Previous position and size before maximizing
  const prevPositionSizeRef = useRef<{
    position: { x: number, y: number },
    size: { width: number, height: number }
  }>({
    position: { ...position },
    size: { ...size }
  })
  
  // Store position/size before maximizing
  useEffect(() => {
    if (!isMaximized) {
      prevPositionSizeRef.current = {
        position: { ...position },
        size: { ...size }
      }
    }
  }, [isMaximized, position, size])
  
  // Handle drag
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, e.clientX - dragOffset.x)
      const newY = Math.max(0, e.clientY - dragOffset.y)
      
      // Update position in state
      updateWidgetPosition(id, { x: newX, y: newY })
      
      // Debug message
      console.log(`Widget ${id} position: x=${newX}, y=${newY}`)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      // Ensure we save the layout when dragging ends
      useLayoutStore.getState().updateCurrentLayout()
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'grabbing'
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isDragging, dragOffset, id, updateWidgetPosition])
  
  // Handle resize
  useEffect(() => {
    if (!isResizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current) return
      
      const rect = widgetRef.current.getBoundingClientRect()
      const newWidth = Math.max(200, e.clientX - rect.left)
      const newHeight = Math.max(100, e.clientY - rect.top)
      
      // Update size in state
      updateWidgetSize(id, { width: newWidth, height: newHeight })
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      // Ensure we save the layout when resizing ends
      useLayoutStore.getState().updateCurrentLayout()
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'nwse-resize'
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isResizing, id, updateWidgetSize])
  
  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return // Don't allow dragging when maximized
    
    // Don't start drag if we clicked on a button
    if ((e.target as HTMLElement).closest('button')) return
    
    e.preventDefault()
    setIsDragging(true)
    
    const rect = widgetRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }
  
  // Handle resize start
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return // Don't allow resizing when maximized
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }
  
  // Toggle minimize - update in settings store
  const toggleMinimize = () => {
    settings.toggleMinimizeWidget(id);
    
    // If this widget is maximized, un-maximize it
    if (isMaximized) {
      settings.setMaximizedWidget(null);
    }
  }
  
  // Toggle maximize
  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore previous position/size
      updateWidgetPosition(id, prevPositionSizeRef.current.position);
      updateWidgetSize(id, prevPositionSizeRef.current.size);
      settings.setMaximizedWidget(null);
    } else {
      // Save current position/size for later restoration
      prevPositionSizeRef.current = {
        position: { ...position },
        size: { ...size }
      };
      
      // Maximize to full viewport
      updateWidgetPosition(id, { x: 0, y: 0 });
      updateWidgetSize(id, { 
        width: window.innerWidth, 
        height: window.innerHeight - 60 // Leave room for header
      });
      
      // Set this as the maximized widget in settings
      settings.setMaximizedWidget(id);
      
      // Ensure widget is not minimized when maximized
      if (isMinimized) {
        settings.toggleMinimizeWidget(id);
      }
    }
  }
  
  // Check if this widget is essential and cannot be removed
  // "live-text" is essential by default
  const isEssential = id === "live-text" || forceVisible
  
  // If this widget isn't in the current layout, don't render it
  if (!isWidgetVisible) return null
  
  return (
    <div
      ref={widgetRef}
      className={cn(
        "absolute border rounded-md shadow-md bg-background overflow-hidden",
        isMaximized && "fixed inset-0 z-50",
        isDragging && "ring-2 ring-primary/50 shadow-lg opacity-90",
        isResizing && "ring-2 ring-primary/50",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: isMaximized ? 50 : (isDragging || isResizing) ? 40 : 10,
      }}
    >
      {/* Widget header */}
      <div
        ref={headerRef}
        className={cn(
          "p-2 flex items-center gap-2 bg-muted cursor-move border-b",
          isDragging && "opacity-80"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1 font-medium text-sm flex items-center gap-2">
          <Move className="h-4 w-4 text-muted-foreground" />
          {title}
        </div>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={toggleMinimize}
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={toggleMaximize}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          {!isEssential && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-red-500 hover:text-red-600" 
              onClick={() => {
                removeWidgetFromLayout(id);
                toast({
                  title: "Widget Removed",
                  description: `Removed ${title} from the current layout`,
                });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Widget content */}
      {!isMinimized && (
        <div className="relative overflow-auto h-[calc(100%-34px)]">
          {children}
          
          {/* Resize handle - improved visibility */}
          {!isMaximized && (
            <div
              ref={resizeHandleRef}
              className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center hover:bg-primary/10"
              onMouseDown={handleResizeMouseDown}
            >
              <div 
                className="w-4 h-4"
                style={resizeHandleStyle}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
} 