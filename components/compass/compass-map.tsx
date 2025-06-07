"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useCompassStore } from "@/lib/store/compass-store"
import { NodeComponent } from "./node-component"
import { AnimatedBeam } from "./animated-beam"
import type { Node } from "@/lib/types/compass"
import { PlusCircle, MinusCircle, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CompassMapProps {
  className?: string
}

export function CompassMap({ className }: CompassMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 400 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Get state from the compass store
  const { nodes, beams, currentNodeId, zoomLevel, viewportOffset, layout, setZoomLevel, setViewportOffset } =
    useCompassStore()

  // Calculate node positions based on layout
  const calculateNodePositions = () => {
    const positionedNodes = [...nodes]
    if (positionedNodes.length === 0) return positionedNodes

    // Find the goal node (root)
    const rootNode = positionedNodes.find((n) => n.type === "goal") || positionedNodes[0]
    if (!rootNode) return positionedNodes

    const rootIndex = positionedNodes.findIndex((n) => n.id === rootNode.id)

    // Start with the root node in the center
    const centerX = mapDimensions.width / 2
    const centerY = mapDimensions.height / 4 // Position root node at 1/4 from top

    positionedNodes[rootIndex] = {
      ...rootNode,
      position: { x: centerX, y: centerY },
    }

    // Build a tree structure
    const nodeMap = new Map<string, Node>()
    const childrenMap = new Map<string, string[]>()

    // First pass: build node map and find direct children
    positionedNodes.forEach((node) => {
      nodeMap.set(node.id, node)
      if (node.fromNodeId) {
        const children = childrenMap.get(node.fromNodeId) || []
        children.push(node.id)
        childrenMap.set(node.fromNodeId, children)
      }
    })

    // Position nodes in a tree layout
    const positionNode = (nodeId: string, level: number, index: number, totalSiblings: number, parentX: number, parentY: number) => {
      const node = nodeMap.get(nodeId)
      if (!node || node.position) return

      const verticalSpacing = mapDimensions.height / 4 // Adjust vertical spacing based on map height
      const horizontalSpacing = Math.min(150, mapDimensions.width / (totalSiblings + 1)) // Adjust horizontal spacing based on map width
      const levelWidth = totalSiblings * horizontalSpacing
      const startX = parentX - levelWidth / 2 + horizontalSpacing / 2

      // Calculate position
      const x = startX + index * horizontalSpacing
      const y = parentY + verticalSpacing

      // Update node position
      const updatedNode = {
        ...node,
        position: { x, y },
      }
      nodeMap.set(nodeId, updatedNode)

      // Position children
      const children = childrenMap.get(nodeId) || []
      children.forEach((childId, childIndex) => {
        positionNode(childId, level + 1, childIndex, children.length, x, y)
      })
    }

    // Position all nodes starting from the root
    const rootChildren = childrenMap.get(rootNode.id) || []
    rootChildren.forEach((childId, index) => {
      positionNode(childId, 1, index, rootChildren.length, centerX, centerY)
    })

    return Array.from(nodeMap.values())
  }

  // Get positioned nodes and update dimensions on mount and resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        setMapDimensions({
          width: rect.width,
          height: rect.height,
        })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Get positioned nodes
  const positionedNodes = calculateNodePositions()

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    setViewportOffset({
      x: viewportOffset.x + dx,
      y: viewportOffset.y + dy,
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.1, 0.5))
  }

  // Reset view
  const handleResetView = () => {
    setZoomLevel(1)
    setViewportOffset({ x: 0, y: 0 })
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 bg-background/80">
          <PlusCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 bg-background/80">
          <MinusCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleResetView} className="h-8 w-8 bg-background/80">
          <Target className="h-4 w-4" />
        </Button>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        className={cn("w-full h-full relative", isDragging ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transform container for zoom and pan */}
        <div
          className="absolute w-full h-full"
          style={{
            transform: `scale(${zoomLevel}) translate(${viewportOffset.x / zoomLevel}px, ${viewportOffset.y / zoomLevel}px)`,
            transformOrigin: "top center",
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* Render beams (connections between nodes) */}
          {beams.map((beam) => {
            const fromNode = positionedNodes.find((n) => n.id === beam.fromNodeId)
            const toNode = positionedNodes.find((n) => n.id === beam.toNodeId)

            if (!fromNode?.position || !toNode?.position) return null

            return (
              <AnimatedBeam
                key={beam.id}
                startX={fromNode.position.x}
                startY={fromNode.position.y}
                endX={toNode.position.x}
                endY={toNode.position.y}
                thickness={2}
                isActive={beam.isActive}
                animated={toNode.type === "predicted"}
              />
            )
          })}

          {/* Render nodes */}
          {positionedNodes.map((node) => (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: node.position?.x,
                top: node.position?.y,
              }}
            >
              <NodeComponent node={node} />

              {/* Node text label */}
              <div
                className={cn(
                  "absolute mt-2 text-xs max-w-[120px] text-center",
                  node.isActive ? "font-medium" : "text-muted-foreground",
                )}
                style={{
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {node.text.length > 30 ? `${node.text.substring(0, 30)}...` : node.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
