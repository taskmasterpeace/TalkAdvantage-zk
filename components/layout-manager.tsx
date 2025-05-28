"use client"

import React, { useState } from "react"
import { useLayoutStore } from "@/lib/layout-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  LayoutGrid,
  Settings,
  Save,
  Edit,
  Trash2,
  PlusCircle,
  RefreshCw,
  Layers,
  Plus,
  Check,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export function LayoutManager() {
  const { 
    layouts, 
    activeLayoutName, 
    setActiveLayout,
    createLayout,
    updateLayout,
    deleteLayout,
    updateCurrentLayout
  } = useLayoutStore()
  
  const { toast } = useToast()
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newLayoutName, setNewLayoutName] = useState("")
  
  const sortedLayoutNames = Object.keys(layouts).sort((a, b) => {
    // Put default layouts first
    if (a === "Standard Layout" || a === "Compact View") return -1;
    if (b === "Standard Layout" || b === "Compact View") return 1;
    // Otherwise sort alphabetically
    return a.localeCompare(b);
  });
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch (e) {
      return 'Unknown date'
    }
  }
  
  // Save current layout with updated positions
  const handleUpdateCurrentLayout = () => {
    updateCurrentLayout();
    
    toast({
      title: "Layout Updated",
      description: `Updated "${activeLayoutName}" with current positions and sizes`
    });
  };
  
  const handleCreateLayout = () => {
    // Validate name
    if (!newLayoutName.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Name",
        description: "Please enter a name for your layout"
      });
      return;
    }
    
    // Check for duplicates
    if (layouts[newLayoutName]) {
      toast({
        variant: "destructive",
        title: "Duplicate Name",
        description: "A layout with this name already exists"
      });
      return;
    }
    
    // Create the layout by copying the current layout's visible widgets
    const currentLayout = layouts[activeLayoutName];
    if (currentLayout) {
      createLayout(newLayoutName, [...currentLayout.visibleWidgets]);
      
      toast({
        title: "Layout Created",
        description: `Created new layout "${newLayoutName}"`
      });
      
      // Close dialog and reset state
      setIsSaveDialogOpen(false);
      setNewLayoutName("");
    }
  };
  
  const handleDeleteLayout = (name: string) => {
    if (name === "Standard Layout" || name === "Compact View") {
      toast({
        variant: "destructive",
        title: "Cannot Delete",
        description: "The default layouts cannot be deleted"
      });
      return;
    }
    
    deleteLayout(name);
    
    toast({
      title: "Layout Deleted",
      description: `Deleted layout "${name}"`
    });
  };
  
  return (
    <div>
      {/* Main dropdown menu for quick layout selection */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 flex items-center gap-1 h-8 min-w-[150px] justify-between"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              <span className="text-sm truncate">{activeLayoutName}</span>
            </div>
            {layouts[activeLayoutName]?.visibleWidgets.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {layouts[activeLayoutName].visibleWidgets.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Layouts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-[230px]">
            {sortedLayoutNames.map(name => (
              <DropdownMenuItem 
                key={name}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setActiveLayout(name)}
              >
                <div className="flex items-center gap-2 truncate">
                  {name === "Standard Layout" || name === "Compact View" ? (
                    <Badge variant="outline" className="h-5 mr-1">Default</Badge>
                  ) : null}
                  <span className="truncate">{name}</span>
                </div>
                {activeLayoutName === name && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsSaveDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New Layout</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleUpdateCurrentLayout}
          >
            <Save className="h-4 w-4" />
            <span>Save Current Layout</span>
          </DropdownMenuItem>
          
          {activeLayoutName !== "Standard Layout" && activeLayoutName !== "Compact View" && (
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer text-red-500 dark:text-red-400"
              onClick={() => handleDeleteLayout(activeLayoutName)}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Current Layout</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Dialog for saving a new layout */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Layout
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Layout Name</Label>
              <Input
                id="layout-name"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="Enter layout name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateLayout();
                  }
                }}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              This will create a new layout based on your current widget configuration.
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateLayout}>Create Layout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 