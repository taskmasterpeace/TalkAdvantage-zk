"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, ThumbsUp, MessageSquare, RefreshCw } from "lucide-react"
import { useSessionStore } from "@/lib/session-store"
import { useTemplateStore } from "@/lib/template-store"

interface CuriosityEngineProps {
  hasContent: boolean
  transcript: string
  onAnswerSubmitted?: (text: string) => void
}

interface Question {
  id: string
  text: string
  type: "yes_no" | "multiple_choice" | "free_text"
  options?: string[]
  answer?: string
  timestamp: string
}

export default function CuriosityEngine({ hasContent, transcript, onAnswerSubmitted }: CuriosityEngineProps) {
  const { toast } = useToast()
  const sessionStore = useSessionStore()
  const templateStore = useTemplateStore()
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState("")

  // Default Curiosity Engine prompt
  const DEFAULT_CURIOSITY_PROMPT = `You are a Curiosity Engine, designed to generate engaging and thought-provoking questions based on conversation transcripts. Your goal is to help users reflect deeply on their conversations and uncover insights.

Follow these rules:
1. Generate 2-3 questions per response
2. Mix different question types: yes/no, multiple choice, and free text
3. Questions should be directly relevant to the conversation content
4. For multiple choice questions, provide 3-4 relevant options
5. Keep questions concise and clear

Format your response as a JSON array of questions. Each question should have:
- text: The question text
- type: "yes_no", "multiple_choice", or "free_text"
- options: Array of options (for multiple choice only)

Example format:
[
  {
    "text": "Did this conversation achieve its intended goal?",
    "type": "yes_no"
  },
  {
    "text": "Which communication style was most prominent in this discussion?",
    "type": "multiple_choice",
    "options": ["Assertive", "Collaborative", "Analytical", "Expressive"]
  },
  {
    "text": "What key insights emerged from this conversation that weren't explicitly stated?",
    "type": "free_text"
  }
]`

  // Function to submit an answer
  const submitAnswer = (questionId: string, answer: string) => {
    // Find the question
    const question = questions.find(q => q.id === questionId)
    if (!question) return

    // Update questions state
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, answer } 
        : q
    ))

    // Clear the input for this specific question
    setInputValues(prev => ({
      ...prev,
      [questionId]: ''
    }))

    // Format the answer entry for the transcript
    const now = Date.now()
    const timestamp = new Date().toLocaleTimeString()
    const answerText = `[Curiosity Question ${timestamp}] §§${question.text}§§. [Curiosity Answer] §§${answer}§§.`

    // Add to transcript using addTranscriptSegment
    sessionStore.addTranscriptSegment({
      speaker: "Curiosity Engine",
      start_ms: now,
      end_ms: now + 1000,
      text: answerText
    })

    // Update live text through the callback
    if (onAnswerSubmitted) {
      onAnswerSubmitted(answerText)
    }

    toast({
      title: "Answer recorded",
      description: "Your response has been added to the transcript",
    })
  }

  // Function to generate contextual questions based on transcript
  const generateQuestions = async () => {
    if (!transcript) {
      toast({
        title: "No transcript available",
        description: "Start recording or wait for content to analyze",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Get the active template
      const activeTemplate:any = templateStore.templates.find(
        (t) => t.name === templateStore.activeTemplate
      )

      // Get the system prompt - use default if none found
      const systemPrompt = activeTemplate?.curiosity_prompt || DEFAULT_CURIOSITY_PROMPT
      
      // Get the last 800 characters of transcript, but ensure we don't cut words in half
      const lastChars = transcript.slice(-800)
      const lastComplete = lastChars.slice(lastChars.indexOf(" ") + 1)

      const response = await fetch("/api/openrouter/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: lastComplete,
          systemPrompt: systemPrompt
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate questions")
      }

      const data = await response.json()
      
      if (!data.text) {
        throw new Error("Invalid response format")
      }

      let parsedQuestions
      try {
        parsedQuestions = JSON.parse(data.text)
        if (!Array.isArray(parsedQuestions)) {
          throw new Error("Response is not an array")
        }
      } catch (parseError) {
        console.error("Failed to parse questions:", parseError)
        throw new Error("Invalid question format received")
      }

      const newQuestions = parsedQuestions.map((q: any) => ({
        ...q,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }))

      setQuestions(prevQuestions => [...prevQuestions, ...newQuestions])

      toast({
        title: "Questions Generated",
        description: `Generated ${newQuestions.length} new questions based on the conversation.`,
      })

    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Auto-generate questions periodically during recording
  useEffect(() => {
    if (!hasContent || isGenerating) return

    const interval = setInterval(() => {
      if (transcript && transcript.length > 100) {
        generateQuestions()
      }
    }, 30000) // Generate questions every 30 seconds

    return () => clearInterval(interval)
  }, [hasContent, transcript, isGenerating])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Curiosity Engine
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateQuestions}
            disabled={isGenerating || !transcript}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No questions generated yet</p>
            <p className="text-sm mt-2">Questions will appear here as the conversation progresses</p>
          </Card>
        ) : (
          questions.map((question) => (
            <Card key={question.id} className="p-4 space-y-3">
              <p className="font-medium">{question.text}</p>
              
              {question.answer ? (
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground mb-1">Your answer:</div>
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500 mt-1" />
                    <p>{question.answer}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {question.type === "yes_no" && (
                    <RadioGroup
                      onValueChange={(value) => submitAnswer(question.id, value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
                        <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id={`${question.id}-no`} />
                        <Label htmlFor={`${question.id}-no`}>No</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {question.type === "multiple_choice" && question.options && (
                    <RadioGroup
                      onValueChange={(value) => submitAnswer(question.id, value)}
                      className="space-y-2"
                    >
                      {question.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                          <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.type === "free_text" && (
                    <div className="flex gap-2">
                      <Input
                        value={inputValues[question.id] || ''}
                        onChange={(e) => setInputValues(prev => ({
                          ...prev,
                          [question.id]: e.target.value
                        }))}
                        placeholder="Type your answer..."
                        className="flex-1"
                      />
                      <Button
                        onClick={() => submitAnswer(question.id, inputValues[question.id] || '')}
                        disabled={!inputValues[question.id]?.trim()}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
