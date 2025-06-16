import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, X, Edit, FileText } from "lucide-react";
import { useTemplateStore } from '@/lib/template-store';
import { useToast } from '@/hooks/use-toast';
import { HotLinkWidget } from '@/lib/hooks/use-hotlink-detection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STORAGE_KEY = 'hotlink-widgets';

const defaultWidgets: HotLinkWidget[] = [
  {
    id: '1',
    triggerWords: ['research', 'study', 'analyze'],
    name: 'Research Widget',
    prompt: `📋 FlashPrompt (Widget Prompt):

Based on the conversation provided below, your job is to act as an expert research assistant with internet access. Carefully analyze the transcript to identify:

Explicit research requests (directly asked-for information).

Implicit research needs (topics or gaps hinted at, but not directly requested).

Potentially valuable research (areas where additional information would clearly benefit the team, even if not mentioned).

For each identified research need, perform thorough, multi-step research using reliable, up-to-date internet sources. Summarize your findings in a clear, concise, and actionable format. If any research need is ambiguous or unclear, explicitly ask clarifying questions before proceeding.

Always follow this exact output structure:

🧠 Research Summary & Insights

1. Identified Research Needs

Explicit Requests:
(List all directly requested research topics/questions from the conversation.)

Implicit Needs:
(List topics where research was implied, hinted at, or would clearly add value.)

Potential Opportunities:
(List any additional research topics you detected would benefit the team, even if not mentioned.)

2. Research Findings

For each research need, provide:

[Research Topic/Question #1]

Summary: (Concise, actionable answer or synthesis.)

Key Insights: (Bullet points of the most important findings.)

Sources: (List URLs or source names for verification and further reading.)

Recommended Next Steps: (Optional: Suggest how to use this information or further research if needed.)

[Research Topic/Question #2]

Summary: ...

Key Insights: ...

Sources: ...

Recommended Next Steps: ...
(Continue for each research need.)


📝 [Conversation Data]

{{transcript}}`,
    model: 'mistralai/mistral-7b-instruct'
  },
  {
    id: '2',
    triggerWords: ['github', 'code', 'repository'],
    name: 'GitHub Widget',
    prompt: `Based on the conversation provided below, your job is to carefully analyze the recent discussion to identify any problems, challenges, issues, or gaps mentioned. Then, automatically search for active GitHub projects that could help address these problems, prioritizing repositories with high star counts (e.g., top 10% or those with 1,000+ stars) and recent updates (e.g., within the last 6 months). Use reliable sources or your knowledge base to suggest relevant, high-quality projects. If the problems are unclear, ambiguous, or not present, explicitly ask clarifying questions before proceeding.

Ensure the output is professional, concise, and actionable. Focus on relevance, accuracy, and usefulness, drawing directly from the conversation context. Limit suggestions to 3-5 top projects per identified problem to avoid overwhelming the user. Use a structured template for quick comprehension.

Always follow this exact format for the output:
🛠️ GitHub Solution Suggestions
[Identified Problem]: (Summarize the key problem or issue from the conversation in one concise sentence, based on the analysis.)
Suggested GitHub Projects: (List recommended repositories that could help solve the problem, prioritized by stars and recency. Include details like repository name, star count, last update date, and a brief description of how it applies.)
- Project #1: [Repo Name] (Stars: [X], Last Updated: [Date]) - [Brief description and relevance to the problem].
- Project #2: [Repo Name] (Stars: [X], Last Updated: [Date]) - [Brief description and relevance].
- Project #3: [Repo Name] (Stars: [X], Last Updated: [Date]) - [Brief description and relevance]. (Continue as needed, up to 5, or say "No additional suggestions" if fewer.)
Sources: (Cite the sources used for the search, such as GitHub API, specific queries, or general knowledge. If based on simulated data, note "Based on general knowledge up to [last training date, e.g., 2023]" and recommend verifying with current GitHub searches.)
Additional Recommendations (optional): (If relevant, suggest next steps, such as how to implement the project or where to find more resources. If not applicable, omit this section or say "No additional recommendations.")

📝 [Conversation Data]  
{{transcript}}  (Focus on the most recent part to identify problems and context.)`,
    model: 'mistralai/mistral-7b-instruct'
  },
  {
    id: '3',
    triggerWords: ['ticket'],
    name: 'Ticket Widget',
    prompt: `Based on the conversation provided below, your job is to analyze all discussed points carefully. Clearly identify issues, actionable tasks, areas for improvement, or we need a ticket for resolving. Generate detailed task tickets following the exact template below.

🎟️ Ticket Creation Template
[Ticket Title]
Issue/Problem Statement:
Objectives & Requirements:
Implementation Details:
Additional Assets/Resources:
Acceptance Criteria:
Assigned To:
Priority Level:
Status:
Due Date:`,
    model: 'mistralai/mistral-7b-instruct'
  }
];

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

