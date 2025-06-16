import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, Copy, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { HotLinkWidget } from '@/lib/hooks/use-hotlink-detection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/supabase/auth-context';
import { knowledgeGraphService } from '@/lib/services/knowledge-graph-service';
import DraggableWidget from './draggable-widget';
import { useSettingsStore } from '@/lib/settings-store';
import { useLayoutStore } from '@/lib/layout-store';
import { contextService } from '@/lib/services/context-service';

interface HotLinkWidgetDisplayProps {
  widget: HotLinkWidget;
  transcript: string;
  onClose: () => void;
}

export default function HotLinkWidgetDisplay({ widget, transcript, onClose }: HotLinkWidgetDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const settings = useSettingsStore();
  const layout = useLayoutStore();
  const currentLayout = layout.layouts[layout.activeLayoutName];

  // Check if widget is visible based on drag-and-drop mode
  const isVisible = settings.enableDragDrop ? 
    currentLayout?.visibleWidgets.includes('hotlink-analysis') : 
    true; // Always visible when drag-and-drop is off

  // Automatically run analysis when component mounts
  useEffect(() => {
    if (!isLoading && !result) {
      runAnalysis();
    }
  }, []);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      // Get the last 400 words of the transcript
      const words = transcript.split(/\s+/);
      const lastWords = words.slice(-400).join(" ");

      // Get today's date
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Get context for hotlink analysis
      const { contextPack, relevantChunks } = await contextService.getContextForAnalysis(
        user?.id || '',
        'hotlink',
        lastWords,
        widget.name
      );
      
      // Use the OpenRouter API endpoint with the selected model
      const response = await fetch('/api/openrouter/generate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: lastWords,
          systemPrompt: `You are an expert in ${widget.name}. Today's date is ${today}. Please perform the analysis according to the template provided. If no template is provided, use your knowledge and provide the result in a well-structured format. must Use Markdown formatting for better readability.

Context Information:
${contextPack ? `
Goal: ${contextPack.goal}
Sub Goals: ${contextPack.subGoals.join(', ')}
User Name:  ${contextPack.name}
User Role: ${contextPack.userRole}
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
  `- ${chunk.content}`
).join('\n')}` : ''}`,
          prompt: `Here is the template:\n\n${widget.prompt}\n\nHere is the latest transcript:\n\n${lastWords}`,
          model: widget.model,
          isHotLink: true,
          contextPack: contextPack
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please refresh the page.");
        }
        throw new Error("Failed to analyze transcript");
      }

      const data = await response.json();
      setResult(data.text);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze transcript",
      });
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!result) return;
    
    navigator.clipboard.writeText(result).then(
      () => {
        setHasCopied(true);
        toast({
          title: "Copied to Clipboard",
          description: "Analysis result has been copied to clipboard.",
        });
        setTimeout(() => setHasCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy text to clipboard.",
        });
      }
    );
  };

  // If widget is not visible, don't render anything
  if (!isVisible) {
    return null;
  }

  const content = (
    <div className="p-4 h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{widget.name}</h2>
          <div className="flex gap-1">
            {widget.triggerWords.map((word: string, index: number) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            disabled={!result || isLoading}
            className="h-8 w-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : result ? (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No analysis results yet
          </div>
        )}
      </div>
    </div>
  );

  if (settings.enableDragDrop) {
    return (
      <DraggableWidget
        id="hotlink-analysis"
        title={widget.name}
        defaultPosition={{ x: 20, y: 20 }}
        defaultSize={{ width: 600, height: 400 }}
        className="w-full"
      >
        {content}
      </DraggableWidget>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center mb-4">
      <Card className="w-full max-w-4xl shadow-md bg-white dark:bg-gray-800 max-h-[80vh]">
        {content}
      </Card>
    </div>
  );
} 