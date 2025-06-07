import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transcript {
  name: string;
  text: string;
}

export function DocumentChat() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);

  const handleAddDocument = async () => {
    if (transcripts.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          transcripts
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setDocumentCount(data.documentCount);
      setTranscripts([]); // Clear after successful add
    } catch (error) {
      console.error('Error adding documents:', error);
      alert(error instanceof Error ? error.message : 'Failed to add documents');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!question) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAnswer(data.answer);
      setDocumentCount(data.documentCount);
    } catch (error) {
      console.error('Error in chat:', error);
      alert(error instanceof Error ? error.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Add Documents</h2>
        <div className="space-y-4">
          <Textarea
            placeholder="Enter document name"
            value={transcripts[0]?.name || ''}
            onChange={(e) => setTranscripts([{ ...transcripts[0], name: e.target.value }])}
            className="mb-2"
          />
          <Textarea
            placeholder="Enter document content"
            value={transcripts[0]?.text || ''}
            onChange={(e) => setTranscripts([{ ...transcripts[0], text: e.target.value }])}
            className="h-32 mb-4"
          />
          <Button 
            onClick={handleAddDocument} 
            disabled={loading || !transcripts[0]?.name || !transcripts[0]?.text}
          >
            {loading ? 'Adding...' : 'Add Document'}
          </Button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Documents in store: {documentCount}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Chat</h2>
        <div className="space-y-4">
          <Textarea
            placeholder="Ask a question about your documents"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="h-32 mb-4"
          />
          <Button 
            onClick={handleChat} 
            disabled={loading || !question || documentCount === 0}
          >
            {loading ? 'Thinking...' : 'Ask Question'}
          </Button>
          
          {answer && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Answer:</h3>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                {answer}
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 