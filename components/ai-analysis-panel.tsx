"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, BrainCircuit, XCircle, Save, Maximize2, Settings } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { knowledgeGraphService } from '@/lib/services/knowledge-graph-service'
import { useAuth } from '@/lib/supabase/auth-context'
import { contextService } from '@/lib/services/context-service'

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
  const { user } = useAuth()

  const [internalIsAnalyzing, setInternalIsAnalyzing] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState("You are an AI assistant that provides analysis of conversations from transcripts which ask by user")
  const [userPrompt, setUserPrompt] = useState("")
  const [internalAnalysisResult, setInternalAnalysisResult] = useState("")
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0)
  const [lastExternalUpdateTimestamp, setLastExternalUpdateTimestamp] = useState(0)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showFullScreen, setShowFullScreen] = useState(false)

  // Initialize selected model independently
  const [selectedModel, setSelectedModel] = useState(() => {
    // Initialize from localStorage if available, otherwise use default
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiAnalysisModel') || 'mistralai/mistral-7b-instruct'
    }
    return 'mistralai/mistral-7b-instruct'
  })

  // Save model selection to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiAnalysisModel', selectedModel)
    }
  }, [selectedModel])

  const OPENROUTER_MODELS = [
    // OpenAI Models
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo ($3.0/M)' },
    { id: 'openai/gpt-4', name: 'GPT-4 ($3.0/M)' },
    { id: 'openai/gpt-4-vision', name: 'GPT-4 Vision ($3.0/M)' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo ($0.5/M)' },
    { id: 'openai/gpt-4o', name: 'GPT-4 Omni ($5.0/M)' },
    // Free Models
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct (Free)' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'LLaMA 3 8B Instruct (Free)' },
    { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B Instruct (Free)' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Free)' },
    { id: 'recursal/eagle-7b', name: 'RWKV v5: Eagle 7B (Free)' },
    { id: 'qwen/qwen-2-7b-instruct', name: 'Qwen 2 7B Instruct (Free)' },
    // Paid Models
    { id: 'microsoft/phi-3-medium-4k-instruct', name: 'Phi-3 Medium 4K Instruct ($0.14/M)' },
    { id: 'google/gemini-pro-vision', name: 'Gemini Pro Vision ($0.125/M)' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001 ($0.1/M)' },
    { id: 'meta-llama/llama-2-13b-chat', name: 'LLaMA 2 13B Chat ($0.2/M)' },
    { id: 'nousresearch/nous-hermes-llama2-13b', name: 'Nous Hermes LLaMA2 13B ($0.2/M)' },
    { id: 'fireworks/firellava-13b', name: 'FireLLaVA 13B ($0.2/M)' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku ($0.25/M)' },
    { id: 'ai21/jamba-instruct', name: 'AI21: Jamba Instruct ($0.5/M)' },
    { id: 'meta-llama/codellama-34b-instruct', name: 'CodeLlama 34B Instruct ($0.5/M)' },
    { id: 'google/palm-2-chat-bison', name: 'PaLM 2 Chat Bison ($0.5/M)' },
    { id: 'google/palm-2-codechat-bison', name: 'PaLM 2 CodeChat Bison ($0.5/M)' },
    { id: 'cognitivecomputations/dolphin-mixtral-8x7b', name: 'Dolphin Mixtral 8x7B ($0.5/M)' },
    { id: 'meta-llama/llama-3-70b-instruct', name: 'LLaMA 3 70B Instruct ($0.59/M)' },
    { id: 'qwen/qwen-2-72b-instruct', name: 'Qwen 2 72B Instruct ($0.56/M)' },
    { id: 'meta-llama/llama-3-70b-instruct:nitro', name: 'LLaMA 3 70B Instruct Nitro ($0.9/M)' },
    { id: 'sao10k/l3-euryale-70b', name: 'LLaMA 3 Euryale 70B v2.1 ($1.48/M)' },
    { id: 'pygmalionai/mythalion-13b', name: 'Mythalion 13B ($1.875/M)' },
    { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B ($1.875/M)' },
    { id: 'undi95/remm-slerp-l2-13b', name: 'Remm Slerp L2 13B ($1.875/M)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet ($3.0/M)' },
    { id: '01-ai/yi-large', name: 'Yi Large ($3.0/M)' },
    { id: 'nvidia/nemotron-4-340b-instruct', name: 'NVIDIA Nemotron-4 340B Instruct ($4.2/M)' },
    // Perplexity Models
    { id: 'perplexity/r1-1776', name: 'Perplexity R1-1776 ($2.0/M in, $8.0/M out)' }
  ]

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

    try {
      // Get the active template
      const activeTemplateName = templateStore.activeTemplate
      const activeTemplate = templateStore.templates.find((t) => t.name === activeTemplateName)

      if (!activeTemplate) {
        throw new Error("No active template found")
      }

      // Get today's date
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Use custom prompts if provided, otherwise use template prompts
      const finalSystemPrompt = customSystemPrompt || systemPrompt || activeTemplate.system_prompt
      const finalUserPrompt = customUserPrompt || userPrompt || activeTemplate.user_prompt

      // Get context and relevant chunks for the user prompt
      const { contextPack, relevantChunks } = await contextService.getContextForAnalysis(
        user?.id || '',
        'detailed',
        finalUserPrompt
      );

      // Format the context information
      const contextInfo = contextPack ? `
      Context Information:
      
      Goal: ${contextPack.goal}
      Sub Goals: ${contextPack.subGoals?.join(', ')}
      User Name:  ${contextPack.name}
      User Role: ${contextPack.userRole}
      Person: ${contextPack.person}
      Relationship: ${contextPack.personRelationship}
      
      Participants:
      ${contextPack.participants?.map(p => 
        `- ${p.name} (${p.role}, ${p.relationship_to_user})${p.apex_profile ? `\n  Profile: ${JSON.stringify(p.apex_profile, null, 2)}` : ''}`
      ).join('\n')}
      
      Key Topics: ${contextPack.keyTopics?.join(', ')}
      Context Description: ${contextPack.contextDescription}
      Notes: ${contextPack.notes}
      
      ${contextPack.timeline?.length ? `Timeline:\n${contextPack.timeline.map(t => `- ${t}`).join('\n')}` : ''}
      ${contextPack.conflictMap ? `\nConflict Map:\n${contextPack.conflictMap}` : ''}
      ${contextPack.environmentalFactors ? `\nEnvironmental Factors:\n${contextPack.environmentalFactors}` : ''}
      
      Relevant Documents submit:
      ${relevantChunks?.map(chunk => 
        `- ${chunk?.content}`
      ).join('\n')}
      ` : '';      

      console.log('Sending request with:', {
        transcript,
        template: {
          system_prompt: `${finalSystemPrompt}\n\nToday's date is ${today}.${contextInfo}`,
          user_prompt: `${finalUserPrompt}`,
          template_prompt: skipTemplate ? "" : activeTemplate.template_prompt,
          settings: { model: selectedModel }
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
            system_prompt: `${finalSystemPrompt}\n\nToday's date is ${today}.${contextInfo}`,
            user_prompt: `${finalUserPrompt}`,
            template_prompt: skipTemplate ? "" : activeTemplate.template_prompt,
            settings: { model: selectedModel }
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

      // Get context for quick analysis
      const { contextPack, relevantChunks } = await contextService.getContextForAnalysis(
        user?.id || '',
        'quick',
        transcript
      );

      const quickSystemPrompt = `You are an AI assistant that provides quick, concise analysis of conversations.

Context Information:
${contextPack ? `
Goal: ${contextPack.goal}
Sub Goals: ${contextPack.subGoals.join(', ')}
User Role: ${contextPack.userRole}
User Name:  ${contextPack.name}
Person: ${contextPack.person}
Relationship: ${contextPack.personRelationship}

Participants:
${contextPack.participants.map(p => `- ${p.name} (${p.role}, ${p.relationship_to_user})${p.apex_profile ? `\n  Profile: ${JSON.stringify(p.apex_profile)}` : ''}`).join('\n')}

Key Topics: ${contextPack.keyTopics.join(', ')}
Context Description: ${contextPack.contextDescription}
Notes: ${contextPack.notes}

${contextPack.timeline ? `Timeline:\n${contextPack.timeline.map(t => `- ${t}`).join('\n')}` : ''}
${contextPack.conflictMap ? `Conflict Map:\n${contextPack.conflictMap}` : ''}
${contextPack.environmentalFactors ? `Environmental Factors:\n${contextPack.environmentalFactors}` : ''}

Documents:
${contextPack.documents.map(d => `- ${d.name}${d.tags ? ` (Tags: ${d.tags.join(', ')})` : ''}`).join('\n')}` : ''}

${relevantChunks.length > 0 ? `\nRelevant Documents:\n${relevantChunks.map(chunk => 
  `- ${chunk.content}${chunk?.tags ? ` (${chunk.metadata.tags.join(', ')})` : ''}: ${chunk.content}`
).join('\n')}` : ''}`;

      const quickUserPrompt = `Analyze the following transcript and provide a concise summary with key points and insights:

${transcript}`;

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

      // Get context for detailed analysis
      const { contextPack, relevantChunks } = await contextService.getContextForAnalysis(
        user?.id || '',
        'detailed',
        transcript
      );

      const systemPrompt = `You are an AI assistant specializing in detailed analysis. Your role is to:
1. Extract the most important information from transcripts
2. Identify decisions, action items, and responsibilities
3. Create clear, concise summaries that capture essential details
4. Consider the provided context and relevant documents in your analysis

Context Information:

Goal: ${contextPack.goal}
Sub Goals: ${contextPack.subGoals?.join(', ') || 'N/A'}

User Role: ${contextPack.userRole}
User Name:  ${contextPack.name}
Person: ${contextPack.person}
Relationship: ${contextPack.personRelationship}

Context Description: ${contextPack.contextDescription}
Key Topics: ${contextPack.keyTopics?.join(', ') || 'N/A'}
Timeline:
${contextPack.timeline?.length ? contextPack.timeline.map(t => `- ${t}`).join('\n') : 'N/A'}

Conflict Map:
${contextPack.conflictMap || 'N/A'}

Environmental Factors:
${contextPack.environmentalFactors || 'N/A'}

Participants:
${contextPack.participants?.map(p => 
  `- ${p.name} (${p.role}, ${p.relationship_to_user})${p.apex_profile ? `\n  Profile: ${JSON.stringify(p.apex_profile, null, 2)}` : ''}`
).join('\n') || 'N/A'}

${relevantChunks?.length > 0 ? `
Relevant Documents:
${relevantChunks.map(chunk => `- ${chunk.content}`).join('\n')}` : ''}`;

      await analyzeTranscript(systemPrompt, activeTemplate.user_prompt + '\n\nProvide detailed analysis of the transcript', true);
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[300px]">
                <div className="p-2">
                  <h4 className="text-sm font-medium mb-2">Model Settings</h4>
                  <Select
                    value={selectedModel}
                    onValueChange={(value) => {
                      setSelectedModel(value);
                      toast({
                        title: "Model Updated",
                        description: "Your model preference has been saved.",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENROUTER_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
