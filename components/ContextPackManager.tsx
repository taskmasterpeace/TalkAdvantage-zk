import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { User, Users, FileText, Save, X, Plus, CheckCircle, UserCircle2, Tag, FileCheck2, FileUp } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { documentsService } from '@/lib/supabase/documents-service';
import { documentProcessorService } from '../lib/services/document-processor-service';
import { knowledgeGraphService } from '../lib/services/knowledge-graph-service';

// Types
interface Participant {
  name: string;
  role: string;
  relationship_to_user: string;
  apex_profile?: {
    risk_tolerance?: string;
    decision_speed?: string;
    key_motivators?: string[];
    recent_behavior?: string;
  };
}

interface Document {
  name: string;
  file: string;
  tags?: string[];
}

interface ContextPack {
  user_name: string;
  user_role: string;
  goal: string;
  sub_goals: string[];
  person: string;
  person_relationship: string;
  participants: Participant[];
  documents: Document[];
  context_description: string;
  key_topics: string[];
  notes: string;
  timeline?: string[];
  conflict_map?: string;
  environmental_factors?: string;
}

const defaultPack: ContextPack = {
  user_name: '',
  user_role: '',
  goal: '',
  sub_goals: [],
  person: '',
  person_relationship: '',
  participants: [],
  documents: [],
  context_description: '',
  key_topics: [],
  notes: '',
  timeline: [],
  conflict_map: '',
  environmental_factors: '',
};

