"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, BrainCircuit } from "lucide-react"
import { useSettingsStore } from "@/lib/settings-store"
import { useTemplateStore } from "@/lib/template-store"
import { useSessionStore } from "@/lib/session-store"
import { useErrorHandler, ErrorType } from "@/lib/error-handler"

interface AIAnalysisPanelProps {
  transcript: string
}

export default function AIAnalysisPanel({ transcript }: AIAnalysisPanelProps) {
  const { toast } = useToast()
  const { handleError } = useErrorHandler()
  const settings = useSettingsStore()
  const templateStore = useTemplateStore()
  const sessionStore = useSessionStore()

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [analysisResult, setAnalysisResult] = useState("")

  const analyzeTranscript = async (customPromptText?: string) => {
    if (!transcript) {
      toast({
        variant: "destructive",
        title: "No Transcript",
        description: "There is no transcript to analyze.",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      // Get the active template
      const activeTemplateName = templateStore.activeTemplate
      const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

      if (!activeTemplate) {
        throw new Error("No active template found")
      }

      // Prepare the request
      const requestBody = {
        transcript,
        template: activeTemplate,
        model: settings.aiModel,
        provider: settings.aiProvider,
        baseURL: settings.aiBaseURL,
        apiKey: settings.aiProvider === "openrouter" ? settings.openRouterKey : undefined,
        refererURL: settings.aiRefererURL,
        siteName: settings.aiSiteName,
      }

      // If custom prompt is provided, override the template prompt
      if (customPromptText || customPrompt) {
        requestBody.template = {
          ...activeTemplate,
          template_prompt: customPromptText || customPrompt,
        }
      }

      // Make API request
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze transcript")
      }

      const data = await response.json()
      setAnalysisResult(data.text)

      // If structured data is available, update the session
      if (data.structured) {
        sessionStore.updateAnalysisResults(data.structured)
      }

      toast({
        title: "Analysis Complete",
        description: "Your transcript has been analyzed successfully.",
      })
    } catch (error) {
      handleError(ErrorType.AI_ANALYSIS, error instanceof Error ? error.message : "Unknown error", {
        retry: () => analyzeTranscript(customPromptText),
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runQuickAnalysis = async () => {
    // Get the active template
    const activeTemplateName = templateStore.activeTemplate
    const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

    if (!activeTemplate) {
      toast({
        variant: "destructive",
        title: "Template Error",
        description: "No active template found.",
      })
      return
    }

    // Use a simplified version of the template prompt
    const quickPrompt = `Provide a concise summary of the following transcript in bullet points:
    
    ${transcript}`

    await analyzeTranscript(quickPrompt)
  }

  const runDetailedAnalysis = async () => {
    // Get the active template and use its full prompt
    const activeTemplateName = templateStore.activeTemplate
    const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

    if (!activeTemplate) {
      toast({
        variant: "destructive",
        title: "Template Error",
        description: "No active template found.",
      })
      return
    }

    await analyzeTranscript()
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Analysis
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runQuickAnalysis} disabled={isAnalyzing || !transcript}>
              Quick Analysis
            </Button>
            <Button variant="outline" size="sm" onClick={runDetailedAnalysis} disabled={isAnalyzing || !transcript}>
              Detailed Analysis
            </Button>
          </div>
        </div>

        {analysisResult ? (
          <div className="bg-muted/30 rounded-md p-4 whitespace-pre-wrap">{analysisResult}</div>
        ) : (
          <div className="bg-muted/30 rounded-md p-4 text-center text-muted-foreground">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Analyzing transcript...</p>
              </div>
            ) : (
              <p>Run an analysis to see AI-generated insights about your transcript</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Custom Analysis</h4>
          <Textarea
            placeholder="Enter a custom prompt for analysis..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => analyzeTranscript()}
              disabled={isAnalyzing || !customPrompt || !transcript}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
