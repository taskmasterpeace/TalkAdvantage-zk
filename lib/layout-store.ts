"use client"

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define widget position and size types
export interface WidgetPosition { 
  x: number
  y: number 
}

export interface WidgetSize {
  width: number
  height: number
}

// Define the shape of a single layout
export interface Layout {
  name: string;
  widgetPositions: Record<string, WidgetPosition>;
  widgetSizes: Record<string, WidgetSize>;
  visibleWidgets: string[];
  createdAt: string;
  updatedAt: string;
}

// Define the shape of the layout store
interface LayoutState {
  // The active layout name (key in layouts object)
  activeLayoutName: string;
  
  // Map of layout names to layouts
  layouts: Record<string, Layout>;
  
  // Actions
  setActiveLayout: (name: string) => void;
  createLayout: (name: string, visibleWidgets: string[]) => void;
  updateLayout: (name: string, layout: Partial<Layout>) => void;
  deleteLayout: (name: string) => void;
  
  // Widget position/size management
  updateWidgetPosition: (widgetId: string, position: WidgetPosition) => void;
  updateWidgetSize: (widgetId: string, size: WidgetSize) => void;
  addWidgetToLayout: (widgetId: string) => void;
  removeWidgetFromLayout: (widgetId: string) => void;
  
  // Helper methods
  updateCurrentLayout: () => void;
  resetToDefaultLayouts: () => void;
}