export default function ContextPackManager({ onSave, onClose }: { onSave?: (pack: ContextPack) => void, onClose?: () => void }) {
  const { user } = useAuth();
  const [pack, setPack] = useState<ContextPack>(defaultPack);
  const [participant, setParticipant] = useState<Participant>({ name: '', role: '', relationship_to_user: '' });
  const [document, setDocument] = useState<Document>({ name: '', file: '', tags: [] });
  const [subGoal, setSubGoal] = useState('');
  const [keyTopic, setKeyTopic] = useState('');
  const [timelineItem, setTimelineItem] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Handlers for adding/removing participants, documents, sub-goals, key topics, timeline
  const addParticipant = () => {
    if (participant.name && participant.role) {
      setPack({ ...pack, participants: [...pack.participants, participant] });
      setParticipant({ name: '', role: '', relationship_to_user: '' });
    }
  };
  const removeParticipant = (idx: number) => {
    setPack({ ...pack, participants: pack.participants.filter((_, i) => i !== idx) });
  };
  const addDocument = () => {
    if (document.name && document.file) {
      setPack({ ...pack, documents: [...pack.documents, document] });
      setDocument({ name: '', file: '', tags: [] });
    }
  };
  const removeDocument = (idx: number) => {
    setPack({ ...pack, documents: pack.documents.filter((_, i) => i !== idx) });
  };
  const addSubGoal = () => {
    if (subGoal) {
      setPack({ ...pack, sub_goals: [...pack.sub_goals, subGoal] });
      setSubGoal('');
    }
  };
  const removeSubGoal = (idx: number) => {
    setPack({ ...pack, sub_goals: pack.sub_goals.filter((_, i) => i !== idx) });
  };
  const addKeyTopic = () => {
    if (keyTopic) {
      setPack({ ...pack, key_topics: [...pack.key_topics, keyTopic] });
      setKeyTopic('');
    }
  };
  const removeKeyTopic = (idx: number) => {
    setPack({ ...pack, key_topics: pack.key_topics.filter((_, i) => i !== idx) });
  };
  const addTimelineItem = () => {
    if (timelineItem) {
      setPack({ ...pack, timeline: [...(pack.timeline || []), timelineItem] });
      setTimelineItem('');
    }
  };
  const removeTimelineItem = (idx: number) => {
    setPack({ ...pack, timeline: (pack.timeline || []).filter((_, i) => i !== idx) });
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!user) {
      alert('You must be logged in to upload files.');
      return;
    }
    if (!document.name) {
      alert('Please enter a document name before uploading.');
      return;
    }
    setUploading(true);
    setUploadSuccess(false);
    try {
      // Process and store document chunks
      const chunks = await documentProcessorService.processDocument(file, {
        name: document.name,
        tags: document.tags
      });
      
      // Store chunks in Weaviate
      await documentProcessorService.storeDocumentChunks(user.id, chunks);

      // Store document reference in context pack
      setDocument({ ...document, file: file.name });
      setUploadSuccess(true);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    }
    setUploading(false);
  };

  // Save handler
  const handleSave = () => {
    // Validate required fields
    if (!pack.user_name) {
      alert('Please enter your name');
      return;
    }
    if (!pack.user_role) {
      alert('Please enter your role');
      return;
    }
    if (!pack.goal) {
      alert('Please enter the main goal');
      return;
    }
    if (!pack.person) {
      alert('Please enter the person\'s name');
      return;
    }
    if (!pack.person_relationship) {
      alert('Please enter the relationship');
      return;
    }
    if (!pack.context_description) {
      alert('Please enter the context description');
      return;
    }
    if (!pack.notes) {
      alert('Please enter notes');
      return;
    }

    // Validate arrays
    if (pack.sub_goals.length === 0) {
      alert('Please add at least one sub-goal');
      return;
    }
    if (pack.key_topics.length === 0) {
      alert('Please add at least one key topic');
      return;
    }
    if (pack.participants.length === 0) {
      alert('Please add at least one participant');
      return;
    }

    // If all validations pass, save the pack
    if (onSave) onSave(pack);
  };

  return (
    <Card className="p-0 max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
      {/* Title Bar */}
      <div className="flex justify-between items-center px-8 py-6 bg-slate-950/80 border-b border-slate-800">
        <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white">
          <User className="h-8 w-8 text-primary" />
          Context Pack Manager
        </h2>
        {onClose && <Button variant="ghost" onClick={onClose} className="text-white hover:bg-slate-800"><X className="h-6 w-6" /></Button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-8 py-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* User Info Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><UserCircle2 className="h-5 w-5" /> User Information</h3>
            <div className="space-y-3">
              <Input className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.user_name} onChange={e => setPack({ ...pack, user_name: e.target.value })} placeholder="e.g. Robert Smith" />
              <Input className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.user_role} onChange={e => setPack({ ...pack, user_role: e.target.value })} placeholder="e.g. Negotiator" />
              <Input className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.person} onChange={e => setPack({ ...pack, person: e.target.value })} placeholder="e.g. Jane Doe (Non-user)" />
              <Input className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.person_relationship} onChange={e => setPack({ ...pack, person_relationship: e.target.value })} placeholder="e.g. Prospect" />
            </div>
          </div>
          {/* Strategic Objectives Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><Tag className="h-5 w-5" /> Strategic Objectives</h3>
            <Input className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.goal} onChange={e => setPack({ ...pack, goal: e.target.value })} placeholder="Main Goal (e.g. Secure a partnership agreement)" />
            <div>
              <div className="flex gap-2 mb-2">
                <Input className="rounded-lg" value={subGoal} onChange={e => setSubGoal(e.target.value)} placeholder="Add sub-goal" />
                <Button onClick={addSubGoal} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pack.sub_goals.map((g, i) => (
                  <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                    {g}
                    <button onClick={() => removeSubGoal(i)} className="ml-1 text-primary hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* Participants Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><Users className="h-5 w-5" /> Participants</h3>
            <div className="flex gap-2 mb-2">
              <Input className="rounded-lg" value={participant.name} onChange={e => setParticipant({ ...participant, name: e.target.value })} placeholder="Name" />
              <Input className="rounded-lg" value={participant.role} onChange={e => setParticipant({ ...participant, role: e.target.value })} placeholder="Role" />
              <Input className="rounded-lg" value={participant.relationship_to_user} onChange={e => setParticipant({ ...participant, relationship_to_user: e.target.value })} placeholder="Relationship" />
              <Button onClick={addParticipant} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pack.participants.map((p, i) => (
                <span key={i} className="bg-slate-700 text-white px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium shadow">
                  <UserCircle2 className="h-4 w-4 text-primary" />
                  {p.name} <span className="text-muted-foreground">({p.role}, {p.relationship_to_user})</span>
                  <button onClick={() => removeParticipant(i)} className="ml-1 text-primary hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Right Column */}
        <div className="space-y-8">
          {/* Documents Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><FileText className="h-5 w-5" /> Documents</h3>
            <div className="flex gap-2 mb-2 items-center">
              <Input className="rounded-lg" value={document.name} onChange={e => setDocument({ ...document, name: e.target.value })} placeholder="Document Name" />
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  disabled={uploading} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt"
                />
                <span className={`px-3 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1 hover:bg-primary/20 transition ${uploading ? 'opacity-50' : ''}`}> 
                  <FileUp className="h-4 w-4" /> 
                  {uploading ? 'Uploading...' : 'Upload'} 
                </span>
              </label>
              {document.file && uploadSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
              <Input className="rounded-lg" value={document.tags?.join(',') || ''} onChange={e => setDocument({ ...document, tags: e.target.value.split(',').map(t => t.trim()) })} placeholder="Tags (comma separated)" />
              <Button onClick={addDocument} disabled={uploading || !document.file} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pack.documents.map((d, i) => (
                <span key={i} className="bg-slate-700 text-white px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium shadow">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  {d.name} <a href={d.file} target="_blank" rel="noopener noreferrer" className="underline text-primary">file</a> {d.tags && d.tags.length > 0 && d.tags.map((tag, j) => <span key={j} className="bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-1">{tag}</span>)}
                  <button onClick={() => removeDocument(i)} className="ml-1 text-primary hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          {/* Pre-Interaction Notes Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><FileText className="h-5 w-5" /> Pre-Interaction Notes</h3>
            <Textarea className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.context_description} onChange={e => setPack({ ...pack, context_description: e.target.value })} placeholder="Description of the context" />
            <div>
              <div className="flex gap-2 mb-2">
                <Input className="rounded-lg" value={keyTopic} onChange={e => setKeyTopic(e.target.value)} placeholder="Add key topic" />
                <Button onClick={addKeyTopic} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pack.key_topics.map((k, i) => (
                  <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                    {k}
                    <button onClick={() => removeKeyTopic(i)} className="ml-1 text-primary hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <Textarea className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.notes} onChange={e => setPack({ ...pack, notes: e.target.value })} placeholder="Additional notes" />
          </div>
          {/* Timeline/Conflict/Env Factors Card */}
          <div className="bg-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary"><Tag className="h-5 w-5" /> Timeline & Context</h3>
            <div>
              <div className="flex gap-2 mb-2">
                <Input className="rounded-lg" value={timelineItem} onChange={e => setTimelineItem(e.target.value)} placeholder="Add timeline item" />
                <Button onClick={addTimelineItem} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(pack.timeline || []).map((t, i) => (
                  <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                    {t}
                    <button onClick={() => removeTimelineItem(i)} className="ml-1 text-primary hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <Textarea className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.conflict_map} onChange={e => setPack({ ...pack, conflict_map: e.target.value })} placeholder="Describe alliances/rivalries" />
            <Textarea className="rounded-lg shadow focus:ring-2 focus:ring-primary" value={pack.environmental_factors} onChange={e => setPack({ ...pack, environmental_factors: e.target.value })} placeholder="e.g. Market shifts, internal politics" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-4 px-8 py-6 bg-slate-950/80 border-t border-slate-800 mt-8">
        <Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg rounded-lg flex items-center gap-2 px-6 py-2 text-lg font-semibold" onClick={handleSave}>
          <Save className="h-5 w-5 mr-2" /> Save Pack
        </Button>
      </div>
    </Card>
  );
} 