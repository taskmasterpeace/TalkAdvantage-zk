import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CSSProperties } from 'react';
import { useSettingsStore } from '@/lib/settings-store';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TalkingPointCard {
  topic: string;
  hotlinks: string[];
  content: {
    paragraph: string;
    bullets: string[];
    expansion?: string;
  };
  state: 'base' | 'growing' | 'elongated' | 'split';
  position: 'start' | 'end';
  triggerCount: number;
  lastTriggerTime: number;
  priority: number;
  growthFactor: number;
  locked: boolean;
}

interface TalkingPointsProps {
  contextPack: {
    user_name: string;
    user_role: string;
    person: string;
    person_relationship: string;
    goal: string;
    goal_secondary: string;
    document: string;
    interaction_notes: string;
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
  };
  transcript: string;
  isRecording: boolean;
}

const CARD_COLORS = [
  'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
  'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
  'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
  'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
];

const TRIGGER_TIMEOUT = 30000; // 30 seconds timeout for card regeneration
const ANIMATION_DURATIONS = {
  growth: 0.3,
  elongation: 0.5,
  split: 0.5
};

// --- Card State Machine ---
const getCardState = (triggerCount: number) => {
  if (triggerCount >= 3) return 'split';
  if (triggerCount === 2) return 'elongated';
  if (triggerCount === 1) return 'growing';
  return 'base';
};

// Add normalizeCard helper after the getCardState function
const normalizeCard = (card: any): TalkingPointCard => {
  return {
    topic: card.topic || '',
    hotlinks: Array.isArray(card.hotlinks) ? card.hotlinks : [],
    content: {
      paragraph: card.content?.paragraph || '',
      bullets: Array.isArray(card.content?.bullets) ? card.content.bullets : [],
      expansion: card.content?.expansion || ''
    },
    state: card.state || 'base',
    position: card.position || 'start',
    triggerCount: card.triggerCount || 0,
    lastTriggerTime: card.lastTriggerTime || Date.now(),
    priority: card.priority || 0,
    growthFactor: card.growthFactor || 1.0,
    locked: card.locked || false
  };
};

