"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Minus, Maximize2, X, Move } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/lib/settings-store'
import { useToast } from '@/hooks/use-toast'

interface DraggableWidgetProps {
  id: string
  title: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  forceVisible?: boolean
}

export default function DraggableWidget({
  id,
  title,
  children,
  onClose,
  className = '',
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: 400, height: 400 },
  forceVisible = false
}: DraggableWidgetProps) {
  // Get settings for the widget
  const settings = useSettingsStore()
  const { toast } = useToast()
  const enableDragDrop = settings.enableDragDrop
  const storedPosition = settings.widgetPositions[id] || defaultPosition
  const storedSize = settings.widgetSizes[id] || defaultSize
  const isMinimized = enableDragDrop && !forceVisible && settings.minimizedWidgets.includes(id)
  const isMaximized = enableDragDrop && settings.maximizedWidget === id
  
  // Local dragging state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)
  
  // Add resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Handle minimize toggle - prevent minimizing if forceVisible is true
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (forceVisible) {
      toast({
        title: "Widget Required",
        description: "This widget cannot be minimized as it's a critical component.",
        variant: "destructive"
      });
      return;
    }
    if (isMaximized) {
      settings.setMaximizedWidget(null)
    }
    settings.toggleMinimizeWidget(id)
  }
  
  // Handle maximize toggle
  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isMaximized) {
      settings.setMaximizedWidget(null)
    } else {
      settings.setMaximizedWidget(id)
      if (isMinimized) {
        settings.toggleMinimizeWidget(id)
      }
    }
  }
  
  // Start dragging
  const startDrag = (e: React.MouseEvent) => {
    if (!enableDragDrop || isMaximized || !widgetRef.current) return
    
    // Only start drag from header, not from buttons or resize handles
    const target = e.target as HTMLElement
    if (target.closest('button') || target.dataset.resize) return
    
    e.preventDefault()
    const rect = widgetRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }
  
  // Start resizing
  const startResize = (e: React.MouseEvent, edge: string) => {
    if (!enableDragDrop || isMaximized || isMinimized || !widgetRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = widgetRef.current.getBoundingClientRect()
    setIsResizing(true)
    setResizeEdge(edge)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height
    })
  }
  
  // Handle mouse move during drag or resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isResizing) {
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y
        
        // Keep within viewport
        const widgetWidth = widgetRef.current?.offsetWidth || 0
        const widgetHeight = widgetRef.current?.offsetHeight || 0
        const maxX = window.innerWidth - widgetWidth
        const maxY = window.innerHeight - widgetHeight
        
        const clampedX = Math.max(0, Math.min(newX, maxX))
        const clampedY = Math.max(0, Math.min(newY, maxY))
        
        settings.setWidgetPosition(id, { x: clampedX, y: clampedY })
      }
      
      if (isResizing && resizeEdge) {
        // Calculate new width and height based on resize direction
        let newWidth = storedSize.width
        let newHeight = storedSize.height
        let newX = storedPosition.x
        let newY = storedPosition.y
        
        // Horizontal resizing
        if (resizeEdge.includes('e')) {
          // East/right edge
          newWidth = Math.max(200, resizeStart.width + (e.clientX - resizeStart.x))
        } else if (resizeEdge.includes('w')) {
          // West/left edge
          const deltaX = e.clientX - resizeStart.x
          newWidth = Math.max(200, resizeStart.width - deltaX)
          newX = storedPosition.x + deltaX
        }
        
        // Vertical resizing
        if (resizeEdge.includes('s')) {
          // South/bottom edge
          newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y))
        } else if (resizeEdge.includes('n')) {
          // North/top edge
          const deltaY = e.clientY - resizeStart.y
          newHeight = Math.max(100, resizeStart.height - deltaY)
          newY = storedPosition.y + deltaY
        }
        
        // Update widget position if resizing from north or west edges
        if (resizeEdge.includes('w') || resizeEdge.includes('n')) {
          settings.setWidgetPosition(id, { x: newX, y: newY })
        }
        
        // Update widget size
        settings.setWidgetSize(id, { width: newWidth, height: newHeight })
      }
    }
    
    const endDragOrResize = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeEdge(null)
    }
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', endDragOrResize)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', endDragOrResize)
    }
  }, [
    isDragging, 
    isResizing, 
    dragStart, 
    resizeEdge, 
    resizeStart, 
    id, 
    settings, 
    storedPosition, 
    storedSize
  ])
  
  // Widget style based on state
  const style = isMaximized
    ? {
        position: 'fixed' as const,
        left: '5%',
        top: '5%',
        width: '90%',
        height: '90%',
        zIndex: 100,
      }
    : enableDragDrop
      ? {
          position: 'absolute' as const,
          left: `${storedPosition.x}px`,
          top: `${storedPosition.y}px`,
          zIndex: isDragging || isResizing ? 50 : 10,
          transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
          width: isMinimized ? '200px' : `${storedSize.width}px`,
          height: isMinimized ? 'auto' : `${storedSize.height}px`,
        }
      : {};
  
  return (
    <Card
      ref={widgetRef}
      className={cn(
        "overflow-hidden shadow-md relative", 
        isMinimized && "h-auto",
        isMaximized && "shadow-xl",
        isDragging && "opacity-90 cursor-grabbing",
        isResizing && "opacity-90",
        className
      )}
      style={style}
    >
      <div
        onMouseDown={startDrag}
        className={cn(
          "flex items-center justify-between p-3 bg-gradient-to-r from-accent/40 to-muted border-b",
          enableDragDrop && !isMaximized ? "cursor-grab" : "",
          isDragging && "cursor-grabbing"
        )}
      >
        <span className="font-medium text-sm flex items-center gap-1">
          {enableDragDrop && !isMaximized && (
            <Move className="h-4 w-4 text-primary" />
          )}
          {title}
        </span>
        <div className="flex items-center gap-1">
          {/* Only show control buttons when drag and drop is enabled */}
          {enableDragDrop && (
            <>
              {!isMinimized && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 border rounded-full bg-background hover:bg-accent"
                  onClick={handleMinimize}
                >
                  <Minus className="h-4 w-4 text-primary" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-7 w-7 border rounded-full bg-background hover:bg-accent",
                  isMinimized && "animate-pulse bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                )}
                onClick={isMinimized ? handleMinimize : handleMaximize}
              >
                <Maximize2 className="h-4 w-4 text-primary" />
              </Button>
            </>
          )}
          {onClose && (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border rounded-full bg-background hover:bg-accent hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {!isMinimized && (
        <div className={isMaximized ? "h-[calc(100%-40px)] overflow-auto" : "h-[calc(100%-40px)] overflow-auto"}>
          {children}
        </div>
      )}
      {isMinimized && enableDragDrop && (
        <div className="p-2 text-xs text-center text-muted-foreground italic">
          Click <Maximize2 className="inline h-3 w-3 mx-1" /> to expand
        </div>
      )}
      
      {/* Add resize handles when drag and drop is enabled and widget is not minimized or maximized */}
      {enableDragDrop && !isMinimized && !isMaximized && (
        <>
          {/* Corner resize handles */}
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20 group/resize"
            onMouseDown={(e) => startResize(e, 'se')}
            data-resize="se"
          >
            {/* Add visual resize indicator */}
            <div className="absolute bottom-1 right-1 w-4 h-4 flex items-center justify-center bg-primary/20 rounded-sm opacity-50 group-hover/resize:opacity-100 transition-opacity">
              <Move className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-20"
            onMouseDown={(e) => startResize(e, 'sw')}
            data-resize="sw"
          />
          <div 
            className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-20"
            onMouseDown={(e) => startResize(e, 'ne')}
            data-resize="ne"
          />
          <div 
            className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-20"
            onMouseDown={(e) => startResize(e, 'nw')}
            data-resize="nw"
          />
          
          {/* Edge resize handles */}
          <div 
            className="absolute top-0 left-6 right-6 h-3 cursor-n-resize z-20"
            onMouseDown={(e) => startResize(e, 'n')}
            data-resize="n"
          />
          <div 
            className="absolute bottom-0 left-6 right-6 h-3 cursor-s-resize z-20"
            onMouseDown={(e) => startResize(e, 's')}
            data-resize="s"
          />
          <div 
            className="absolute left-0 top-6 bottom-6 w-3 cursor-w-resize z-20"
            onMouseDown={(e) => startResize(e, 'w')}
            data-resize="w"
          />
          <div 
            className="absolute right-0 top-6 bottom-6 w-3 cursor-e-resize z-20"
            onMouseDown={(e) => startResize(e, 'e')}
            data-resize="e"
          />
          
          {/* Visual indicators for resize handles that appear on hover */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-1 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-1 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </>
      )}
    </Card>
  )
} 