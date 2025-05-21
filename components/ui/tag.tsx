"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface TagProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  color?: "red" | "green" | "blue" | "yellow" | "purple" | string
  onRemove?: () => void
}

const TAG_COLORS = {
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
}

export function Tag({ name, color = "blue", onRemove, className, ...props }: TagProps) {
  const colorClasses = TAG_COLORS[color as keyof typeof TAG_COLORS] || TAG_COLORS.blue

  return (
    <div
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity",
        colorClasses,
        className
      )}
      {...props}
    >
      <span>{name}</span>
      {onRemove && (
        <X
          className="h-3 w-3 opacity-50 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        />
      )}
    </div>
  )
} 