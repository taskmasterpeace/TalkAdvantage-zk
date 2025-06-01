"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Trash2, Edit2, Network, FileText, ChevronRight, X, Check } from "lucide-react"
import type { Person, Relationship, File } from '@/lib/services/knowledge-graph-service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as d3 from 'd3'

interface GraphData {
  nodes: Person[];
  edges: Relationship[];
}

interface ForceGraphData {
  nodes: Array<{
    id: string;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
    type: 'person' | 'file';
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
    properties?: Record<string, any>;
  }>;
}

interface NewRelationship {
  source: string;
  target: string;
  type: string;
  properties: {
    data: string;
  };
}

interface NewPerson {
  name: string;
  type: string;
  metadata: {
    data: string;
  };
}

export default function KnowledgeGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [forceGraphData, setForceGraphData] = useState<ForceGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Person | null>(null);
  const [selectedNodeFiles, setSelectedNodeFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false);
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [showAddRelationshipDialog, setShowAddRelationshipDialog] = useState(false);
  const [newPerson, setNewPerson] = useState<NewPerson>({ 
    name: "", 
    type: "individual",
    metadata: { data: "" }
  });
  const [newFile, setNewFile] = useState({ name: "", content: "", type: "" });
  const [newRelationship, setNewRelationship] = useState<NewRelationship>({ 
    source: "", 
    target: "", 
    type: "",
    properties: { data: "" }
  });
  const graphRef = useRef<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<Relationship | null>(null);
  const [showEdgeDetailsDialog, setShowEdgeDetailsDialog] = useState(false);
  const [editingEdge, setEditingEdge] = useState<Relationship | null>(null);
  const [editingNode, setEditingNode] = useState<Person | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  // Load initial graph data
  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First, get all people
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getAllPeople',
          data: { limit: 100 }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load graph data');
      }

      const people = await response.json();
      
      // Then get all relationships
      const relationshipsResponse = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getAllRelationships',
          data: {}
        })
      });

      if (!relationshipsResponse.ok) {
        throw new Error('Failed to load relationships');
      }

      const relationships = await relationshipsResponse.json();

      setGraphData({
        nodes: people,
        edges: relationships
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load graph data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, reload all data
      await loadGraphData();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'searchPeople',
          data: { query: searchQuery, limit: 100 }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search people');
      }

      const people = await response.json();
      
      // Get relationships for the found people
      const relationshipsResponse = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getAllRelationships',
          data: {}
        })
      });

      if (!relationshipsResponse.ok) {
        throw new Error('Failed to load relationships');
      }

      const allRelationships = await relationshipsResponse.json();
      
      // Filter relationships to only include those between found people
      const peopleIds = new Set(people.map((p: Person) => p.id));
      const filteredRelationships = allRelationships.filter((rel: Relationship) => 
        peopleIds.has(rel.source) && peopleIds.has(rel.target)
      );

      setGraphData({
        nodes: people,
        edges: filteredRelationships
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search people');
    } finally {
      setIsLoading(false);
    }
  };

  // Add debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createPerson',
          data: newPerson
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add person');
      }

      const result = await response.json();
      setGraphData(prev => ({
        nodes: [...prev.nodes, result],
        edges: prev.edges
      }));
      setShowAddPersonDialog(false);
      setNewPerson({ name: "", type: "individual", metadata: { data: "" } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFile = async () => {
    if (!selectedNode || !newFile.name.trim() || !newFile.content.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFile',
          data: {
            name: newFile.name,
            type: newFile.type,
            personId: selectedNode.id,
            metadata: {
              data: newFile.content
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add file');
      }

      const result = await response.json();
      setSelectedNodeFiles(prev => [...prev, result]);
      setShowAddFileDialog(false);
      setNewFile({ name: "", content: "", type: "" });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!newRelationship.source || !newRelationship.target || !newRelationship.type) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createRelationship',
          data: {
            ...newRelationship,
            properties: {
              data: newRelationship.type // Using the relationship type as the data
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add relationship');
      }

      const result = await response.json();
      setGraphData(prev => ({
        nodes: prev.nodes,
        edges: [...prev.edges, result]
      }));
      setShowAddRelationshipDialog(false);
      setNewRelationship({ source: "", target: "", type: "", properties: { data: "" } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add relationship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = useCallback(async (node: any) => {
    setSelectedNode(node);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPersonFiles',
          data: { personId: node.id }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const files = await response.json();
      setSelectedNodeFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
      setSelectedNodeFiles([]);
    }
  }, []);

  const handleNodeRightClick = useCallback((node: any, event: any) => {
    event.preventDefault();
    // Add context menu for node operations
  }, []);

  // Transform graph data for ForceGraph2D
  useEffect(() => {
    const transformedData: ForceGraphData = {
      nodes: graphData.nodes.map((node, index) => ({
        id: node.id,
        name: node.name,
        metadata: node.metadata,
        type: 'person',
        // Add initial positions to ensure nodes are visible
        x: (index % 3) * 200 + 200, // Spread nodes horizontally, start at 200
        y: Math.floor(index / 3) * 200 + 200, // Stack nodes vertically, start at 200
        vx: 0, // Initial velocity
        vy: 0
      })),
      links: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: edge.properties
      }))
    };
    setForceGraphData(transformedData);
  }, [graphData]);

  useEffect(() => {
    if (graphRef.current) {
      const width = window.innerWidth - 320;
      graphRef.current.d3Force('x', d3.forceX(width / 3).strength(0.2));
    }
  }, [forceGraphData]);

  // Filtered nodes for search
  const filteredNodes = graphData.nodes.filter(node =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdgeClick = (edge: Relationship) => {
    setSelectedEdge(edge);
    setShowEdgeDetailsDialog(true);
  };

  const handleEditEdge = async () => {
    if (!editingEdge) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRelationship',
          data: editingEdge
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update relationship');
      }

      const updatedEdge = await response.json();
      setGraphData(prev => ({
        nodes: prev.nodes,
        edges: prev.edges.map(e => e.id === updatedEdge.id ? updatedEdge : e)
      }));
      setShowEdgeDetailsDialog(false);
      setEditingEdge(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update relationship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteRelationship',
          data: { id: selectedEdge.id }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete relationship');
      }

      setGraphData(prev => ({
        nodes: prev.nodes,
        edges: prev.edges.filter(e => e.id !== selectedEdge.id)
      }));
      setShowEdgeDetailsDialog(false);
      setSelectedEdge(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete relationship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNode = async () => {
    if (!editingNode) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePerson',
          data: editingNode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update person');
      }

      const updatedNode = await response.json();
      setGraphData(prev => ({
        nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n),
        edges: prev.edges
      }));
      setSelectedNode(updatedNode);
      setEditingNode(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    console.log('Delete node called with ID:', nodeId);
    
    if (!confirm('Are you sure you want to delete this person? This will also delete all their connections.')) {
      console.log('Delete cancelled by user');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('Sending delete request for node:', nodeId);
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deletePerson',
          data: { id: nodeId }
        })
      });

      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete person');
      }

      // Update the graph data
      setGraphData(prev => ({
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
      }));

      // Clear selected node if it was deleted
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
        setSelectedNodeFiles([]);
      }

      // Show success message
      setError('Person deleted successfully');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFile = async () => {
    if (!editingFile) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateFile',
          data: editingFile
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update file');
      }

      const updatedFile = await response.json();
      setSelectedNodeFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
      setEditingFile(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteFile',
          data: { id: fileId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setSelectedNodeFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted/30 p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-gray-200 overflow-hidden flex flex-col">
        {/* Header & Controls */}
        <div className="w-full flex flex-col gap-4 px-8 pt-10 pb-10 bg-white min-h-[160px]">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Graph</h1>
          </div>
          <div className="relative">
            <Input
              placeholder="Search people..."
              className="pl-10 py-3 text-base border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-0 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex gap-3 mt-1">
            <Dialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1 flex items-center justify-center gap-2 text-base font-semibold py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white border-none">
                  <Plus className="h-5 w-5" />
                  Add Person
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Person</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newPerson.name}
                      onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newPerson.metadata.data}
                      onChange={(e) => setNewPerson(prev => ({ 
                        ...prev, 
                        metadata: { data: e.target.value }
                      }))}
                    />
                  </div>
                  <Button onClick={handleAddPerson} disabled={isLoading} className="w-full">
                    {isLoading ? 'Adding...' : 'Add Person'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddRelationshipDialog} onOpenChange={setShowAddRelationshipDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2 text-base font-semibold py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100">
                  <Network className="h-5 w-5" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Relationship</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceId">Source Person</Label>
                    <Select
                      value={newRelationship.source}
                      onValueChange={(value) => setNewRelationship(prev => ({ ...prev, source: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source person" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphData.nodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetId">Target Person</Label>
                    <Select
                      value={newRelationship.target}
                      onValueChange={(value) => setNewRelationship(prev => ({ ...prev, target: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target person" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphData.nodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Relationship Type</Label>
                    <Input
                      id="type"
                      value={newRelationship.type}
                      onChange={(e) => setNewRelationship(prev => ({ ...prev, type: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleAddRelationship} disabled={isLoading} className="w-full">
                    {isLoading ? 'Adding...' : 'Add Relationship'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode ? (
          <div className="flex-1 overflow-auto p-4 border-b border-gray-200">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">
                    {editingNode ? (
                      <Input
                        value={editingNode.name}
                        onChange={(e) => setEditingNode(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="text-lg font-semibold"
                      />
                    ) : (
                      selectedNode.name
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {editingNode ? (
                      <>
                        <Button variant="outline" size="icon" onClick={() => setEditingNode(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleEditNode} disabled={isLoading}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => setEditingNode(selectedNode)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            console.log('Delete button clicked for node:', selectedNode.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteNode(selectedNode.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedNode.type}</p>
              </div>

              {selectedNode.metadata?.data && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  {editingNode ? (
                    <Input
                      value={editingNode.metadata.data}
                      onChange={(e) => setEditingNode(prev => prev ? { 
                        ...prev, 
                        metadata: { data: e.target.value }
                      } : null)}
                    />
                  ) : (
                    <p className="text-sm">{selectedNode.metadata.data}</p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Files</h4>
                  <Dialog open={showAddFileDialog} onOpenChange={setShowAddFileDialog}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add File
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New File</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="fileName">Name</Label>
                          <Input
                            id="fileName"
                            value={newFile.name}
                            onChange={(e) => setNewFile(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fileType">Type</Label>
                          <Input
                            id="fileType"
                            value={newFile.type}
                            onChange={(e) => setNewFile(prev => ({ ...prev, type: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fileContent">Content</Label>
                          <Input
                            id="fileContent"
                            value={newFile.content}
                            onChange={(e) => setNewFile(prev => ({ ...prev, content: e.target.value }))}
                          />
                        </div>
                        <Button onClick={handleAddFile} disabled={isLoading} className="w-full">
                          {isLoading ? 'Adding...' : 'Add File'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {selectedNodeFiles.length > 0 ? (
                    selectedNodeFiles.map((file) => (
                      <Card key={file.id} className="p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            {editingFile?.id === file.id ? (
                              <Input
                                value={editingFile.name}
                                onChange={(e) => setEditingFile(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="text-sm font-medium"
                              />
                            ) : (
                              <div className="font-medium text-sm">{file.name}</div>
                            )}
                            <div className="text-xs text-muted-foreground">{file.type}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingFile?.id === file.id ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setEditingFile(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleEditFile} disabled={isLoading}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setEditingFile(file)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No files attached</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground border-b border-gray-200">
            Select a node to view details
          </div>
        )}

        {/* Main List Area */}
        <div className="flex-1 relative h-full overflow-auto rounded-b-2xl bg-slate-50 p-4" style={{minHeight: 400}}>
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-100 text-red-700 p-4 rounded-md z-10">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* List of nodes */}
              <div>
                <h3 className="text-lg font-semibold mb-4">People</h3>
                <div className="space-y-3">
                  {filteredNodes.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No people found.</div>
                  ) : (
                    filteredNodes.map((node) => (
                      <Card 
                        key={node.id} 
                        className="p-4 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleNodeClick(node)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{node.name}</h4>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {node.type}
                              </span>
                            </div>
                            {node.metadata?.data && (
                              <p className="text-sm text-gray-600 mt-1">{node.metadata.data}</p>
                            )}
                            
                            {/* Show relationships for this node */}
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Connections:</h5>
                              <div className="space-y-2">
                                {graphData.edges
                                  .filter(edge => edge.source === node.id || edge.target === node.id)
                                  .map(edge => {
                                    const connectedNode = graphData.nodes.find(
                                      n => n.id === (edge.source === node.id ? edge.target : edge.source)
                                    );
                                    return connectedNode ? (
                                      <div key={edge.id} className="flex items-center gap-2 text-sm">
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-600">{connectedNode.name}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                          {edge.type}
                                        </span>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 ml-auto"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdgeClick(edge);
                                          }}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : null;
                                  })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                console.log('Delete button clicked for node:', node.id);
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edge Details Dialog */}
      <Dialog open={showEdgeDetailsDialog} onOpenChange={setShowEdgeDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Details</DialogTitle>
          </DialogHeader>
          {selectedEdge && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <div className="text-sm">
                  {graphData.nodes.find(n => n.id === selectedEdge.source)?.name}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <div className="text-sm">
                  {graphData.nodes.find(n => n.id === selectedEdge.target)?.name}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                {editingEdge ? (
                  <Input
                    value={editingEdge.type}
                    onChange={(e) => setEditingEdge(prev => prev ? { ...prev, type: e.target.value } : null)}
                  />
                ) : (
                  <div className="text-sm">{selectedEdge.type}</div>
                )}
              </div>
              {selectedEdge.properties && (
                <div className="space-y-2">
                  <Label>Properties</Label>
                  {editingEdge ? (
                    <Input
                      value={editingEdge.properties.data}
                      onChange={(e) => setEditingEdge(prev => prev ? { ...prev, properties: { data: e.target.value } } : null)}
                    />
                  ) : (
                    <div className="text-sm">{selectedEdge.properties.data}</div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                {editingEdge ? (
                  <>
                    <Button variant="outline" onClick={() => setEditingEdge(null)}>Cancel</Button>
                    <Button onClick={handleEditEdge} disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditingEdge(selectedEdge)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteEdge} disabled={isLoading}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 