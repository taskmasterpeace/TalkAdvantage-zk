import { useEffect, useState } from 'react';
import { knowledgeGraphService } from '@/lib/services/knowledge-graph-service';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Download, Eye, Tag, X, RefreshCw, Users, Target, FileArchive, MessageSquare, Calendar, AlertTriangle, Globe } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';

interface ContextPack {
  id: string;
  userId: string;
  name: string;
  userRole: string;
  goal: string;
  subGoals: string[];
  person: string;
  personRelationship: string;
  participants: Array<{
    name: string;
    role: string;
    relationship_to_user: string;
    apex_profile?: {
      risk_tolerance?: string;
      decision_speed?: string;
      key_motivators?: string[];
      recent_behavior?: string;
    };
  }>;
  documents: Array<{
    name: string;
    file: string;
    tags?: string[];
  }>;
  contextDescription: string;
  keyTopics: string[];
  notes: string;
  timeline?: string[];
  conflictMap?: string;
  environmentalFactors?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function ContextPackViewer() {
  const [contextPacks, setContextPacks] = useState<ContextPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<{ name: string; file: string; url?: string } | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContextPacks();
  }, []);

  const loadContextPacks = async () => {
    try {
      setLoading(true);
      const packs = await knowledgeGraphService.getAllContextPacks();
      // Parse document JSON strings into objects
      const parsedPacks = packs.map(pack => ({
        ...pack,
        documents: (pack.documents || []).map((doc:any) =>
           JSON.parse(doc)
        )
      }));
  
      setContextPacks(parsedPacks);
    } catch (error) {
      console.error('Error loading context packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignedUrl = async (file: string) => {
    if (docUrls[file]) return docUrls[file];
    const res = await fetch(`/api/document-url?path=${encodeURIComponent(file)}`);
    if (res.ok) {
      const data = await res.json();
      setDocUrls(prev => ({ ...prev, [file]: data.url }));
      return data.url;
    }
    return null;
  };

  const handleView = async (doc:any) => {
  console.log(doc,"testing12")
    if (!doc.file) {
      setSelectedDocument({ ...doc, url: undefined });
      return;
    }
    const url = await fetchSignedUrl(doc.file);
    setSelectedDocument({ ...doc, url });
  };

  const handleDownload = async (file: string, name: string) => {
    if (!file) return;
    const url = await fetchSignedUrl(file);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Context Packs</h2>
        <Button onClick={loadContextPacks} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {contextPacks.map((pack) => (
            <Card key={pack.id} className="bg-white border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <span>{pack.name}</span>
                      <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-800 border border-gray-300">
                        {pack.userRole}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
                      Created: {new Date(pack.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-100 text-gray-800 border border-gray-300">
                      {pack.person}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid grid-cols-6 mb-4 bg-gray-100 border border-gray-200 rounded">
                    <TabsTrigger value="overview" className="flex items-center gap-2 text-gray-800">
                      <Target className="h-4 w-4 text-gray-500" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="participants" className="flex items-center gap-2 text-gray-800">
                      <Users className="h-4 w-4 text-gray-500" /> Participants
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2 text-gray-800">
                      <FileArchive className="h-4 w-4 text-gray-500" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="context" className="flex items-center gap-2 text-gray-800">
                      <MessageSquare className="h-4 w-4 text-gray-500" /> Context
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex items-center gap-2 text-gray-800">
                      <Calendar className="h-4 w-4 text-gray-500" /> Timeline
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="flex items-center gap-2 text-gray-800">
                      <AlertTriangle className="h-4 w-4 text-gray-500" /> Analysis
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Goal</h3>
                          <p className="text-black">{pack.goal}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Sub Goals</h3>
                          <div className="flex flex-wrap gap-2">
                            {pack.subGoals.map((goal, i) => (
                              <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-800 border border-gray-300">
                                {goal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Key Topics</h3>
                          <div className="flex flex-wrap gap-2">
                            {pack.keyTopics.map((topic, i) => (
                              <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-800 border border-gray-300">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Relationship</h3>
                          <p className="text-black">{pack.personRelationship}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="participants" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pack.participants.map((p, i) => (
                        <Card key={i} className="bg-white">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold">{p.name}</h3>
                                  <p className="text-sm text-gray-500">{p.role}</p>
                                </div>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 border border-gray-300">
                                  {p.relationship_to_user}
                                </Badge>
                              </div>
                              {p.apex_profile && (
                                <div className="space-y-2">
                                  <Separator />
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {p.apex_profile.risk_tolerance && (
                                      <div>
                                        <span className="text-gray-800">Risk Tolerance:</span>
                                        <p className="text-gray-800">{p.apex_profile.risk_tolerance}</p>
                                      </div>
                                    )}
                                    {p.apex_profile.decision_speed && (
                                      <div>
                                        <span className="text-gray-800">Decision Speed:</span>
                                        <p className="text-gray-800">{p.apex_profile.decision_speed}</p>
                                      </div>
                                    )}
                                    {p.apex_profile.key_motivators && (
                                      <div className="col-span-2">
                                        <span className="text-gray-800">Key Motivators:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {p.apex_profile.key_motivators.map((m, j) => (
                                            <Badge key={j} variant="secondary" className="text-xs bg-gray-100 text-gray-800 border border-gray-300">
                                              {m}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {p.apex_profile.recent_behavior && (
                                      <div className="col-span-2">
                                        <span className="text-gray-800">Recent Behavior:</span>
                                        <p className="text-gray-800">{p.apex_profile.recent_behavior}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   
                      {pack.documents.map((doc, i) => (
                        <Card key={i} className="bg-white">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-800" />
                                <div>
                                  <h3 className="font-semibold">{doc.name}</h3>
                                  {doc.tags && doc.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {doc.tags.map((tag, j) => (
                                        <Badge key={j} variant="secondary" className="text-xs bg-gray-100 text-gray-800 border border-gray-300">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(doc)}>
                                      <Eye className="h-4 w-4 text-gray-500" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-gray-800">{doc.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="aspect-video flex items-center justify-center">
                                      {selectedDocument?.url ? (
                                        <img src={selectedDocument.url} alt={selectedDocument.name} className="w-full h-full object-contain" />
                                      ) : (
                                        <span className="text-gray-400">No preview available</span>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownload(doc.file, doc.name)}
                                >
                                  <Download className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="context" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Context Description</h3>
                        <p className="text-gray-800 whitespace-pre-wrap">{pack.contextDescription}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Notes</h3>
                        <p className="text-gray-800 whitespace-pre-wrap">{pack.notes}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    {pack.timeline && pack.timeline.length > 0 ? (
                      <div className="space-y-4">
                        {pack.timeline.map((event, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-gray-800" />
                              {i < pack.timeline!.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-200" />
                              )}
                            </div>
                            <div className="pb-4">
                              <p className="text-gray-800">{event}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-800">No timeline events available.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="analysis" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {pack.conflictMap && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Conflict Map</h3>
                          <p className="text-gray-800 whitespace-pre-wrap">{pack.conflictMap}</p>
                        </div>
                      )}
                      {pack.environmentalFactors && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Environmental Factors</h3>
                          <p className="text-gray-800 whitespace-pre-wrap">{pack.environmentalFactors}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 