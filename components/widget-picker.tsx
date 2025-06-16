"use client"

import React from "react"
import { useLayoutStore } from "@/lib/layout-store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AppWindow, PlusSquare, Layers } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define all available widgets with metadata
const AVAILABLE_WIDGETS = [
  {
    id: "live-text",
    name: "Live Text",
    description: "Real-time transcription of your speech",
    icon: "message-square",
    essential: true
  },
  {
    id: "ai-insights",
    name: "AI Insights",
    description: "AI-powered analysis and suggestions",
    icon: "brain",
    essential: false
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Save and manage important moments",
    icon: "bookmark",
    essential: false
  },
  {
    id: "audio-controls",
    name: "Audio Controls",
    description: "Control recording and playback",
    icon: "mic",
    essential: false
  },
  {
    id: "analysis-settings",
    name: "Analysis Settings",
    description: "Configure analysis parameters",
    icon: "settings",
    essential: false
  },
  {
    id: "tags",
    name: "Tags",
    description: "Manage conversation tags",
    icon: "tag",
    essential: false
  },
  {
    id: "conversation-compass-widget",
    name: "Conversation Compass",
    description: "Track conversation flow and direction",
    icon: "compass",
    essential: false
  },
  {
    id: "curiosity-engine-widget",
    name: "Curiosity Engine",
    description: "Generate questions and insights",
    icon: "lightbulb",
    essential: false
  },
  {
    id: "hotlink-settings-button",
    name: "HotLink Settings",
    description: "Configure HotLink widgets and triggers",
    icon: "zap",
    essential: false
  },
  {
    id: "hotlink-analysis",
    name: "HotLink Analysis",
    description: "View real-time analysis of detected hot words",
    icon: "search",
    essential: false
  }
] as const;

export function WidgetPicker() {
  const { layouts, activeLayoutName, addWidgetToLayout, removeWidgetFromLayout } = useLayoutStore()
  const { toast } = useToast()
  
  // Get the current layout's visible widgets
  const currentLayout = layouts[activeLayoutName]
  const visibleWidgets = currentLayout?.visibleWidgets || []
  
  // Handle toggling a widget's visibility
  const handleToggleWidget = (widgetId: string, isVisible: boolean) => {
    if (isVisible) {
      removeWidgetFromLayout(widgetId)
      toast({
        title: "Widget removed",
        description: `Removed ${getWidgetName(widgetId)} from the layout`,
      })
    } else {
      addWidgetToLayout(widgetId)
      toast({
        title: "Widget added",
        description: `Added ${getWidgetName(widgetId)} to the layout`,
      })
    }
  }
  
  // Helper to get widget name from id
  const getWidgetName = (widgetId: string) => {
    const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId)
    return widget?.name || widgetId
  }
  
  // Helper to get widget metadata
  const getWidgetMetadata = (widgetId: string) => {
    return AVAILABLE_WIDGETS.find(w => w.id === widgetId) || {
      id: widgetId,
      name: widgetId,
      description: "Custom widget",
      icon: "square",
    }
  }
  
  // Get appropriate icon element based on icon type
  const getIconElement = (iconType: string) => {
    switch (iconType) {
      case "brain":
        return <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">🧠</div>
      case "compass":
        return <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">🧭</div>
      case "bulb":
        return <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">💡</div>
      case "text":
        return <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">📝</div>
      case "settings":
        return <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center text-gray-600 dark:text-gray-400">⚙️</div>
      case "bookmark":
        return <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">🔖</div>
      case "audio":
        return <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">🎙️</div>
      case "tag":
        return <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">🏷️</div>
      default:
        return <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center text-gray-600 dark:text-gray-400">📦</div>
    }
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <AppWindow className="h-4 w-4" />
          <span>Widgets</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Manage Widgets
          </DialogTitle>
          <DialogDescription>
            Toggle which widgets are visible in your current layout.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[400px] overflow-y-auto py-4">
          {AVAILABLE_WIDGETS.map((widget) => {
            const isVisible = visibleWidgets.includes(widget.id)
            return (
              <div 
                key={widget.id} 
                className="flex items-start py-3 border-b last:border-b-0"
              >
                <div className="mr-3 mt-0.5">
                  {getIconElement(widget.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {widget.name}
                    {widget.essential && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {widget.description}
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`widget-${widget.id}`}
                      checked={isVisible}
                      onCheckedChange={(checked) => {
                        if (widget.essential && isVisible) {
                          toast({
                            title: "Cannot remove essential widget",
                            description: "This widget is required and cannot be removed.",
                            variant: "destructive",
                          })
                          return
                        }
                        handleToggleWidget(widget.id, isVisible)
                      }}
                      disabled={widget.essential && isVisible}
                    />
                    <Label 
                      htmlFor={`widget-${widget.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {isVisible ? "Visible" : "Hidden"}
                    </Label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <DialogFooter>
          <Button onClick={() => {
            // Find any widgets not in the current layout and add them
            const hiddenWidgets = AVAILABLE_WIDGETS
              .filter(widget => !visibleWidgets.includes(widget.id) && !widget.essential)
              .map(widget => widget.id)
            
            if (hiddenWidgets.length > 0) {
              hiddenWidgets.forEach(widgetId => {
                addWidgetToLayout(widgetId)
              })
              
              toast({
                title: "All widgets added",
                description: `Added ${hiddenWidgets.length} widgets to the layout`,
              })
            } else {
              toast({
                title: "No widgets to add",
                description: "All available widgets are already in your layout",
              })
            }
          }}>
            <PlusSquare className="h-4 w-4 mr-2" />
            Add All Widgets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 