"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Minimize2, Save } from "lucide-react"

interface FullScreenAnalysisProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisResult: string
  onSave: () => void
}

export function FullScreenAnalysis({ open, onOpenChange, analysisResult, onSave }: FullScreenAnalysisProps) {
  // Format the analysis result to make headings bold (reusing the same formatting logic)
  const formatAnalysisResult = (text: string) => {
    if (!text) return "";

    const lines = text.split('\n');
    
    const formattedLines = lines.map(line => {
      if (!line.trim()) return '';
      
      if (line.trim().endsWith(':') || /^[A-Z\s]+$/.test(line.trim())) {
        return `<div class="font-bold text-base mt-2 mb-0.5">${line}</div>`;
      }
      if (line.includes(':')) {
        const [category, content] = line.split(':');
        return `<div class="leading-tight"><span class="font-bold">${category}:</span>${content}</div>`;
      }
      return `<div class="leading-tight">${line}</div>`;
    });

    return formattedLines.filter(line => line).join('\n');
  };

  const formattedAnalysisResult = formatAnalysisResult(analysisResult);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Analysis Results</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Analysis
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                Exit Full Screen
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div 
            className="text-base leading-relaxed [&>div]:mb-1"
            dangerouslySetInnerHTML={{ __html: formattedAnalysisResult }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
} 