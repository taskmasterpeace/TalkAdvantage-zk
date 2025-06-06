import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, Copy, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { HotLinkWidget } from '@/lib/hooks/use-hotlink-detection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      
      // Use the OpenRouter API endpoint with the selected model
      const response = await fetch('/api/openrouter/generate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: lastWords,
          systemPrompt: `You are an expert in ${widget.name}. Please perform the analysis according to the template provided. If no template is provided, use your knowledge and provide the result in a well-structured format. Use Markdown formatting for better readability.`,
          prompt: `Here is the template:\n\n${widget.prompt}\n\nHere is the latest transcript:\n\n${lastWords}`,
          model: widget.model,
          isHotLink: true
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
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center mb-4">
      <Card className="w-full max-w-4xl shadow-md bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
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

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {!result && !isLoading && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">Analyzing transcript...</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Analyzing transcript...</span>
            </div>
          )}

          {result && !isLoading && (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style headers
                  h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-base font-medium mb-2" {...props} />,
                  
                  // Style paragraphs
                  p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                  
                  // Style lists
                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                  
                  // Style emphasis
                  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                  em: ({ node, ...props }) => <em className="italic" {...props} />,
                  
                  // Style code
                  code: ({ node, inline, ...props }) => 
                    inline ? 
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded" {...props} /> :
                      <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded my-2" {...props} />,
                  
                  // Style blockquotes
                  blockquote: ({ node, ...props }) => 
                    <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 italic" {...props} />,
                  
                  // Style links
                  a: ({ node, ...props }) => 
                    <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 