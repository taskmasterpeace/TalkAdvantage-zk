"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { RefreshCw, X, HelpCircle, Send, SkipForward, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore, type QuestionType } from "@/lib/settings-store"
import { useTemplateStore } from "@/lib/template-store"
import { useErrorHandler, ErrorType } from "@/lib/error-handler"

interface CuriosityEngineProps {
  hasContent: boolean
  transcript?: string
}

export type Question = {
  id: number
  type: QuestionType
  text: string
  options?: string[]
  answered?: boolean
  answer?: string
}

export default function CuriosityEngine({ hasContent, transcript = "" }: CuriosityEngineProps) {
  const { toast } = useToast()
  const { handleError } = useErrorHandler()
  const settings = useSettingsStore()
  const templateStore = useTemplateStore()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [otherAnswer, setOtherAnswer] = useState("")

  // Generate questions based on transcript and template
  const generateQuestions = async () => {
    if (!hasContent) {
      toast({
        variant: "destructive",
        title: "No Content",
        description: "Start recording or provide transcript content to generate questions.",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Get the active template
      const activeTemplateName = templateStore.activeTemplate
      const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

      if (!activeTemplate) {
        throw new Error("No active template found")
      }

      // Use the template's curiosity prompt
      const prompt = `${activeTemplate.curiosity_prompt}

[TRANSCRIPT]
${transcript}
`

      // Make API request to generate questions
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model: settings.aiModel,
          provider: settings.aiProvider,
          baseURL: settings.aiBaseURL,
          apiKey: settings.aiProvider === "openrouter" ? settings.openRouterKey : undefined,
          refererURL: settings.aiRefererURL,
          siteName: settings.aiSiteName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate questions")
      }

      const data = await response.json()

      try {
        // Parse the response as JSON
        const parsedQuestions = JSON.parse(data.text)
        const formattedQuestions = parsedQuestions.map((q, index) => ({
          id: index + 1,
          ...q,
        }))
        setQuestions(formattedQuestions)

        toast({
          title: "Questions Generated",
          description: `Generated ${formattedQuestions.length} questions based on the transcript.`,
        })
      } catch (error) {
        console.error("Error parsing AI response:", error)
        throw new Error("Failed to parse AI response. The response was not in the expected JSON format.")
      }
    } catch (error) {
      handleError(ErrorType.AI_ANALYSIS, error instanceof Error ? error.message : "Unknown error", {
        retry: generateQuestions,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const clearQuestions = () => {
    setQuestions([])
    toast({
      title: "Questions Cleared",
      description: "All questions have been cleared.",
    })
  }

  const submitAnswer = (id: number) => {
    let answer = ""

    // Handle different question types
    const question = questions.find((q) => q.id === id)
    if (!question) return

    if (question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_CHOICE_FILL") {
      if (!selectedOption) {
        toast({
          variant: "destructive",
          title: "No Option Selected",
          description: "Please select an option before submitting.",
        })
        return
      }

      answer = selectedOption === "Other" ? otherAnswer : selectedOption
    } else {
      // For YES_NO, OPEN_ENDED, etc.
      if (!currentAnswer.trim()) {
        toast({
          variant: "destructive",
          title: "Empty Answer",
          description: "Please provide an answer before submitting.",
        })
        return
      }
      answer = currentAnswer
    }

    setQuestions(questions.map((q) => (q.id === id ? { ...q, answered: true, answer } : q)))
    setCurrentAnswer("")
    setSelectedOption(null)
    setOtherAnswer("")

    toast({
      title: "Answer Submitted",
      description: "Your answer has been recorded.",
    })
  }

  const skipQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id))
    setCurrentAnswer("")
    setSelectedOption(null)
    setOtherAnswer("")

    toast({
      title: "Question Skipped",
      description: "Question has been removed.",
    })
  }

  // Auto-generate questions when transcript changes if enabled
  useEffect(() => {
    if (
      hasContent &&
      transcript &&
      settings.systemProps.curiosityEngine.enabled &&
      settings.systemProps.curiosityEngine.autoGenerateOnAnalysis &&
      questions.length === 0
    ) {
      generateQuestions()
    }
  }, [transcript, hasContent])

  if (!hasContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Curiosity Engine</h3>
        <p className="text-muted-foreground mb-4">
          Start recording to generate AI-powered questions about your conversation.
        </p>
        <Button variant="outline" disabled>
          Generate Questions
        </Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Questions Yet</h3>
        <p className="text-muted-foreground mb-4">Generate questions to explore insights from your conversation.</p>
        <Button onClick={generateQuestions} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Questions"
          )}
        </Button>
      </div>
    )
  }

  const unansweredQuestions = questions.filter((q) => !q.answered)
  const answeredQuestions = questions.filter((q) => q.answered)
  const currentQuestion = unansweredQuestions[0]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2">
        <h3 className="font-medium">Questions</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={generateQuestions} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={clearQuestions}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto space-y-4">
        {/* Current Question */}
        {unansweredQuestions.length > 0 && (
          <Card key={currentQuestion.id} className="p-4">
            <div className="text-xs text-muted-foreground mb-1">
              {currentQuestion.type === "YES_NO" && "Yes/No Question"}
              {currentQuestion.type === "MULTIPLE_CHOICE" && "Multiple Choice"}
              {currentQuestion.type === "MULTIPLE_CHOICE_FILL" && "Multiple Choice with Other"}
              {currentQuestion.type === "SPEAKER_IDENTIFICATION" && "Speaker Identification"}
              {currentQuestion.type === "MEETING_TYPE" && "Meeting Type"}
              {currentQuestion.type === "OPEN_ENDED" && "Open-Ended Question"}
            </div>
            <p className="font-medium mb-4">{currentQuestion.text}</p>

            {/* Different input types based on question type */}
            {(currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "MULTIPLE_CHOICE_FILL") && (
              <div className="space-y-3 mb-4">
                <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                  {currentQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`}>{option}</Label>
                    </div>
                  ))}
                  {currentQuestion.type === "MULTIPLE_CHOICE_FILL" && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Other" id="option-other" />
                        <Label htmlFor="option-other">Other</Label>
                      </div>
                      {selectedOption === "Other" && (
                        <Input
                          placeholder="Please specify..."
                          value={otherAnswer}
                          onChange={(e) => setOtherAnswer(e.target.value)}
                          className="ml-6 w-[calc(100%-1.5rem)]"
                        />
                      )}
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}

            {(currentQuestion.type === "YES_NO" ||
              currentQuestion.type === "SPEAKER_IDENTIFICATION" ||
              currentQuestion.type === "MEETING_TYPE" ||
              currentQuestion.type === "OPEN_ENDED") && (
              <Input
                placeholder={
                  currentQuestion.type === "YES_NO"
                    ? "Type 'Yes' or 'No'..."
                    : currentQuestion.type === "OPEN_ENDED"
                      ? "Your detailed answer..."
                      : "Your answer..."
                }
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="mb-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitAnswer(currentQuestion.id)
                  }
                }}
              />
            )}

            <div className="flex items-center gap-2">
              <Button onClick={() => submitAnswer(currentQuestion.id)} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
              <Button variant="ghost" size="icon" onClick={() => skipQuestion(currentQuestion.id)}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Answered Questions */}
        {answeredQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Answered Questions</h4>
            {answeredQuestions.map((question) => (
              <Card key={question.id} className="p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">
                  {question.type === "YES_NO" && "Yes/No Question"}
                  {question.type === "MULTIPLE_CHOICE" && "Multiple Choice"}
                  {question.type === "MULTIPLE_CHOICE_FILL" && "Multiple Choice with Other"}
                  {question.type === "SPEAKER_IDENTIFICATION" && "Speaker Identification"}
                  {question.type === "MEETING_TYPE" && "Meeting Type"}
                  {question.type === "OPEN_ENDED" && "Open-Ended Question"}
                </div>
                <p className="font-medium text-sm">{question.text}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-muted-foreground mr-2">Your answer:</span>
                  <span className="text-sm">{question.answer}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
