"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Settings, Target, Maximize2, Minimize2 } from "lucide-react"
import { useCompassStore } from "@/lib/store/compass-store"
import { CompassMap } from "./compass/compass-map"
import { GuidedConversation } from "./compass/guided-conversation"
import { TrackingMode } from "./compass/tracking-mode"
import { cn } from "@/lib/utils"

interface ConversationCompassProps {
  hasContent: boolean
}

export default function ConversationCompass({ hasContent }: ConversationCompassProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Get state and actions from the compass store
  const {
    mode,
    nodes,
    goal,
    setMode,
    setGoal,
    addNode,
    setCurrentNode,
  } = useCompassStore()

  // Initialize the compass with a default goal if none exists
  useEffect(() => {
    if (!goal && nodes.length === 0) {
      // Set a default goal
      setGoal("Track conversation flow and topics")
      
      // Create initial goal node
      const goalNodeId = addNode({
        type: "goal",
        text: "Track conversation flow and topics",
        fromNodeId: null,
        isActive: true,
        speaker: "system"
      })
      
      // Set as current node
      setCurrentNode(goalNodeId)
    }
  }, [goal, nodes, setGoal, addNode, setCurrentNode])

  // Consider the compass to have content if there's a goal or nodes
  const hasCompassContent = Boolean(goal) || nodes.length > 0

  if (!hasCompassContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Target className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Conversation Compass</h3>
        <p className="text-muted-foreground mb-4">
          Start recording to visualize conversation flow and get AI-powered guidance.
        </p>
        <Button variant="outline" disabled>
          Setup Compass
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", isFullscreen && "fixed inset-0 z-50 bg-background")}>
      <div className="flex items-center justify-between p-2">
        <Tabs value={mode} onValueChange={setMode as (value: string) => void} className="w-auto">
          <TabsList className="grid w-[300px] grid-cols-3">
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="guided">Guided</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Tabs value={mode} className="flex-1 flex flex-col">
        <TabsContent value="tracking" className="flex-1 m-0 p-0">
          {/* Tracking mode */}
          <TrackingMode />
        </TabsContent>

        <TabsContent value="guided" className="flex-1 m-0 p-0 flex">
          {/* Guided mode - visualization + conversation guidance */}
          <div className="flex-1 p-2 relative">
            <CompassMap />
          </div>

          <div className="w-80 border-l">
            <GuidedConversation />
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="flex-1 m-0 p-0">
          {/* Visualization only mode */}
          <div className="flex-1 p-2 relative">
            <CompassMap />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
