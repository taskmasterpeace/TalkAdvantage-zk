"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, BrainCircuit, XCircle, Save, Maximize2 } from "lucide-react"
import { useSettingsStore } from "@/lib/settings-store"
import { useTemplateStore } from "@/lib/template-store"
import { useSessionStore } from "@/lib/session-store"
import { useErrorHandler, ErrorType } from "@/lib/error-handler"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FullScreenAnalysis } from "./full-screen-analysis"

interface AIAnalysisPanelProps {
  transcript: string;
  analysisResult?: string;
  isAnalyzing?: boolean;
}

export default function AIAnalysisPanel({ transcript, analysisResult, isAnalyzing: externalIsAnalyzing }: AIAnalysisPanelProps) {
  const { toast } = useToast()
  const { handleError } = useErrorHandler()
  const settings = useSettingsStore()
  const templateStore = useTemplateStore()
  const sessionStore = useSessionStore()

  const [internalIsAnalyzing, setInternalIsAnalyzing] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState("You are an AI assistant that provides analysis of conversations from transcripts which ask by user")
  const [userPrompt, setUserPrompt] = useState("")
  const [internalAnalysisResult, setInternalAnalysisResult] = useState("")
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0)
  const [lastExternalUpdateTimestamp, setLastExternalUpdateTimestamp] = useState(0)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showFullScreen, setShowFullScreen] = useState(false)

  // Format the analysis result to make headings bold
  const formatAnalysisResult = (text: string) => {
    if (!text) return "";

    // Split the text into lines
    const lines = text.split('\n');
    
    // Process each line
    const formattedLines = lines.map(line => {
      // Skip empty lines
      if (!line.trim()) return '';
      
      // Check if line is a heading (ends with a colon or is all caps)
      if (line.trim().endsWith(':') || /^[A-Z\s]+$/.test(line.trim())) {
        return `<div class="font-bold text-base mt-2 mb-0.5">${line}</div>`;
      }
      // For lists, make the category bold but keep the content normal
      if (line.includes(':')) {
        const [category, content] = line.split(':');
        return `<div class="leading-tight"><span class="font-bold">${category}:</span>${content}</div>`;
      }
      // Regular line
      return `<div class="leading-tight">${line}</div>`;
    });

    return formattedLines.filter(line => line).join('\n');
  };

  // Update timestamps when external props change
  useEffect(() => {
    if (analysisResult !== undefined) {
      setLastExternalUpdateTimestamp(Date.now());
    }
  }, [analysisResult]);

  // Use the most recent result based on timestamps
  const isAnalyzingState = externalIsAnalyzing ?? internalIsAnalyzing;
  const rawAnalysisResult = lastUpdateTimestamp > lastExternalUpdateTimestamp 
    ? internalAnalysisResult 
    : (analysisResult || internalAnalysisResult);
  
  // Format the analysis result
  const formattedAnalysisResult = formatAnalysisResult(rawAnalysisResult);

  const resetState = useCallback(() => {
    setInternalIsAnalyzing(false);
    setInternalAnalysisResult("");
  }, []);

  const handleAnalysisError = (error: string) => {
    setErrorMessage(error)
    setShowErrorDialog(true)
  }

  const analyzeTranscript = async (customSystemPrompt?: string, customUserPrompt?: string, skipTemplate: boolean = false) => {
    if (!transcript) {
      handleAnalysisError("No transcript available for analysis.")
      return
    }

    setInternalIsAnalyzing(true)
    // Do NOT clear the previous analysis result here
    // setInternalAnalysisResult("")

    try {
      // Get the active template
      const activeTemplateName = templateStore.activeTemplate
      const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

      if (!activeTemplate) {
        throw new Error("No active template found")
      }

      // Use custom prompts if provided, otherwise use template prompts
      const finalSystemPrompt = customSystemPrompt || systemPrompt || activeTemplate.system_prompt
      const finalUserPrompt = customUserPrompt || userPrompt || activeTemplate.user_prompt

      console.log('Sending request with:', {
        transcript,
        template: {
          system_prompt: finalSystemPrompt,
          user_prompt: finalUserPrompt,
          template_prompt: skipTemplate ? "" : activeTemplate.template_prompt
        }
      });

      // Make API request to Requestify endpoint
      const response = await fetch("/api/requestify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          template: {
            system_prompt: finalSystemPrompt,
            user_prompt: finalUserPrompt,
            template_prompt: skipTemplate ? "" : activeTemplate.template_prompt
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze transcript")
      }

      const data = await response.json()
      console.log('Received response:', data);
      
      // Update internal state with timestamp
      setInternalAnalysisResult(data.text);
      setLastUpdateTimestamp(Date.now());
      console.log('Updated internal result:', data.text);

      // Update session store
      if (sessionStore.updateAnalysisResults) {
        sessionStore.updateAnalysisResults({
          text: data.text,
          structured: data.structured || {},
          template_used: activeTemplate.name,
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      console.error('Analysis error:', error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      handleAnalysisError(errorMsg)
      setInternalAnalysisResult("")
    } finally {
      setInternalIsAnalyzing(false)
    }
  }

  const runQuickAnalysis = async () => {
    try {
      setInternalIsAnalyzing(true);
      setInternalAnalysisResult("");

      const quickSystemPrompt = "You are an AI assistant that provides quick, concise analysis of conversations."
      const quickUserPrompt = "Analyze the following transcript and provide a concise summary with key points and insights."

      await analyzeTranscript(quickSystemPrompt, quickUserPrompt, true);
    } catch (error) {
      console.error('Quick analysis error:', error);
      toast({
        variant: "destructive",
        title: "Quick Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to perform quick analysis",
      });
      setInternalAnalysisResult("");
    } finally {
      setInternalIsAnalyzing(false);
    }
  }

  const runDetailedAnalysis = async () => {
    try {
      setInternalIsAnalyzing(true);
      setInternalAnalysisResult("");

      const activeTemplate = templateStore.templates.find((t) => t.name === templateStore.activeTemplate)

    if (!activeTemplate) {
      toast({
        variant: "destructive",
        title: "Template Error",
        description: "No active template found.",
      })
      return
    }

      await analyzeTranscript('You are an AI assistant specializing . Your role is to:\n1. Extract the most important information from  transcripts\n2. Identify decisions, action items, and responsibilities\n3. Create clear, concise summaries that capture essential details\. Maintain a professional, direct communication style', activeTemplate.user_prompt+'\n\nProvide detailed analysis of the transcript', true);
    } catch (error) {
      console.error('Detailed analysis error:', error);
      toast({
        variant: "destructive",
        title: "Detailed Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to perform detailed analysis",
      });
      setInternalAnalysisResult("");
    } finally {
      setInternalIsAnalyzing(false);
    }
  }

  const handleSaveAnalysis = () => {
    if (!rawAnalysisResult) return;

    // Create a blob with the analysis text
    const blob = new Blob([rawAnalysisResult], { type: 'text/plain' });
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create a download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analysis-${timestamp}.txt`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Analysis
          </h3>
          <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runQuickAnalysis} 
                disabled={isAnalyzingState || !transcript}
                className="relative"
              >
                Quick Analysis
            </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runDetailedAnalysis} 
                disabled={isAnalyzingState || !transcript}
              >
                Detailed Analysis
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 rounded-md p-6 relative">
          {/* Loader overlay when analyzing */}
          {isAnalyzingState && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/60 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-muted-foreground">Analyzing...</span>
            </div>
          )}
          <div className={isAnalyzingState ? 'opacity-50 pointer-events-none' : ''}>
            <div className="whitespace-pre-wrap space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-lg font-semibold">Analysis Results</h4>
                {rawAnalysisResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullScreen(true)}
                    className="flex items-center gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Full Screen
                  </Button>
                )}
              </div>
              {rawAnalysisResult ? (
                <>
                  <div 
                    className="text-sm leading-snug [&>div]:mb-0.5"
                    dangerouslySetInnerHTML={{ __html: formattedAnalysisResult }}
                  />
                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Analysis completed at: {new Date().toLocaleTimeString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveAnalysis}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Analysis
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>No analysis results yet</p>
                  <p className="text-sm mt-2">Start recording or enter text to analyze</p>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="space-y-4">
        <div className="space-y-2">
              <h4 className="text-sm font-semibold">What would you like to analyze? (User Prompt)</h4>
          <Textarea
                placeholder="What would you like to analyze in this transcript? (e.g., 'Analyze the speaking style and provide feedback')"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="min-h-[100px] text-base"
                disabled={isAnalyzingState}
              />
            </div>

          <div className="flex justify-end">
            <Button
                onClick={() => analyzeTranscript(systemPrompt, userPrompt, true)}
                disabled={isAnalyzingState || !userPrompt || !transcript}
              className="gap-2"
            >
                {isAnalyzingState ? (
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

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Analysis Error
            </DialogTitle>
            <DialogDescription>
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Analysis */}
      <FullScreenAnalysis
        open={showFullScreen}
        onOpenChange={setShowFullScreen}
        analysisResult={rawAnalysisResult}
        onSave={handleSaveAnalysis}
      />
    </>
  )
}
