"use client"

import { useState, useEffect } from "react"
import { useCompassStore } from "@/lib/store/compass-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Mic, MicOff, Send, Target, MessageCircle, RotateCcw, Loader2 } from "lucide-react"
import { evaluateGoalProgress } from "@/lib/services/prediction-engine"
import { cn } from "@/lib/utils"
import { refineGoal, expandTalkingPoints, generateConversationGraph } from "@/lib/services/compass-service"
import { useToast } from "@/hooks/use-toast"

interface GuidedConversationProps {
  className?: string
}

export function GuidedConversation({ className }: GuidedConversationProps) {
  const { toast } = useToast()
  const [userInput, setUserInput] = useState("")
  const [otherInput, setOtherInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [newGoal, setNewGoal] = useState("")
  const [goalProgress, setGoalProgress] = useState(0)
  const [isRefiningGoal, setIsRefiningGoal] = useState(false)
  const [refinedGoals, setRefinedGoals] = useState<string[]>([])
  const [isExpandingTalkingPoints, setIsExpandingTalkingPoints] = useState(false)
  const [expandedPoints, setExpandedPoints] = useState<string[]>([])

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
    addBeam,
  } = useCompassStore()

  // Get suggested responses (predicted nodes from current node)
  const suggestedResponses = nodes.filter((node) => node.type === "predicted" && node.fromNodeId === currentNodeId)

  // Show goal dialog if no goal is set
  useEffect(() => {
    if (!goal && nodes.length === 0) {
      setGoalDialogOpen(true)
      // Set a default goal suggestion
      setNewGoal("Have a productive conversation about project progress")
    }
  }, [goal, nodes])

  // Handle goal submission with refinement
  const handleGoalSubmit = async () => {
    if (!newGoal.trim()) return
    
    setIsRefiningGoal(true)
    try {
      // Get refined goal suggestions
      const suggestions = await refineGoal(newGoal.trim())
      
      if (suggestions.length === 1 && suggestions[0] === newGoal.trim()) {
        // Goal is already clear, proceed with it
        await handleRefinedGoalSelect(newGoal.trim())
      } else {
        // Show refined goal suggestions
        setRefinedGoals(suggestions)
      }
    } catch (error) {
      console.error('Error refining goal:', error)
      // If error occurs, just use the original goal
      await handleRefinedGoalSelect(newGoal.trim())
    } finally {
      setIsRefiningGoal(false)
    }
  }

  // Handle selection of a refined goal
  const handleRefinedGoalSelect = async (selectedGoal: string) => {
    setGoal(selectedGoal)
    setGoalDialogOpen(false)
    resetCompass()

    // Create a goal node
    const goalNodeId = addNode({
      type: "goal",
      text: selectedGoal,
      fromNodeId: null,
      isActive: true,
      speaker: "system"
    })

    setCurrentNode(goalNodeId)
    setRefinedGoals([])

    // Generate initial conversation graph
    try {
      const graph = await generateConversationGraph({
        goal: selectedGoal,
      })

      // Add initial nodes and edges from the graph
      graph.nodes.forEach(node => {
        const nodeId = addNode({
          type: "predicted",
          text: node.label,
          expandedTalkingPoints: node.expandedTalkingPoints,
          intent: node.intent,
          goalProximity: node.goalProximity,
          fromNodeId: goalNodeId,
          speaker: "other",
          isActive: false
        })

        // Add beam connecting to the prediction
        addBeam({
          fromNodeId: goalNodeId,
          toNodeId: nodeId,
          thickness: 0.8,
          isActive: false
        })
      })
    } catch (error) {
      console.error('Error generating conversation graph:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate conversation suggestions. You can still proceed manually.",
      })
    }
  }

  // Handle user input submission with expanded talking points
  const handleUserInputSubmit = async () => {
    if (!userInput.trim()) return;

    setIsExpandingTalkingPoints(true);
    try {
      // Get expanded talking points
      const points = await expandTalkingPoints(userInput.trim());
      setExpandedPoints(points);

      // Add user node
      const userNodeId = addNode({
        type: "user",
        text: userInput.trim(),
        fromNodeId: currentNodeId,
        speaker: "user",
        isActive: true,
        expandedTalkingPoints: points,
      });

      // Set as current node
      setCurrentNode(userNodeId);

      // Generate predictions
      generatePredictions(userInput.trim());

      // Clear input
      setUserInput("");
    } catch (error) {
      console.error('Error expanding talking points:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate talking points.",
      });
    } finally {
      setIsExpandingTalkingPoints(false);
    }
  };

  // Handle other person's response
  const handleOtherInputSubmit = () => {
    if (!otherInput.trim()) return;

    // Match response to predictions or create new node
    matchResponse(otherInput.trim());

    // Clear input
    setOtherInput("");
    setExpandedPoints([]);
  };

  // Handle suggested response click
  const handleSuggestedResponseClick = (text: string) => {
    setOtherInput(text);
  };

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would start/stop speech recognition
  };

  // Update goal progress
  useEffect(() => {
    const updateGoalProgress = async () => {
      if (!goal || nodes.length < 2) {
        setGoalProgress(0);
        return;
      }

      // Build conversation history
      const history = nodes
        .filter((node) => node.type === "user" || node.type === "actual")
        .map((node) => {
          const speaker = node.speaker === "user" ? "User" : "Other";
          return `${speaker}: ${node.text}`;
        })
        .join("\n");

      // Evaluate progress
      const progress = await evaluateGoalProgress(goal, history);
      setGoalProgress(progress);

      // If goal is achieved (progress > 0.9), highlight the goal node
      if (progress > 0.9) {
        const goalNode = nodes.find((node) => node.type === "goal");
        if (goalNode) {
          useCompassStore.getState().updateNode(goalNode.id, { isHighlighted: true });
        }
      }
    };

    updateGoalProgress();
  }, [goal, nodes]);

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
                  <div className="space-y-1">
                    <div>{node.text}</div>
                    {node.expandedTalkingPoints && node.expandedTalkingPoints.length > 0 && (
                      <div className="text-xs text-muted-foreground pl-4 border-l-2 border-muted-foreground/20">
                        {node.expandedTalkingPoints.map((point, index) => (
                          <div key={index} className="mt-1">• {point}</div>
                        ))}
                      </div>
                    )}
                  </div>
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
          <Button 
            onClick={handleUserInputSubmit} 
            disabled={!userInput.trim() || isExpandingTalkingPoints}
          >
            {isExpandingTalkingPoints ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
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

        {/* Expanded talking points */}
        {expandedPoints.length > 0 && (
          <div className="p-2 bg-muted rounded-md">
            <h5 className="text-sm font-medium mb-2">Expanded Talking Points:</h5>
            <div className="space-y-1 text-sm">
              {expandedPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

            {/* Refined goals section */}
            {refinedGoals.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Suggested Refined Goals:</h4>
                <div className="space-y-2">
                  {refinedGoals.map((goal, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleRefinedGoalSelect(goal)}
                    >
                      {goal}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleGoalSubmit} 
              disabled={!newGoal.trim() || isRefiningGoal}
            >
              {isRefiningGoal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Refining Goal...
                </>
              ) : (
                'Set Goal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
