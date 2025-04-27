"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedBeamProps {
  startX: number
  startY: number
  endX: number
  endY: number
  thickness?: number
  color?: string
  animated?: boolean
  isActive?: boolean
  className?: string
}

export function AnimatedBeam({
  startX,
  startY,
  endX,
  endY,
  thickness = 2,
  color = "#3b82f6",
  animated = true,
  isActive = false,
  className,
}: AnimatedBeamProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState(0)

  // Calculate control points for a curved path
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // Add some curvature
  const curveOffset = Math.min(100, Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 3)

  // Path data for a curved line
  const pathData = `M ${startX},${startY} Q ${midX},${midY - curveOffset} ${endX},${endY}`

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [startX, startY, endX, endY])

  return (
    <svg className={cn("absolute top-0 left-0 w-full h-full pointer-events-none", className)} style={{ zIndex: -1 }}>
      <defs>
        <linearGradient
          id={`beam-gradient-${startX}-${startY}-${endX}-${endY}`}
          gradientUnits="userSpaceOnUse"
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={pathData}
        fill="none"
        stroke={`url(#beam-gradient-${startX}-${startY}-${endX}-${endY})`}
        strokeWidth={thickness}
        strokeLinecap="round"
        className={cn("transition-all duration-300", isActive && "stroke-[3px]", animated && "animate-dash")}
        style={
          animated
            ? {
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength,
                animation: `dash 1.5s ease-in-out forwards`,
              }
            : {}
        }
      />

      {/* Animated particles along the path */}
      {animated && (
        <circle r={thickness * 0.8} fill={color} className="animate-pulse">
          <animateMotion dur="3s" repeatCount="indefinite" path={pathData} />
        </circle>
      )}
    </svg>
  )
}

// Add this to your globals.css or create a style tag
// @keyframes dash {
//   to {
//     stroke-dashoffset: 0;
//   }
// }