export default function TalkingPoints({ contextPack, transcript, isRecording }: TalkingPointsProps) {
  const settings = useSettingsStore();
  const [cards, setCards] = useState<TalkingPointCard[]>([]);
  const [opening, setOpening] = useState<string>('');
  const [locked, setLocked] = useState<{ [idx: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [triggerHistory, setTriggerHistory] = useState<{ [key: string]: number }>({});
  const [cardHistory, setCardHistory] = useState<TalkingPointCard[][]>([]);
  const lastUpdateRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noTriggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardsRef = useRef<TalkingPointCard[]>([]);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiCallRef = useRef<number>(0);

  // Keep cardsRef in sync with cards state
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Get trigger count with cooldown
  const getTriggerCount = (transcript: string, hotlinks: string[]) => {
    let count = 0;
    const now = Date.now();
    
    // Clean transcript: remove special characters and split into words
    const cleanTranscript = transcript.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@?]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    const words = cleanTranscript.split(' ');
    
    for (const word of hotlinks) {
      // Clean trigger word: remove special characters
      const triggerWord = word.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@?]/g, '') // Remove special characters
        .trim();
      
      // Check if word exists in transcript (case insensitive)
      if (words.includes(triggerWord)) {
        // Check if this word was triggered in the last 4 seconds
        const lastTrigger = triggerHistory[triggerWord] || 0;
        if (now - lastTrigger >= 1000) { // 1 second cooldown
          count++;
          setTriggerHistory((prev: { [key: string]: number }) => ({ ...prev, [triggerWord]: now }));
        }
      }
    }
    return count;
  };

  // Add cleanup for trigger history
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setTriggerHistory(prev => {
        const newHistory = { ...prev };
        Object.keys(newHistory).forEach(word => {
          if (now - newHistory[word] > 30000) {
            delete newHistory[word];
          }
        });
        return newHistory;
      });
    }, 5000); // Clean up every 5 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Real-time trigger detection and state machine
  useEffect(() => {
    if (!cards.length || !transcript || isUpdating) return;

    setCards(cards => cards.map((card, idx) => {
      if (locked[idx]) return card;
      const triggerCount = getTriggerCount(transcript, card.hotlinks);
      if (triggerCount !== card.triggerCount) {
        const state = getCardState(triggerCount);
        return { ...card, triggerCount, state };
      }
      return card;
    }));

    // Debounce API updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 15000) { // 15 second debounce for API calls
        return;
      }
      lastUpdateRef.current = now;
      
      // Only update if we have new triggers and no update is in progress
      const hasNewTriggers = cards.some(card => {
        const newTriggerCount = getTriggerCount(transcript, card.hotlinks);
        return newTriggerCount > card.triggerCount;
      });

      if (hasNewTriggers && !isUpdating) {
        updateCards();
      }
    }, 1000);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [transcript, locked, isUpdating]);

  // Manual override: lock/unlock/reset
  const handleLock = (idx: number) => setLocked(l => ({ ...l, [idx]: !l[idx] }));
  const handleReset = (idx: number) => setCards(cards => cards.map((c, i) => i === idx ? { ...c, triggerCount: 0, state: 'base' } : c));

  // Update cards based on transcript with debounce
  const updateCards = useCallback(async () => {
    if (!settings.talkingPointsEnabled || !isInitialized || isUpdating) {
      console.log('Skipping update - conditions not met:', { 
        enabled: settings.talkingPointsEnabled, 
        initialized: isInitialized, 
        updating: isUpdating 
      });
      return;
    }

    // Check 45-second cooldown
    const now = Date.now();
    if (now - lastApiCallRef.current < 40000) { // 45 second cooldown
      console.log('API cooldown active, skipping update...');
      return;
    }

    if (!contextPack) {
      console.error('Missing contextPack when updating cards:', { contextPack });
      return;
    }

    // Store current cards before API call
    const currentCards = [...cardsRef.current];

    // Set updating flag before making the API call
    setIsUpdating(true);
    lastApiCallRef.current = now;
    console.log('Starting API update at:', new Date().toISOString());

    try {
      const response = await fetch('/api/talkingpoints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextPack,
          transcript: `${transcript || ''}\n\nAlso refer to the relevant document in system prompt.`,
          currentCards: currentCards,
          action: 'update',
          model: 'mistralai/mistral-7b-instruct'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update cards');
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data.updated_cards)) {
        console.error('API did not return updated_cards array:', data);
        return;
      }
      // Preserve existing card states and trigger counts
      const updatedCards = data.updated_cards.map((card: any, idx: number) => {
        const existingCard = currentCards[idx];
        return normalizeCard({
          ...card,
          // Only update content if new content is provided, otherwise keep existing
          content: card.content || existingCard?.content,
          triggerCount: existingCard?.triggerCount || 0,
          state: existingCard?.state || 'base',
          lastTriggerTime: existingCard?.lastTriggerTime || Date.now(),
          priority: data.visual_cues?.priority || existingCard?.priority || 0,
          growthFactor: data.visual_cues?.growth_factor || existingCard?.growthFactor || 1.0
        });
      });
      
      setCardHistory(prev => [...prev, currentCards]);
      setCards(updatedCards);

      
      console.log('API update completed at:', new Date().toISOString());
    } catch (error) {
      console.error('Error updating cards:', error);
      // Restore previous state on error
      setCards(currentCards);
    } finally {
      // Add a small delay before allowing next update
      setTimeout(() => {
        setIsUpdating(false);
        console.log('Update lock released at:', new Date().toISOString());
      }, 1000); // 1 second cooldown
    }
  }, [contextPack, transcript, settings.talkingPointsEnabled, isInitialized, isUpdating]);

  // Clear timeouts when disabled
  useEffect(() => {
    if (!settings.talkingPointsEnabled) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (noTriggerTimeoutRef.current) {
        clearTimeout(noTriggerTimeoutRef.current);
      }
    }
  }, [settings.talkingPointsEnabled]);

  // Initialize cards (fetch from backend)
  const initializeCards = useCallback(async () => {
    if (!settings.talkingPointsEnabled || isInitialized || !contextPack) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/talkingpoints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextPack,
          transcript: `${transcript || ''}\n\nAlso refer to the relevant document in system prompt.`,
          action: 'init',
          model: 'mistralai/mistral-7b-instruct'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize cards');
      }

      const data = await response.json();
      
      if (data.opening) {
        setOpening(data.opening);
      }
      
      if (!Array.isArray(data.cards)) {
        console.error('API did not return cards array:', data);
        return;
      }
      
      const normalizedCards = data.cards.map((card: any) => normalizeCard({
        ...card,
        triggerCount: 0,
        lastTriggerTime: Date.now(),
        priority: 0,
        growthFactor: 1.0
      }));
      
      setCards(normalizedCards);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contextPack, transcript, settings.talkingPointsEnabled, isInitialized]);

  // Initialize on mount or when context changes with 6-second delay
  useEffect(() => {
    if (isRecording && !cards.length && !isInitialized) {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      initTimeoutRef.current = setTimeout(() => {
        initializeCards();
      }, 6000); // 6 second delay
    }
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isRecording, contextPack, isInitialized]);

  // Update cards when transcript changes
  useEffect(() => {
    // Only update if transcript is at least 30 words (adjust as needed)
    if (
      isRecording &&
      transcript &&
      transcript.trim().split(/\s+/).length >= 20 &&
      isInitialized &&
      !isUpdating
    ) {
      updateCards();
    }
  }, [transcript, isRecording, updateCards, isInitialized, isUpdating]);

  const getCardStyle = (card: TalkingPointCard, idx: number) => {
    const baseStyle: CSSProperties = {
      width: '45%',
      height: '100%',
      padding: '1.5rem',
      borderRadius: '1rem',
      backgroundColor: undefined,
      boxShadow: `0 ${card.priority * 2}px ${card.priority * 4}px rgba(0,0,0,0.08)`,
      position: 'relative',
      overflow: 'auto',
      border: '1px solid',
      transition: `all ${ANIMATION_DURATIONS.growth}s cubic-bezier(0.4,0,0.2,1)`,
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      minHeight: 0
    };

    switch (card.state) {
      case 'growing':
        return { ...baseStyle, maxHeight: '150%', height: '120%', zIndex: 2 };
      case 'elongated':
        return { ...baseStyle, maxHeight: '250%', height: '200%', zIndex: 3 };
      case 'split':
        return { ...baseStyle, maxHeight: '250%', height: '200%', zIndex: 4 };
      default:
        return { ...baseStyle, maxHeight: '100%' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Talking Points</h3>
      </div>

      {!settings.talkingPointsEnabled && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-600">
          Talking points feature is disabled. Enable it in settings to use this feature.
        </div>
      )}

      {!contextPack && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-600">
          No context pack available. Please create one first if already save then please refresh before use.
        </div>
      )}

      {settings.talkingPointsEnabled && (
        <>
          {opening && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 mb-4">
              <h4 className="font-semibold mb-2">Opening Statement:</h4>
              <p>{opening}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 h-[900px]">
            <AnimatePresence>
              {cards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    height: card.state === 'base' ? '100%' :
                           card.state === 'growing' ? '120%' :
                           card.state === 'elongated' ? '200%' : '200%',
                    width: card.state === 'split' ? '90%' : '100%'
                  }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{
                    duration: card.state === 'growing' ? 0.3 :
                             card.state === 'elongated' ? 0.5 :
                             card.state === 'split' ? 0.5 : 0.3,
                    ease: 'easeInOut'
                  }}
                  className={`${CARD_COLORS[idx % CARD_COLORS.length]} p-4 rounded-lg shadow-lg relative overflow-y-auto`}
                  style={{
                    zIndex: card.state === 'base' ? 1 : card.state === 'growing' ? 2 : card.state === 'elongated' ? 3 : 4,
                    maxHeight: '100%',
                    overflow:"scroll",
                    minHeight: 0
                  }}
                >
                  <h4 className="text-2xl font-bold mb-2">{card.topic}</h4>
                  <div className="flex gap-2 mb-2">
                    {card.hotlinks.filter((word: string) => typeof word === 'string' && word.length > 0 && !word.includes('-')).map((word, i) => (
                      <span key={i} className="text-sm bg-white/50 px-2 py-1 rounded">
                        {word}
                      </span>
                    ))}
                  </div>
                  {/* Real-time visual indicator for trigger confidence */}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${card.triggerCount === 0 ? 'bg-gray-200 text-gray-600' : card.triggerCount === 1 ? 'bg-yellow-200 text-yellow-800' : card.triggerCount === 2 ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>{card.triggerCount} trigger{card.triggerCount !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Reveal paragraph in growing, elongated, and split states */}
                  {(card.state === 'growing' || card.state === 'elongated' || card.state === 'split') && card.content?.paragraph && (
                    <p className="text-lg mb-2">{card.content.paragraph}</p>
                  )}
                  {/* Reveal bullets as a bulleted list in elongated and split states */}
                  {(card.state === 'elongated' || card.state === 'split') && card.content?.bullets && card.content.bullets.length > 0 && (
                    <ul className="space-y-1 mb-2 list-disc pl-5">
                      {card.content.bullets.map((bullet, i) => (
                        <li key={i} className="text-base">{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {/* Expansion for split state */}
                  {card.state === 'split' && card.content.expansion && (
                    <div className="mt-2 p-2 border rounded bg-white/70">
                      <div className="font-semibold mb-1">Expanded Focus:</div>
                      <p className="text-sm">{card.content.expansion}</p>
                    </div>
                  )}
                  {/* Manual override controls */}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant={locked[idx] ? 'secondary' : 'outline'} onClick={() => handleLock(idx)}>{locked[idx] ? 'Unlock' : 'Lock'}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReset(idx)}>Reset</Button>
                    {cardHistory.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const previousCards = cardHistory[cardHistory.length - 1];
                          setCardHistory(prev => prev.slice(0, -1));
                          setCards(previousCards);
                        }}
                      >
                        Previous State
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
} 