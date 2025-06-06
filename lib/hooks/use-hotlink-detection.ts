import { useState, useEffect } from 'react';

export interface HotLinkWidget {
  id: string;
  triggerWords: string[];
  name: string;
  prompt: string;
  model: string; // Changed from 'perplexity' | 'requestify' to string to support all models
}

const STORAGE_KEY = 'hotlink-widgets';
const TRIGGER_COOLDOWN = 10000; // 5 seconds cooldown between triggers

export function useHotLinkDetection(widgets: HotLinkWidget[], transcript: string) {
  const [activeWidget, setActiveWidget] = useState<HotLinkWidget | null>(null);
  const [lastTriggerTime, setLastTriggerTime] = useState<number>(0);
  const [currentWidgets, setCurrentWidgets] = useState<HotLinkWidget[]>(() => {
    // Initialize from localStorage if available, otherwise use props
    if (typeof window !== 'undefined') {
      const savedWidgets = localStorage.getItem(STORAGE_KEY);
      return savedWidgets ? JSON.parse(savedWidgets) : widgets;
    }
    return widgets;
  });

  // Update currentWidgets when widgets prop changes
  useEffect(() => {
    setCurrentWidgets(widgets);
  }, [widgets]);

  // Listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedWidgets = localStorage.getItem(STORAGE_KEY);
      if (savedWidgets) {
        try {
          const parsedWidgets = JSON.parse(savedWidgets);
          setCurrentWidgets(parsedWidgets);
        } catch (error) {
          console.error('Error parsing widgets from localStorage:', error);
        }
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage on mount
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Load latest widgets when transcript starts (recording begins)
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      const savedWidgets = localStorage.getItem(STORAGE_KEY);
      if (savedWidgets) {
        try {
          const parsedWidgets = JSON.parse(savedWidgets);
          setCurrentWidgets(parsedWidgets);
          console.log('Loaded latest widgets at recording start:', parsedWidgets);
        } catch (error) {
          console.error('Error parsing widgets from localStorage:', error);
        }
      }
    }
  }, [transcript]);

  useEffect(() => {
    if (!transcript || !currentWidgets?.length) return;

    // Check if we're within the cooldown period
    const currentTime = Date.now();
    if (currentTime - lastTriggerTime < TRIGGER_COOLDOWN) {
      console.log('Skipping trigger check - within cooldown period');
      return;
    }

    // Check the last few words of the transcript for trigger words
    const words = transcript.split(/\s+/).filter(Boolean);
    const lastFiveWords = words.slice(-5);
    
    // Debug log the words being checked
    console.log('Checking words:', lastFiveWords);
    console.log('Current widgets:', currentWidgets);
    
    // Check each widget's trigger words
    for (const widget of currentWidgets) {
      // Check each trigger word
      for (const triggerWord of widget.triggerWords) {
        // Check if any of the last five words match the trigger word (case-insensitive)
        // Remove punctuation from the word before comparison
        const hasMatch = lastFiveWords.some(word => {
          const cleanWord = word.replace(/[.,?!]/g, '').toLowerCase();
          return cleanWord === triggerWord.toLowerCase();
        });
        
        if (hasMatch) {
          console.log('Widget triggered:', widget.name, 'by word:', triggerWord);
          setActiveWidget(widget);
          setLastTriggerTime(currentTime); // Update the last trigger time
          return;
        }
      }
    }
  }, [transcript, currentWidgets, lastTriggerTime]);

  const clearActiveWidget = () => {
    setActiveWidget(null);
  };

  return { activeWidget, clearActiveWidget };
} 