// Default layouts
const DEFAULT_LAYOUTS: Record<string, Layout> = {
  "Standard Layout": {
    name: "Standard Layout",
    widgetPositions: {
      "live-text": { x: 20, y: 20 },
      "ai-insights": { x: 380, y: 20 },
      "bookmarks": { x: 380, y: 400 },
      "audio-controls": { x: 740, y: 400 },
      "analysis-settings": { x: 20, y: 400 },
      "tags": { x: 20, y: 740 },
      "conversation-compass-widget": { x: 740, y: 20 },
      "curiosity-engine-widget": { x: 1100, y: 20 }
    },
    widgetSizes: {
      "live-text": { width: 340, height: 360 },
      "ai-insights": { width: 340, height: 360 },
      "bookmarks": { width: 340, height: 320 },
      "audio-controls": { width: 340, height: 320 },
      "analysis-settings": { width: 340, height: 320 },
      "tags": { width: 340, height: 200 },
      "conversation-compass-widget": { width: 340, height: 360 },
      "curiosity-engine-widget": { width: 340, height: 360 }
    },
    visibleWidgets: [
      "live-text",
      "ai-insights",
      "bookmarks",
      "audio-controls",
      "analysis-settings",
      "tags",
      "conversation-compass-widget"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  "Compact View": {
    name: "Compact View",
    widgetPositions: {
      "live-text": { x: 20, y: 20 },
      "ai-insights": { x: 380, y: 20 },
      "bookmarks": { x: 20, y: 400 }
    },
    widgetSizes: {
      "live-text": { width: 340, height: 360 },
      "ai-insights": { width: 340, height: 360 },
      "bookmarks": { width: 340, height: 320 }
    },
    visibleWidgets: [
      "live-text",
      "ai-insights",
      "bookmarks"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

// Create the store
export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeLayoutName: "Standard Layout",
      layouts: { ...DEFAULT_LAYOUTS },
      
      // Set the active layout
      setActiveLayout: (name) => {
        if (get().layouts[name]) {
          set({ activeLayoutName: name });
          
          // Log debug message
          console.log(`Switched to layout: ${name}`);
        }
      },
      
      // Create a new layout
      createLayout: (name, visibleWidgets) => {
        // Don't allow duplicate names
        if (get().layouts[name]) {
          console.error(`Layout "${name}" already exists`);
          return;
        }
        
        const newLayout: Layout = {
          name,
          widgetPositions: {},
          widgetSizes: {},
          visibleWidgets,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // For each visible widget, copy position and size from current layout or use defaults
        const currentLayout = get().layouts[get().activeLayoutName];
        visibleWidgets.forEach(widgetId => {
          newLayout.widgetPositions[widgetId] = 
            currentLayout?.widgetPositions[widgetId] || { x: 20, y: 20 };
            
          newLayout.widgetSizes[widgetId] = 
            currentLayout?.widgetSizes[widgetId] || { width: 340, height: 360 };
        });
        
        set(state => ({
          layouts: {
            ...state.layouts,
            [name]: newLayout
          },
          activeLayoutName: name // Activate the new layout
        }));
        
        console.log(`Created new layout: ${name} with ${visibleWidgets.length} widgets`);
      },
      
      // Update an existing layout
      updateLayout: (name, layoutUpdates) => {
        if (!get().layouts[name]) {
          console.error(`Layout "${name}" doesn't exist`);
          return;
        }
        
        set(state => ({
          layouts: {
            ...state.layouts,
            [name]: {
              ...state.layouts[name],
              ...layoutUpdates,
              updatedAt: new Date().toISOString()
            }
          }
        }));
        
        console.log(`Updated layout: ${name}`);
      },
      
      // Delete a layout
      deleteLayout: (name) => {
        // Can't delete the default layouts
        if (name === "Standard Layout" || name === "Compact View") {
          console.error(`Cannot delete built-in layout "${name}"`);
          return;
        }
        
        // If deleting the active layout, switch to Standard Layout
        if (get().activeLayoutName === name) {
          set({ activeLayoutName: "Standard Layout" });
        }
        
        set(state => {
          const newLayouts = { ...state.layouts };
          delete newLayouts[name];
          return { layouts: newLayouts };
        });
        
        console.log(`Deleted layout: ${name}`);
      },
      
      // Update a widget's position in the current layout
      updateWidgetPosition: (widgetId, position) => {
        const { activeLayoutName, layouts } = get();
        const currentLayout = layouts[activeLayoutName];
        
        if (!currentLayout) return;
        
        // Update the position
        set(state => ({
          layouts: {
            ...state.layouts,
            [activeLayoutName]: {
              ...currentLayout,
              widgetPositions: {
                ...currentLayout.widgetPositions,
                [widgetId]: position
              },
              updatedAt: new Date().toISOString()
            }
          }
        }));
      },
      
      // Update a widget's size in the current layout
      updateWidgetSize: (widgetId, size) => {
        const { activeLayoutName, layouts } = get();
        const currentLayout = layouts[activeLayoutName];
        
        if (!currentLayout) return;
        
        // Update the size
        set(state => ({
          layouts: {
            ...state.layouts,
            [activeLayoutName]: {
              ...currentLayout,
              widgetSizes: {
                ...currentLayout.widgetSizes,
                [widgetId]: size
              },
              updatedAt: new Date().toISOString()
            }
          }
        }));
      },
      
      // Add a widget to the current layout
      addWidgetToLayout: (widgetId) => {
        const { activeLayoutName, layouts } = get();
        const currentLayout = layouts[activeLayoutName];
        
        if (!currentLayout) return;
        
        // Only add if not already visible
        if (currentLayout.visibleWidgets.includes(widgetId)) return;
        
        // Add the widget
        set(state => ({
          layouts: {
            ...state.layouts,
            [activeLayoutName]: {
              ...currentLayout,
              visibleWidgets: [...currentLayout.visibleWidgets, widgetId],
              // Set default position and size if not already set
              widgetPositions: {
                ...currentLayout.widgetPositions,
                [widgetId]: currentLayout.widgetPositions[widgetId] || { x: 100, y: 100 }
              },
              widgetSizes: {
                ...currentLayout.widgetSizes,
                [widgetId]: currentLayout.widgetSizes[widgetId] || { width: 340, height: 360 }
              },
              updatedAt: new Date().toISOString()
            }
          }
        }));
        
        console.log(`Added widget ${widgetId} to layout ${activeLayoutName}`);
      },
      
      // Remove a widget from the current layout
      removeWidgetFromLayout: (widgetId) => {
        const { activeLayoutName, layouts } = get();
        const currentLayout = layouts[activeLayoutName];
        
        if (!currentLayout) return;
        
        // Don't remove if it's not in the layout
        if (!currentLayout.visibleWidgets.includes(widgetId)) return;
        
        // Remove the widget
        set(state => ({
          layouts: {
            ...state.layouts,
            [activeLayoutName]: {
              ...currentLayout,
              visibleWidgets: currentLayout.visibleWidgets.filter(id => id !== widgetId),
              updatedAt: new Date().toISOString()
            }
          }
        }));
        
        console.log(`Removed widget ${widgetId} from layout ${activeLayoutName}`);
      },
      
      // Helper to update the current layout with latest changes
      updateCurrentLayout: () => {
        const { activeLayoutName } = get();
        
        set(state => ({
          layouts: {
            ...state.layouts,
            [activeLayoutName]: {
              ...state.layouts[activeLayoutName],
              updatedAt: new Date().toISOString()
            }
          }
        }));
        
        console.log(`Saved current layout: ${activeLayoutName}`);
      },
      
      // Reset to default layouts
      resetToDefaultLayouts: () => {
        set({ 
          layouts: { ...DEFAULT_LAYOUTS },
          activeLayoutName: "Standard Layout"
        });
        
        console.log("Reset to default layouts");
      }
    }),
    {
      name: "layout-storage",
      
      // Only persist some parts of the state
      partialize: (state) => ({
        activeLayoutName: state.activeLayoutName,
        layouts: state.layouts
      })
    }
  )
); 