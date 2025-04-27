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
    const rootIndex = positionedNodes.findIndex((n) => n.id === rootNode.id)

    // Start with the root node in the center
    const centerX = mapDimensions.width / 2
    const centerY = mapDimensions.height / 2

    positionedNodes[rootIndex] = {
      ...rootNode,
      position: { x: centerX, y: centerY },
    }

    // Build a tree structure
    const nodeMap = new Map<string, Node>()
    const childrenMap = new Map<string, string[]>()

    positionedNodes.forEach((node) => {
      nodeMap.set(node.id, node)

      if (node.fromNodeId) {
        const children = childrenMap.get(node.fromNodeId) || []
        children.push(node.id)
        childrenMap.set(node.fromNodeId, children)
      }
    })

    // Position nodes based on layout
    const positionNode = (nodeId: string, level: number, index: number, totalSiblings: number) => {
      const node = nodeMap.get(nodeId)
      if (!node || node.position) return

      const parentNode = node.fromNodeId ? nodeMap.get(node.fromNodeId) : null
      if (!parentNode || !parentNode.position) return

      const { x: parentX, y: parentY } = parentNode.position
      let x = parentX
      let y = parentY

      const spacing = 120 // Base spacing between nodes
      const levelSpacing = spacing * (level * 0.5 + 1)

      if (layout === "radial") {
        // Radial layout - nodes are positioned in a circle around their parent
        const angleStep = (2 * Math.PI) / totalSiblings
        const angle = angleStep * index - Math.PI / 2 // Start from the top

        x = parentX + Math.cos(angle) * levelSpacing
        y = parentY + Math.sin(angle) * levelSpacing
      } else if (layout === "vertical") {
        // Vertical layout - nodes flow from top to bottom
        const siblingWidth = totalSiblings * spacing
        const startX = parentX - siblingWidth / 2 + spacing / 2

        x = startX + index * spacing
        y = parentY + levelSpacing
      } else if (layout === "horizontal") {
        // Horizontal layout - nodes flow from left to right
        const siblingHeight = totalSiblings * spacing
        const startY = parentY - siblingHeight / 2 + spacing / 2

        x = parentX + levelSpacing
        y = startY + index * spacing
      }

      // Update the node with its position
      nodeMap.set(nodeId, {
        ...node,
        position: { x, y },
      })

      // Position children
      const children = childrenMap.get(nodeId) || []
      children.forEach((childId, childIndex) => {
        positionNode(childId, level + 1, childIndex, children.length)
      })
    }

    // Position all nodes starting from the root
    const rootChildren = childrenMap.get(rootNode.id) || []
    rootChildren.forEach((childId, index) => {
      positionNode(childId, 1, index, rootChildren.length)
    })

    // Update the nodes array with positioned nodes
    return Array.from(nodeMap.values())
  }

  // Get positioned nodes
  const positionedNodes = calculateNodePositions()

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        setMapDimensions({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight,
        })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

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
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* Render beams */}
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
                thickness={beam.thickness * 2}
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
