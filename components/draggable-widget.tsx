"use client"

import React, { useState, useRef } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'
import { Button } from './ui/button'

interface DraggableWidgetProps {
  id: string
  title: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
  defaultPosition?: { x: number; y: number }
}

export default function DraggableWidget({
  id,
  title,
  children,
  onClose,
  className = '',
  defaultPosition = { x: 0, y: 0 }
}: DraggableWidgetProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isMinimized, setIsMinimized] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!widgetRef.current) return
    
    const rect = widgetRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 1000 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className={`bg-card border rounded-lg shadow-lg transition-transform ${className}`}
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-2 bg-muted/50 rounded-t-lg cursor-grab border-b"
      >
        <span className="font-medium text-sm">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className={isMinimized ? 'hidden' : ''}>
        {children}
      </div>
    </div>
  )
} 