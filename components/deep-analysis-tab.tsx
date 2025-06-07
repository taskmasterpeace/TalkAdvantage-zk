"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Search, ChevronLeft, ChevronRight, Download, Trash2, Plus, BarChart2, MessageSquare } from "lucide-react"
import MediaPlayer from "./media-player"
import { useSettingsStore } from "@/lib/settings-store"
import { indexedDBService } from "@/lib/indexeddb/indexed-db-service"
import { unifiedRecordingsService } from "@/lib/recordings-service"
import { r2Service } from "@/lib/cloudflare/r2-service"
import KnowledgeGraph from "./knowledge-graph"

interface WordFrequency {
  word: string;
  count: number;
}

interface TopWords {
  name: string;
  topWords: WordFrequency[];
}

interface TimelineData {
  name: string;
  date: Date;
  sentiment: number;
}

interface SentimentData {
  name: string;
  sentiment: number;
  confidence: number;
}

export default function DeepAnalysisTab() {
  const [selectedTranscripts, setSelectedTranscripts] = useState<any[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [visualizationType, setVisualizationType] = useState("wordcloud")
  const [currentTranscript, setCurrentTranscript] = useState<string>("")
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>("")
  
  // Get storage location from settings store
  const storageLocation = useSettingsStore((state: { storageLocation: string }) => state.storageLocation)

  // Add state for selected transcript IDs
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<string[]>([])

  // Helper variables for select all logic
  const allIds = selectedTranscripts.map((t) => t.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedTranscriptIds.includes(id))
  const someSelected = selectedTranscriptIds.length > 0 && !allSelected

  const toggleSelectAll = async () => {
    if (allSelected) {
      // Remove all from vector store
      try {
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcripts: selectedTranscripts.map((t, index) => ({
              name: t.name,
              text: "", // We'll get the text in the next step
              index
            })),
            action: 'remove'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to remove transcripts');
        }

        const data = await response.json();
        setSelectedTranscriptIds([]);
      } catch (error) {
        console.error('Error removing all transcripts:', error);
        alert(error instanceof Error ? error.message : 'Failed to remove transcripts');
      }
    } else {
      // Add all to vector store
      try {
        // Get all transcript texts
        const transcriptsWithText = await Promise.all(
          selectedTranscripts.map(async (t, index) => {
            let text = "";
            if (storageLocation === 'local') {
              const localRecording = await indexedDBService.getRecording(t.id);
              text = localRecording?.transcript || "";
            } else {
              const response = await fetch(`/api/transcripts/${t.id}`);
              if (response.ok) {
                const data = await response.json();
                text = data.full_text || "";
              }
            }
            return {
              name: t.name,
              text,
              index
            };
          })
        );

        // Add all to vector store
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcripts: transcriptsWithText,
            action: 'add'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add transcripts');
        }

        setSelectedTranscriptIds(allIds);
      } catch (error) {
        console.error('Error adding all transcripts:', error);
        alert(error instanceof Error ? error.message : 'Failed to add transcripts');
      }
    }
  };

  const toggleSelectOne = async (id: string) => {
    const transcript = selectedTranscripts.find(t => t.id === id);
    if (!transcript) return;

    const isCurrentlySelected = selectedTranscriptIds.includes(id);
    const newSelectedIds = isCurrentlySelected 
      ? selectedTranscriptIds.filter(x => x !== id)
      : [...selectedTranscriptIds, id];

    try {
      // Get transcript text
      let text = "";
      if (storageLocation === 'local') {
        const localRecording = await indexedDBService.getRecording(id);
        text = localRecording?.transcript || "";
      } else {
        const response = await fetch(`/api/transcripts/${id}`);
        if (response.ok) {
          const data = await response.json();
          text = data.full_text || "";
        }
      }

      if (!text) {
        throw new Error('No transcript text available');
      }

      // Add or remove from vector store
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcripts: [{
            name: transcript.name,
            text,
            index: selectedTranscripts.findIndex(t => t.id === id)
          }],
          action: isCurrentlySelected ? 'remove' : 'add'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isCurrentlySelected ? 'remove' : 'add'} transcript`);
      }

      // Update selected IDs if vector store operation was successful
      setSelectedTranscriptIds(newSelectedIds);
    } catch (error) {
      console.error('Error managing transcript:', error);
      alert(error instanceof Error ? error.message : 'Failed to manage transcript');
    }
  };

  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResults(null);
    setAnalysisError(null);
    try {
      // Fetch transcript text for each selected transcript
      const transcriptsToAnalyze = await Promise.all(
        selectedTranscripts
          .filter(t => selectedTranscriptIds.includes(t.id))
          .map(async t => {
            let text = "";
            if (storageLocation === 'local') {
              const localRecording = await indexedDBService.getRecording(t.id);
              text = localRecording?.transcript || "";
            } else {
              const response = await fetch(`/api/transcripts/${t.id}`);
              if (response.ok) {
                const data = await response.json();
                text = data.full_text || "";
              }
            }
            return { name: t.name, text };
          })
      );
      // Call the new analysis API
      const response = await fetch('/api/analysis/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripts: transcriptsToAnalyze }),
      });
      if (!response.ok) {
        throw new Error('Failed to analyze transcripts');
      }
      const data = await response.json();
      setAnalysisResults(data);
    } catch (error: any) {
      setAnalysisError(error.message || 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Load selected transcripts from localStorage on component mount
  useEffect(() => {
    const storedTranscripts = localStorage.getItem('selectedTranscripts');
    if (storedTranscripts) {
      try {
        const parsedTranscripts = JSON.parse(storedTranscripts);
        setSelectedTranscripts(parsedTranscripts);
        // Clear the stored transcripts after loading
        localStorage.removeItem('selectedTranscripts');
        // Load transcript and audio for the first recording if available
        if (parsedTranscripts.length > 0) {
          fetchTranscript(parsedTranscripts[0]);
          fetchAudioUrl(parsedTranscripts[0]);
        }
      } catch (error) {
        console.error('Error parsing stored transcripts:', error);
      }
    }
  }, []);

  // Delete all transcripts from Weaviate when component mounts
  useEffect(() => {
    const deleteAllTranscripts = async () => {
      console.log('Deep Analysis Tab loaded - initiating transcript deletion');
      try {
        const response = await fetch('/api/analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteAll'
          }),
        });

        if (!response.ok) {
          console.warn('Failed to delete transcripts:', response.status);
          return; // Just return without throwing error
        }

        const data = await response.json();
        console.log('Successfully deleted transcripts:', data);
        setSelectedTranscriptIds([]);
        setDocumentCount(0);
      } catch (error) {
        console.warn('Error deleting transcripts:', error);
        // Don't throw error, just log it
      }
    };

    deleteAllTranscripts();
  }, []);

  const fetchAudioUrl = async (recording: any) => {
    try {
      if (!recording?.storage_path) {
        setCurrentAudioUrl("");
        return;
      }
      if (storageLocation === "local") {
        const url = await unifiedRecordingsService.getRecordingUrl(recording.storage_path);
        setCurrentAudioUrl(url);
      } else {
        const url = await r2Service.getFileUrl(recording.storage_path);
        setCurrentAudioUrl(url);
      }
    } catch (error) {
      console.error('Error fetching audio:', error);
      setCurrentAudioUrl("");
    }
  };

  const fetchTranscript = async (recording: any) => {
    setIsLoadingTranscript(true);
    try {
      let transcriptText = "";
      
      if (storageLocation === 'local') {
        // Fetch from IndexedDB
        const localRecording = await indexedDBService.getRecording(recording.id);
        if (localRecording?.transcript) {
          transcriptText = localRecording.transcript;
        } else {
          throw new Error('No transcript found in local storage');
        }
      } else {
        // Fetch from Supabase
        const response = await fetch(`/api/transcripts/${recording.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transcript from cloud');
        }
        const data = await response.json();
        transcriptText = data.full_text || "No transcript text available.";
      }

      setCurrentTranscript(transcriptText);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setCurrentTranscript("Error loading transcript.");
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const removeTranscript = (id: string) => {
    setSelectedTranscripts(prev => {
      const newTranscripts = prev.filter(t => t.id !== id);
      // If we removed the current transcript, load the next one if available
      if (newTranscripts.length > 0) {
        fetchTranscript(newTranscripts[0]);
        fetchAudioUrl(newTranscripts[0]);
      } else {
        setCurrentTranscript("");
        setCurrentAudioUrl("");
      }
      return newTranscripts;
    });
  };

  const clearAllTranscripts = () => {
    setSelectedTranscripts([]);
    setCurrentTranscript("");
    setCurrentAudioUrl("");
  };

  const demoTranscripts: any[] = []

  const demoTranscriptText = ""

  const bookmarks: any[] = []

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTranscripts, setActiveTranscripts] = useState<string[]>([]);

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    setIsChatLoading(true);
    const userMessage = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput("");
    try {
      // Call the chat endpoint with just the question
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });
      let answer = "";
      if (response.ok) {
        const data = await response.json();
        answer = data.answer || "No answer.";
        setActiveTranscripts(data.activeTranscripts || []);
      } else {
        const errorData = await response.json();
        answer = errorData.error || "Error getting answer from AI.";
        setActiveTranscripts(errorData.activeTranscripts || []);
      }
      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: error.message || 'Unknown error' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper function to highlight search terms in transcript
  function highlightTranscriptText(text: string, search: string) {
    if (!search) return text.split('\n').map((paragraph, idx) => <p key={idx}>{paragraph}</p>);
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split('\n').map((paragraph, idx) => (
      <p key={idx}>
        {paragraph.split(regex).map((part, i) =>
          regex.test(part) ? <mark key={i} style={{ background: '#ffe066', color: 'inherit', borderRadius: 3 }}>{part}</mark> : part
        )}
      </p>
    ));
  }

  // Add a function to download chat history as a text file
  function downloadChatHistory() {
    if (!chatHistory.length) return;
    const lines = chatHistory.map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`);
    const text = lines.join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis-chat.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const [visualizationData, setVisualizationData] = useState<WordFrequency[] | TopWords[] | TimelineData[] | SentimentData[] | null>(null);
  const [isGeneratingViz, setIsGeneratingViz] = useState(false);

  const generateVisualization = async () => {
    if (!analysisResults?.results?.length) {
      console.warn('No analysis results available');
      return;
    }
    
    setIsGeneratingViz(true);
    try {
      let data: WordFrequency[] | TopWords[] | TimelineData[] | SentimentData[];
      
      switch (visualizationType) {
        case 'wordcloud': {
          // Combine all summaries and count word frequencies
          const allText = analysisResults.results
            .map((r: any) => r.summary || '')
            .join(' ')
            .toLowerCase();
          
          // Remove common words and clean text
          const words = allText
            .split(/\W+/)
            .filter(word => word.length > 3) // Only words longer than 3 characters
            .filter(word => !['this', 'that', 'with', 'from', 'have', 'were', 'they', 'their', 'what', 'when'].includes(word));
          
          const wordFreq: { [key: string]: number } = {};
          words.forEach((word: string) => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          });
          
          data = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 50)
            .map(([word, count]) => ({ word, count }));
          break;
        }

        case 'topwords': {
          data = analysisResults.results.map((result: any) => {
            const text = (result.summary || '').toLowerCase();
            const words = text
              .split(/\W+/)
              .filter(word => word.length > 3)
              .filter(word => !['this', 'that', 'with', 'from', 'have', 'were', 'they', 'their', 'what', 'when'].includes(word));
            
            const wordFreq: { [key: string]: number } = {};
            words.forEach((word: string) => {
              wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            return {
              name: result.name || 'Unnamed Transcript',
              topWords: Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([word, count]) => ({ word, count }))
            };
          });
          break;
        }

        case 'timeline': {
          data = analysisResults.results.map((result: any) => ({
            name: result.name || 'Unnamed Transcript',
            date: new Date(result.created_at || Date.now()),
            sentiment: parseFloat(result.sentimentScore) || 0
          }));
          break;
        }

        case 'sentiment': {
          data = analysisResults.results.map((result: any) => ({
            name: result.name || 'Unnamed Transcript',
            sentiment: parseFloat(result.sentimentScore) || 0,
            confidence: parseFloat(result.confidence) || 0
          }));
          break;
        }

        case 'knowledgegraph': {
          // Implementation of knowledge graph generation
          // This is a placeholder and should be replaced with actual implementation
          data = [];
          break;
        }

        default:
          data = [];
      }
      
      setVisualizationData(data);
    } catch (error) {
      console.error('Error generating visualization:', error);
    } finally {
      setIsGeneratingViz(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel */}
      <div className="space-y-4">
        {/* Transcript Selection */}
        <Card>
          <div className="bg-muted p-2 flex items-center justify-between">
            <h3 className="font-medium">Selected Transcripts ({selectedTranscripts.length})</h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={allSelected}
                onChange={toggleSelectAll}
                id="select-all-transcripts"
                className="mr-1 accent-primary h-4 w-4 rounded border border-muted-foreground focus:ring-2 focus:ring-primary"
                style={{ verticalAlign: 'middle' }}
              />
              <label htmlFor="select-all-transcripts" className="text-xs select-none cursor-pointer">Select All</label>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={clearAllTranscripts}
                disabled={selectedTranscripts.length === 0}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-2 max-h-[150px] overflow-y-auto">
            {selectedTranscripts.length > 0 ? (
              <div className="space-y-2">
                {selectedTranscripts.map((transcript) => (
                  <div 
                    key={transcript.id} 
                    className={`flex items-center justify-between p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 ${selectedTranscriptIds.includes(transcript.id) ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      fetchTranscript(transcript);
                      fetchAudioUrl(transcript);
                    }}
                  >
                    <div onClick={e => { e.stopPropagation(); toggleSelectOne(transcript.id); }}>
                      <Checkbox
                        checked={selectedTranscriptIds.includes(transcript.id)}
                        id={`select-transcript-${transcript.id}`}
                        className="mr-2"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{transcript.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(transcript.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={e => {
                        e.stopPropagation();
                        removeTranscript(transcript.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                No transcripts selected. Select recordings from the library to analyze.
              </div>
            )}
          </div>
          <div className="p-2 flex justify-end">
            <Button onClick={handleAnalyze} disabled={selectedTranscriptIds.length === 0 || isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
          {analysisError && (
            <div className="p-2 text-red-600 text-sm">{analysisError}</div>
          )}
        </Card>

        {/* Media Player */}
        <Card>
          <div className="bg-muted p-2">
            <h3 className="font-medium">Media Player</h3>
          </div>
          <div className="p-4">
            <MediaPlayer showBookmarks={true} audioUrl={currentAudioUrl} />
          </div>
        </Card>

        {/* Transcript Viewer */}
        <Card className="overflow-hidden">
          <div className="bg-muted p-2 flex items-center justify-between">
            <h3 className="font-medium">Transcript</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transcript..."
                  className="pl-8 h-9 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!searchQuery}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!searchQuery}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={(checked) => setAutoScroll(checked as boolean)}
                />
                <Label htmlFor="auto-scroll" className="text-sm">
                  Auto-scroll
                </Label>
              </div>
            </div>
          </div>
          <div className="p-4 h-[300px] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
            {isLoadingTranscript ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                <span className="ml-2 text-muted-foreground">Loading transcript...</span>
              </div>
            ) : currentTranscript ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {highlightTranscriptText(currentTranscript, searchQuery)}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No transcript available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Panel */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Analysis</h3>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
        </div>

        <Tabs defaultValue="insights">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">Transcript Insights</TabsTrigger>
            <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
            <TabsTrigger value="chat">Analysis Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setAnalysisResults(null); setAnalysisError(null); }}>
                  Clear
                </Button>
              </div>
              <Button onClick={handleAnalyze} disabled={selectedTranscriptIds.length === 0 || isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
            {analysisError && (
              <div className="p-2 text-red-600 text-sm">{analysisError}</div>
            )}
            {analysisResults && (
              <div className="space-y-4">
                {analysisResults.results.map((result: any, idx: number) => {
                  const sentiment = parseFloat(result.sentimentScore) || 0;
                  const confidence = parseFloat(result.confidence) || 0;
                  
                  // Calculate sentiment percentages
                  let positive = 0;
                  let neutral = 0;
                  let negative = 0;
                  
                  // Adjust thresholds for better distribution
                  if (sentiment > 0.1) {
                    positive = Math.min(100, sentiment * 100);
                    neutral = Math.max(0, (100 - positive) / 2);
                    negative = Math.max(0, 100 - positive - neutral);
                  } else if (sentiment < -0.1) {
                    negative = Math.min(100, Math.abs(sentiment) * 100);
                    neutral = Math.max(0, (100 - negative) / 2);
                    positive = Math.max(0, 100 - negative - neutral);
                  } else {
                    // For very neutral sentiment, distribute remaining percentages
                    neutral = 70; // Base neutral percentage
                    const remaining = 30;
                    if (sentiment > 0) {
                      positive = remaining;
                    } else {
                      negative = remaining;
                    }
                  }
                  
                  // Ensure percentages add up to 100
                  const total = positive + neutral + negative;
                  if (total !== 100) {
                    const factor = 100 / total;
                    positive = Math.round(positive * factor);
                    neutral = Math.round(neutral * factor);
                    negative = 100 - positive - neutral;
                  }

                  return (
                    <div key={idx} className="mb-4 p-4 bg-muted/30 rounded-lg">
                      <div className="font-semibold mb-2">{result.name}</div>
                      <div className="text-sm mb-2">
                        <span className="font-medium">Summary:</span> {result.summary}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Sentiment Analysis:</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                          {positive > 0 && (
                            <div 
                              className="h-full bg-green-500"
                              style={{ width: `${positive}%` }}
                            />
                          )}
                          {neutral > 0 && (
                            <div 
                              className="h-full bg-gray-500"
                              style={{ width: `${neutral}%` }}
                            />
                          )}
                          {negative > 0 && (
                            <div 
                              className="h-full bg-red-500"
                              style={{ width: `${negative}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Positive: {positive.toFixed(0)}%</span>
                          <span>Neutral: {neutral.toFixed(0)}%</span>
                          <span>Negative: {negative.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Confidence: {confidence.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                {analysisResults.results.length > 1 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="font-semibold mb-1">Relation Analysis</div>
                    <div className="text-sm whitespace-pre-line">{analysisResults.relation}</div>
                  </div>
                )}
              </div>
            )}
            {!analysisResults && !isAnalyzing && (
              <Card className="overflow-hidden">
                <div className="p-2 max-h-[500px] overflow-y-auto">
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No transcripts available
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="viz-type">Visualization Type</Label>
                  <Select value={visualizationType} onValueChange={setVisualizationType}>
                    <SelectTrigger id="viz-type" className="w-[180px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordcloud">Word Cloud</SelectItem>
                      <SelectItem value="topwords">Top Words</SelectItem>
                      <SelectItem value="timeline">Timeline</SelectItem>
                      <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                      <SelectItem value="knowledgegraph">Knowledge Graph</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={generateVisualization} 
                  disabled={isGeneratingViz}
                >
                  {isGeneratingViz ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>

              <div className="mb-8">
                {visualizationType === "knowledgegraph" && <KnowledgeGraph />}
              </div>

              <div className="h-[300px] bg-muted/30 rounded-md flex items-center justify-center">
                {isGeneratingViz ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    <span>Generating visualization...</span>
                  </div>
                ) : visualizationData ? (
                  <div className="w-full h-full p-4">
                    {visualizationType === "knowledgegraph" ? (
                 <></>
                    ) : visualizationType === "wordcloud" ? (
                      <div className="flex flex-wrap justify-center items-center gap-2 p-4">
                        {visualizationData.map((item: any, idx: number) => {
                          const fontSize = Math.max(12, Math.min(48, (item.count || 0) * 2));
                          const opacity = Math.max(0.3, Math.min(1, (item.count || 0) / 10));
                          return (
                            <div 
                              key={idx}
                              className="text-primary"
                              style={{ 
                                fontSize: `${fontSize}px`,
                                opacity: opacity
                              }}
                            >
                              {item.word}
                            </div>
                          );
                        })}
                      </div>
                    ) : visualizationType === "topwords" ? (
                      <div className="space-y-4 p-4">
                        {visualizationData.map((transcript: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                            <h4 className="font-medium">{transcript.name}</h4>
                            <div className="flex flex-wrap gap-2">
                              {(transcript.topWords || []).map((word: any, wordIdx: number) => (
                                <div 
                                  key={wordIdx}
                                  className="px-2 py-1 bg-primary/10 rounded-full text-sm"
                                >
                                  {word.word} ({word.count})
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : visualizationType === "timeline" ? (
                      <div className="space-y-4 p-4">
                        {visualizationData.map((item: any, idx: number) => {
                          const sentiment = parseFloat(item.sentiment) || 0;
                          return (
                            <div key={idx} className="flex items-center gap-4">
                              <div className="w-32 text-sm truncate">{item.name}</div>
                              <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${sentiment > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.abs(sentiment * 100)}%` }}
                                />
                              </div>
                              <div className="w-16 text-sm text-right">
                                {sentiment.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : visualizationType === "sentiment" ? (
                      <div className="space-y-4 p-4">
                        {visualizationData.map((item: any, idx: number) => {
                          const sentiment = parseFloat(item.sentiment) || 0;
                          const confidence = parseFloat(item.confidence) || 0;
                          
                          // Calculate sentiment percentages
                          let positive = 0;
                          let neutral = 0;
                          let negative = 0;
                          
                          // Adjust thresholds for better distribution
                          if (sentiment > 0.1) {
                            positive = Math.min(100, sentiment * 100);
                            neutral = Math.max(0, (100 - positive) / 2);
                            negative = Math.max(0, 100 - positive - neutral);
                          } else if (sentiment < -0.1) {
                            negative = Math.min(100, Math.abs(sentiment) * 100);
                            neutral = Math.max(0, (100 - negative) / 2);
                            positive = Math.max(0, 100 - negative - neutral);
                          } else {
                            // For very neutral sentiment, distribute remaining percentages
                            neutral = 70; // Base neutral percentage
                            const remaining = 30;
                            if (sentiment > 0) {
                              positive = remaining;
                            } else {
                              negative = remaining;
                            }
                          }
                          
                          // Ensure percentages add up to 100
                          const total = positive + neutral + negative;
                          if (total !== 100) {
                            const factor = 100 / total;
                            positive = Math.round(positive * factor);
                            neutral = Math.round(neutral * factor);
                            negative = 100 - positive - neutral;
                          }

                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="truncate">{item.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  Confidence: {confidence.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                                {positive > 0 && (
                                  <div 
                                    className="h-full bg-green-500"
                                    style={{ width: `${positive}%` }}
                                  />
                                )}
                                {neutral > 0 && (
                                  <div 
                                    className="h-full bg-gray-500"
                                    style={{ width: `${neutral}%` }}
                                  />
                                )}
                                {negative > 0 && (
                                  <div 
                                    className="h-full bg-red-500"
                                    style={{ width: `${negative}%` }}
                                  />
                                )}
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Positive: {positive.toFixed(0)}%</span>
                                <span>Neutral: {neutral.toFixed(0)}%</span>
                                <span>Negative: {negative.toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <BarChart2 className="h-12 w-12 mx-auto mb-2" />
                    <p>Generate visualization to see results</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4 mt-4 h-full">
            <Card className="overflow-hidden flex flex-col" style={{ height: '65vh' }}>
              <div className="bg-muted p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <h3 className="font-medium">Analysis Chat</h3>
                </div>
                <div className="flex items-center gap-2">
                  {activeTranscripts.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Active: {activeTranscripts.join(', ')}
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadChatHistory}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setChatHistory([])}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatHistory.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Start a conversation to analyze transcripts
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`rounded-md p-2 ${msg.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                    <span className="block font-medium mb-1">{msg.role === 'user' ? 'You' : 'AI'}</span>
                    <span>{msg.content}</span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center text-muted-foreground"><span className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent mr-2"></span>AI is thinking...</div>
                )}
              </div>
              <div className="p-2 border-t">
                <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); handleChatSend(); }}>
                  <Input
                    placeholder="Ask a question about the transcripts..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                  />
                  <Button type="submit" disabled={isChatLoading || !chatInput.trim()}>Send</Button>
                </form>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
