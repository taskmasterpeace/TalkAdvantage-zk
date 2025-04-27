"use client"

import { useState, useEffect } from "react"
import { useCompassStore } from "@/lib/store/compass-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Mic, MicOff, Send, Target, MessageCircle, RotateCcw } from "lucide-react"
import { evaluateGoalProgress } from "@/lib/services/prediction-engine"
import { cn } from "@/lib/utils"

interface GuidedConversationProps {
  className?: string
}

export function GuidedConversation({ className }: GuidedConversationProps) {
  const [userInput, setUserInput] = useState("")
  const [otherInput, setOtherInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [newGoal, setNewGoal] = useState("")
  const [goalProgress, setGoalProgress] = useState(0)

  // Get state and actions from the compass store
  const {
    goal,
    nodes,
    currentNodeId,
    isProcessing,
    setGoal,
    addNode,
    setCurrentNode,
    generatePredictions,
    matchResponse,
    resetCompass,
  } = useCompassStore()

  // Get suggested responses (predicted nodes from current node)
  const suggestedResponses = nodes.filter((node) => node.type === "predicted" && node.fromNodeId === currentNodeId)

  // Handle goal submission
  const handleGoalSubmit = () => {
    if (newGoal.trim()) {
      setGoal(newGoal.trim())
      setGoalDialogOpen(false)
      resetCompass()

      // Create a goal node
      const goalNodeId = addNode({
        type: "goal",
        text: newGoal.trim(),
        isActive: true,
      })

      setCurrentNode(goalNodeId)
    }
  }

  // Handle user input submission
  const handleUserInputSubmit = () => {
    if (!userInput.trim()) return

    // Add user node
    const userNodeId = addNode({
      type: "user",
      text: userInput.trim(),
      fromNodeId: currentNodeId,
      speaker: "user",
      isActive: true,
    })

    // Set as current node
    setCurrentNode(userNodeId)

    // Generate predictions
    generatePredictions(userInput.trim())

    // Clear input
    setUserInput("")
  }

  // Handle other person's response
  const handleOtherInputSubmit = () => {
    if (!otherInput.trim()) return

    // Match response to predictions or create new node
    matchResponse(otherInput.trim())

    // Clear input
    setOtherInput("")
  }

  // Handle suggested response click
  const handleSuggestedResponseClick = (text: string) => {
    setOtherInput(text)
  }

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real implementation, this would start/stop speech recognition
  }

  // Update goal progress
  useEffect(() => {
    const updateGoalProgress = async () => {
      if (!goal || nodes.length < 2) {
        setGoalProgress(0)
        return
      }

      // Build conversation history
      const history = nodes
        .filter((node) => node.type === "user" || node.type === "actual")
        .map((node) => {
          const speaker = node.speaker === "user" ? "User" : "Other"
          return `${speaker}: ${node.text}`
        })
        .join("\n")

      // Evaluate progress
      const progress = await evaluateGoalProgress(goal, history)
      setGoalProgress(progress)

      // If goal is achieved (progress > 0.9), highlight the goal node
      if (progress > 0.9) {
        const goalNode = nodes.find((node) => node.type === "goal")
        if (goalNode) {
          useCompassStore.getState().updateNode(goalNode.id, { isHighlighted: true })
        }
      }
    }

    updateGoalProgress()
  }, [goal, nodes])

  // Show goal dialog if no goal is set
  useEffect(() => {
    if (!goal && nodes.length === 0) {
      setGoalDialogOpen(true)
    }
  }, [goal, nodes])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Goal progress indicator */}
      <div className="px-4 py-2 flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-500" />
        <div className="text-sm font-medium flex-1 truncate" title={goal}>
          Goal: {goal || "No goal set"}
        </div>
        <div className="flex items-center gap-1">
          <div className="text-xs text-muted-foreground">Progress:</div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${goalProgress * 100}%` }}
            />
          </div>
          <div className="text-xs font-medium">{Math.round(goalProgress * 100)}%</div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGoalDialogOpen(true)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggested responses */}
      <Card className="m-2 flex-1 overflow-auto">
        <CardContent className="p-3 space-y-2">
          <h4 className="text-sm font-medium">Suggested Responses</h4>

          {isProcessing ? (
            <div className="py-4 flex justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
            </div>
          ) : suggestedResponses.length > 0 ? (
            <div className="space-y-2">
              {suggestedResponses.map((node) => (
                <div
                  key={node.id}
                  className="text-sm p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/70 flex items-start gap-2"
                  onClick={() => handleSuggestedResponseClick(node.text)}
                >
                  <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{node.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">
              {goal ? "Waiting for input to generate suggestions..." : "Set a goal to get started"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input area */}
      <div className="p-2 space-y-2">
        {/* User input */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className={cn("h-10 w-10", isRecording && "bg-red-100 text-red-500 border-red-200")}
            onClick={toggleRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Your message..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleUserInputSubmit()}
          />
          <Button onClick={handleUserInputSubmit} disabled={!userInput.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>

        {/* Other person's response */}
        <div className="flex gap-2">
          <Textarea
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            placeholder="Other person's response..."
            className="flex-1 min-h-[60px] max-h-[120px]"
          />
          <Button onClick={handleOtherInputSubmit} disabled={!otherInput.trim()} className="h-auto">
            Match
          </Button>
        </div>
      </div>

      {/* Goal dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Conversation Goal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="e.g., Schedule a follow-up meeting, Get approval for budget increase, etc."
              className="w-full min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground mt-2">
              A clear goal helps the AI generate better suggestions for your conversation.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleGoalSubmit} disabled={!newGoal.trim()}>
              Set Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
