"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send } from "lucide-react";

interface Transcript {
  name: string;
  text: string;
  index: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AnalysisChat() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedTranscripts, setSelectedTranscripts] = useState<Transcript[]>([]);
  const [documentCount, setDocumentCount] = useState(0);

  // Delete all transcripts when the page loads
  useEffect(() => {
    const deleteAllTranscripts = async () => {
      console.log('Analysis page loaded - initiating transcript deletion');
      try {
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteAll'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete all transcripts');
        }

        const data = await response.json();
        console.log('Successfully deleted transcripts:', data);
        setDocumentCount(0);
        setSelectedTranscripts([]);
      } catch (error) {
        console.error('Error deleting all transcripts:', error);
      }
    };

    deleteAllTranscripts();
  }, []);

  const handleChat = async () => {
    if (!question.trim() || selectedTranscripts.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process question');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer }
      ]);
      setQuestion('');
    } catch (error) {
      console.error('Error:', error);
      setAnswer(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscriptSelection = async (transcript: Transcript, isSelected: boolean) => {
    try {
      if (isSelected) {
        // Add to selected transcripts
        setSelectedTranscripts(prev => [...prev, transcript]);
        
        // Add to vector store
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcripts: [transcript],
            action: 'add'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add transcript');
        }

        const data = await response.json();
        setDocumentCount(data.documentCount);
      } else {
        // Remove from selected transcripts
        setSelectedTranscripts(prev => prev.filter(t => 
          t.name !== transcript.name || t.index !== transcript.index
        ));
        
        // Remove from vector store
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcripts: [transcript],
            action: 'remove'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to remove transcript');
        }

        const data = await response.json();
        setDocumentCount(data.documentCount);
      }
    } catch (error) {
      console.error('Error managing transcript:', error);
      // Revert the selection state if the API call fails
      setSelectedTranscripts(prev => {
        if (isSelected) {
          return prev.filter(t => t.name !== transcript.name || t.index !== transcript.index);
        } else {
          return [...prev, transcript];
        }
      });
      alert(error instanceof Error ? error.message : 'Failed to manage transcript');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Chat with Selected Transcripts</h1>
        
        <div className="mb-6">
          <Label>Selected Transcripts ({selectedTranscripts.length})</Label>
          <ScrollArea className="h-32 border rounded-md p-2">
            {selectedTranscripts.map((transcript, index) => (
              <div key={`${transcript.name}-${transcript.index}`} className="flex items-center justify-between p-2">
                <span>{transcript.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTranscriptSelection(transcript, false)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="question">Ask a question about the selected transcripts</Label>
            <div className="flex gap-2">
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1"
                disabled={isLoading || selectedTranscripts.length === 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
              />
              <Button
                onClick={handleChat}
                disabled={isLoading || !question.trim() || selectedTranscripts.length === 0}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {chatHistory.length > 0 && (
            <div className="space-y-4">
              <Label>Chat History</Label>
              <ScrollArea className="h-96 border rounded-md p-4">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${
                      message.role === 'user' ? 'text-blue-600' : 'text-green-600'
                    }`}
                  >
                    <strong>{message.role === 'user' ? 'You: ' : 'AI: '}</strong>
                    {message.content}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 