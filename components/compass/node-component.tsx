"use client"
import type { Node } from "@/lib/types/compass"
import { useCompassStore } from "@/lib/store/compass-store"
import { Check, Target, User, Users, MessageCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface NodeComponentProps {
  node: Node
  onClick?: () => void
  className?: string
}

export function NodeComponent({ node, onClick, className }: NodeComponentProps) {
  const setCurrentNode = useCompassStore((state) => state.setCurrentNode)
  const colorScheme = useCompassStore((state) => state.colorScheme)

  const handleClick = () => {
    setCurrentNode(node.id)
    if (onClick) onClick()
  }

  // Determine node color based on type and color scheme
  const getNodeColor = () => {
    const baseColors = {
      default: {
        goal: "bg-blue-600",
        user: "bg-blue-500",
        predicted: "bg-blue-400",
        actual: "bg-blue-500",
      },
      business: {
        goal: "bg-indigo-700",
        user: "bg-indigo-600",
        predicted: "bg-indigo-400",
        actual: "bg-indigo-500",
      },
      professional: {
        goal: "bg-cyan-700",
        user: "bg-cyan-600",
        predicted: "bg-cyan-400",
        actual: "bg-cyan-500",
      },
      creative: {
        goal: "bg-purple-700",
        user: "bg-purple-600",
        predicted: "bg-purple-400",
        actual: "bg-purple-500",
      },
    }

    return baseColors[colorScheme]?.[node.type] || baseColors.default[node.type]
  }

  // Determine node size based on type and confidence
  const getNodeSize = () => {
    const baseSize = node.type === "goal" ? "w-16 h-16" : "w-12 h-12"

    if (node.type === "predicted" && node.confidence) {
      // Scale size based on confidence
      return node.confidence > 0.7 ? "w-14 h-14" : node.confidence > 0.4 ? "w-12 h-12" : "w-10 h-10"
    }

    return baseSize
  }

  // Get icon based on node type
  const getNodeIcon = () => {
    switch (node.type) {
      case "goal":
        return <Target className="h-6 w-6 text-white" />
      case "user":
        return <User className="h-5 w-5 text-white" />
      case "predicted":
        return <MessageCircle className="h-5 w-5 text-white" />
      case "actual":
        return node.speaker === "user" ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Users className="h-5 w-5 text-white" />
        )
      default:
        return <AlertCircle className="h-5 w-5 text-white" />
    }
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center cursor-pointer transition-all duration-300",
        getNodeColor(),
        getNodeSize(),
        node.isActive && "ring-4 ring-white ring-opacity-70",
        node.isHighlighted && "animate-pulse",
        className,
      )}
      onClick={handleClick}
      title={node.text}
    >
      {getNodeIcon()}

      {/* Confidence indicator for predicted nodes */}
      {node.type === "predicted" && node.confidence && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full text-xs w-5 h-5 flex items-center justify-center text-gray-800 font-medium border border-gray-200">
          {Math.round(node.confidence * 10)}
        </div>
      )}

      {/* Success indicator for achieved goals */}
      {node.type === "goal" && node.isHighlighted && (
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  )
}
