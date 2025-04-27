"use client"

import type React from "react"

import { useTrackingStore } from "@/lib/store/tracking-store"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Lightbulb, Link, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ExpansionDisplay() {
  const { expansions, isProcessing, currentThought } = useTrackingStore()

  // Group expansions by type
  const followUps = expansions.filter((item) => item.type === "follow-up")
  const examples = expansions.filter((item) => item.type === "example")
  const relatedTopics = expansions.filter((item) => item.type === "related-topic")
  const reflections = expansions.filter((item) => item.type === "reflection")

  return (
    <div className="space-y-4 p-4">
      {/* Current thought display */}
      {currentThought && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-1">Current thought:</div>
            <div className="text-sm text-muted-foreground">"{currentThought.text}"</div>
          </CardContent>
        </Card>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Generating expansions...</span>
        </div>
      )}

      {/* No expansions yet message */}
      {!isProcessing && expansions.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <RefreshCw className="h-5 w-5 mx-auto mb-2" />
          <p className="text-sm">Waiting for your thoughts...</p>
        </div>
      )}

      {/* Follow-up questions */}
      {followUps.length > 0 && (
        <ExpansionSection
          title="Follow-up Questions"
          icon={<HelpCircle className="h-4 w-4" />}
          items={followUps}
          badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        />
      )}

      {/* Examples */}
      {examples.length > 0 && (
        <ExpansionSection
          title="Example to Use"
          icon={<Lightbulb className="h-4 w-4" />}
          items={examples}
          badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        />
      )}

      {/* Related topics */}
      {relatedTopics.length > 0 && (
        <ExpansionSection
          title="Related Topics"
          icon={<Link className="h-4 w-4" />}
          items={relatedTopics}
          badgeColor="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        />
      )}

      {/* Reflections */}
      {reflections.length > 0 && (
        <ExpansionSection
          title="Reflection"
          icon={<RefreshCw className="h-4 w-4" />}
          items={reflections}
          badgeColor="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        />
      )}
    </div>
  )
}

interface ExpansionSectionProps {
  title: string
  icon: React.ReactNode
  items: Array<{ id: string; text: string }>
  badgeColor: string
}

function ExpansionSection({ title, icon, items, badgeColor }: ExpansionSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <Badge variant="outline" className={cn("mt-0.5", badgeColor)}>
              {title === "Follow-up Questions"
                ? "Q"
                : title === "Example to Use"
                  ? "Ex"
                  : title === "Related Topics"
                    ? "Topic"
                    : "Reflect"}
            </Badge>
            <span className="text-sm">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