const HotLinkWidgets: React.FC = () => {
  const { toast } = useToast();
  const templateStore = useTemplateStore();
  const [widgets, setWidgets] = useState<HotLinkWidget[]>(() => {
    if (typeof window !== 'undefined') {
      const savedWidgets = localStorage.getItem(STORAGE_KEY);
      if (savedWidgets) {
        const parsedWidgets = JSON.parse(savedWidgets);
        // Ensure each widget has a model, defaulting to Mistral 7B if not set
        return parsedWidgets.map((widget: HotLinkWidget) => ({
          ...widget,
          model: widget.model || 'mistralai/mistral-7b-instruct'
        }));
      }
    }
    return defaultWidgets;
  });

  // Save to localStorage whenever widgets change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const [editingWidget, setEditingWidget] = useState<HotLinkWidget | null>(null);
  const [editingTriggerWord, setEditingTriggerWord] = useState('');

  const [newWidget, setNewWidget] = useState<Partial<HotLinkWidget>>({
    name: '',
    triggerWords: [],
    prompt: '',
    model: 'mistralai/mistral-7b-instruct' // Default to Mistral 7B
  });
  const [newTriggerWord, setNewTriggerWord] = useState('');

  // Add state for analytics profile import
  const [showProfileImport, setShowProfileImport] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [triggerWord, setTriggerWord] = useState('');

  const [showModelChangeDialog, setShowModelChangeDialog] = useState(false);
  const [modelChangeInfo, setModelChangeInfo] = useState({ widgetName: '', newModel: '' });

  // Add state for save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveInfo, setSaveInfo] = useState({ widgetName: '', model: '' });

  const handleEdit = (widget: HotLinkWidget) => {
    setEditingWidget({ ...widget });
  };

  const handleSave = () => {
    if (editingWidget) {
      const updatedWidgets = widgets.map(w => w.id === editingWidget.id ? editingWidget : w);
      setWidgets(updatedWidgets);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWidgets));
      
      // Show save dialog
      setSaveInfo({
        widgetName: editingWidget.name,
        model: editingWidget.model
      });
      setShowSaveDialog(true);
      
      setEditingWidget(null);
      
      // Show confirmation toast
      toast({
        title: "Widget Updated",
        description: `Updated ${editingWidget.name} with model ${editingWidget.model}`,
      });
    }
  };

  const addTriggerWordToEdit = () => {
    if (editingWidget && editingTriggerWord.trim() && !editingWidget.triggerWords.includes(editingTriggerWord.trim())) {
      setEditingWidget({
        ...editingWidget,
        triggerWords: [...editingWidget.triggerWords, editingTriggerWord.trim()]
      });
      setEditingTriggerWord('');
    }
  };

  const removeTriggerWordFromEdit = (word: string) => {
    if (editingWidget) {
      setEditingWidget({
        ...editingWidget,
        triggerWords: editingWidget.triggerWords.filter(w => w !== word)
      });
    }
  };

  const addTriggerWord = () => {
    if (newTriggerWord.trim() && !newWidget.triggerWords?.includes(newTriggerWord.trim())) {
      setNewWidget(prev => ({
        ...prev,
        triggerWords: [...(prev.triggerWords || []), newTriggerWord.trim()]
      }));
      setNewTriggerWord('');
    }
  };

  const removeTriggerWord = (word: string) => {
    setNewWidget(prev => ({
      ...prev,
      triggerWords: prev.triggerWords?.filter(w => w !== word) || []
    }));
  };

  const addWidget = () => {
    if (newWidget.name && newWidget.triggerWords?.length && newWidget.prompt) {
      setWidgets(prev => [...prev, {
        id: Date.now().toString(),
        name: newWidget.name!,
        triggerWords: newWidget.triggerWords!,
        prompt: newWidget.prompt!,
        model: newWidget.model!
      }]);
      setNewWidget({
        name: '',
        triggerWords: [],
        prompt: '',
        model: 'mistralai/mistral-7b-instruct'
      });
    }
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  // Function to import analytics profile as widget
  const importAnalyticsProfile = () => {
    if (!selectedProfile || !triggerWord) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a profile and enter a trigger word.",
      });
      return;
    }

    const profile = templateStore.templates.find(t => t.name === selectedProfile);
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Profile Not Found",
        description: "The selected profile could not be found.",
      });
      return;
    }

    // Combine all template fields into a single system prompt
    const combinedPrompt = [
      profile.system_prompt,
      profile.user_prompt,
      profile.template_prompt
    ].filter(Boolean).join('\n\n');

    // Create new widget from profile
    const newWidget: HotLinkWidget = {
      id: crypto.randomUUID(),
      triggerWords: [triggerWord.toLowerCase()],
      name: `${profile.name} Analysis`,
      prompt: combinedPrompt,
      model: 'mistralai/mistral-7b-instruct'
    };

    // Add to widgets
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWidgets));

    // Reset form
    setSelectedProfile('');
    setTriggerWord('');
    setShowProfileImport(false);

    toast({
      title: "Profile Imported",
      description: `Analytics profile "${profile.name}" has been added as a HotLink widget.`,
    });
  };

  const handleModelChange = (value: string) => {
    if (editingWidget) {
      setEditingWidget({ ...editingWidget, model: value });
      // Save immediately when model changes
      const updatedWidgets = widgets.map(w => 
        w.id === editingWidget.id ? { ...editingWidget, model: value } : w
      );
      setWidgets(updatedWidgets);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWidgets));
      
      // Show both toast and dialog
      toast({
        title: "Model Updated",
        description: `Changed model to ${value}`,
      });

      // Show dialog
      setModelChangeInfo({
        widgetName: editingWidget.name,
        newModel: value
      });
      setShowModelChangeDialog(true);
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">HotLink Widgets</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfileImport(true)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Import Analytics Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addWidget}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Analytics Profile Import Dialog */}
      {showProfileImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Import Analytics Profile</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileImport(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Select Analytics Profile</Label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Select a profile...</option>
                  {templateStore.templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Trigger Word</Label>
                <Input
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  placeholder="Enter trigger word..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowProfileImport(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={importAnalyticsProfile}
                  disabled={!selectedProfile || !triggerWord}
                >
                  Import Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {widgets.map(widget => (
          <Card 
            key={widget.id} 
            className="p-3"
          >
            {editingWidget?.id === widget.id ? (
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Input
                    value={editingWidget.name}
                    onChange={e => setEditingWidget({ ...editingWidget, name: e.target.value })}
                    placeholder="Widget Name"
                    className="h-8"
                  />
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={handleSave} className="h-8 w-8 p-0">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingWidget(null)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add trigger word"
                      value={editingTriggerWord}
                      onChange={e => setEditingTriggerWord(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTriggerWordToEdit();
                        }
                      }}
                      className="h-8"
                    />
                    <Button onClick={addTriggerWordToEdit} className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {editingWidget.triggerWords.map(word => (
                      <span key={word} className="px-2 py-0.5 bg-primary/10 rounded-full text-xs flex items-center gap-1">
                        {word}
                        <button onClick={() => removeTriggerWordFromEdit(word)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Model</Label>
                  <Select
                    value={editingWidget.model}
                    onValueChange={handleModelChange}
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

                <div>
                  <Label>Prompt</Label>
                  <Textarea
                    value={editingWidget.prompt}
                    onChange={e => setEditingWidget({ ...editingWidget, prompt: e.target.value })}
                    placeholder="Enter prompt"
                    className="min-h-[120px] text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm">{widget.name}</h3>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(widget)} 
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeWidget(widget.id)} 
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {widget.triggerWords.map(word => (
                    <span key={word} className="px-1.5 py-0.5 bg-primary/10 rounded-full text-xs">
                      {word}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{widget.prompt}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <h3 className="font-medium text-sm mb-2">Add New Widget</h3>
        <div className="space-y-2">
          <Input
            placeholder="Widget Name"
            value={newWidget.name}
            onChange={e => setNewWidget(prev => ({ ...prev, name: e.target.value }))}
            className="h-8"
          />
          
          <div className="space-y-1">
            <div className="flex gap-1">
              <Input
                placeholder="Add trigger word"
                value={newTriggerWord}
                onChange={e => setNewTriggerWord(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTriggerWord();
                  }
                }}
                className="h-8"
              />
              <Button onClick={addTriggerWord} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {newWidget.triggerWords?.map(word => (
                <span key={word} className="px-1.5 py-0.5 bg-primary/10 rounded-full text-xs flex items-center gap-1">
                  {word}
                  <button onClick={() => removeTriggerWord(word)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label>Model</Label>
            <Select
              value={newWidget.model}
              onValueChange={(value) => setNewWidget(prev => ({ ...prev, model: value }))}
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

          <Textarea
            placeholder="Enter prompt"
            value={newWidget.prompt}
            onChange={e => setNewWidget(prev => ({ ...prev, prompt: e.target.value }))}
            className="min-h-[60px] text-sm"
          />

          <Button onClick={addWidget} className="w-full h-8 text-sm">
            Add Widget
          </Button>
        </div>
      </Card>

      {/* Model Change Dialog */}
      <Dialog open={showModelChangeDialog} onOpenChange={setShowModelChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Model Updated</DialogTitle>
            <DialogDescription>
              Successfully changed the model for widget "{modelChangeInfo.widgetName}" to {modelChangeInfo.newModel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowModelChangeDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Widget Saved</DialogTitle>
            <DialogDescription>
              Successfully saved widget "{saveInfo.widgetName}" with model {saveInfo.model}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSaveDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotLinkWidgets; 