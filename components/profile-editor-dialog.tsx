"\"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useTemplateStore, type AnalyticsProfile } from "@/lib/template-store"
import { Save, X, AlertTriangle, Copy } from "lucide-react"

interface ProfileEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileName?: string // If provided, we're editing an existing profile
  isCreatingNew?: boolean // If true, we're creating a new profile from scratch
}

export function ProfileEditorDialog({
  open,
  onOpenChange,
  profileName,
  isCreatingNew = false,
}: ProfileEditorDialogProps) {
  const { toast } = useToast()
  const templateStore = useTemplateStore()

  const [activeTab, setActiveTab] = useState("basic")
  const [isEditing, setIsEditing] = useState(false)
  const [isCopyingBuiltIn, setIsCopyingBuiltIn] = useState(false)

  // Form state
  const [profileForm, setProfileForm] = useState<Partial<AnalyticsProfile>>({
    name: "",
    description: "",
    user_prompt: "",
    system_prompt: "",
    template_prompt: "",
    curiosity_prompt: "",
    conversation_mode: "tracking",
    visualization: {
      default_layout: "radial",
      node_color_scheme: "default",
      highlight_decisions: true,
      highlight_questions: true,
      expand_level: 1,
    },
    bookmarks: [],
    version: 2,
  })

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (isCreatingNew) {
        // Create a new profile from scratch
        setProfileForm({
          name: "New Analytics Profile",
          description: "Description of your analytics profile",
          user_prompt: "Analyze the transcript to provide insights.",
          system_prompt:
            "You are an AI assistant specializing in conversation analysis. Your role is to:\n1. Extract key information from transcripts\n2. Identify important points, decisions, and action items\n3. Provide clear, concise analysis\n4. Organize information in a structured format\n5. Maintain a professional communication style",
          template_prompt:
            "Please analyze the following transcript:\n\n1. Summary\n   - Main topics and themes\n   - Overall context\n\n2. Key Points\n   - Important information shared\n   - Decisions made\n   - Questions raised\n\n3. Action Items\n   - Tasks assigned\n   - Follow-up required\n   - Deadlines mentioned",
          curiosity_prompt:
            '[SYSTEM INSTRUCTIONS - DO NOT MODIFY THIS SECTION]\nYou are an expert active listener analyzing meeting transcripts. \nGenerate 2-3 insightful questions that would help understand the context better.\n\n[QUESTION TYPES - DO NOT MODIFY THESE TYPES]\nQuestion types:\n- YES_NO: Simple yes/no questions\n- MULTIPLE_CHOICE: Questions with predefined options (provide 3-4 choices)\n- MULTIPLE_CHOICE_FILL: Multiple choice with an "other" option (provide 3-4 choices)\n- SPEAKER_IDENTIFICATION: Questions about who said specific statements\n- MEETING_TYPE: Questions about the type of meeting/conversation\n\n[CUSTOMIZABLE GUIDELINES - YOU CAN MODIFY THIS SECTION]\nGenerate questions that:\n- Are relevant to the transcript content\n- Help clarify important points\n- Uncover underlying context\n- Are concise and clear\n- Have meaningful multiple choice options when applicable\n\n[OUTPUT FORMAT - DO NOT MODIFY THIS SECTION]\nReturn a JSON array of questions in the following format:\n[\n  {\n    "type": "QUESTION_TYPE",\n    "text": "The question text",\n    "options": ["Option 1", "Option 2", "Option 3"] // Only for MULTIPLE_CHOICE and MULTIPLE_CHOICE_FILL types\n  }\n]',
          conversation_mode: "tracking",
          visualization: {
            default_layout: "radial",
            node_color_scheme: "default",
            highlight_decisions: true,
            highlight_questions: true,
            expand_level: 1,
          },
          bookmarks: [
            {
              name: "Decision",
              bookmark_type: "marker",
              key_shortcut: "Ctrl+D",
              voice_trigger: "decision",
              content: "[DECISION]",
              description: "Mark an important decision",
              is_user_speaking: false,
              is_decision_point: true,
              is_action_item: false,
            },
            {
              name: "Action Item",
              bookmark_type: "marker",
              key_shortcut: "Ctrl+A",
              voice_trigger: "action",
              content: "[ACTION]",
              description: "Mark an action item",
              is_user_speaking: false,
              is_decision_point: false,
              is_action_item: true,
            },
          ],
          version: 2,
        })
        setIsEditing(true)
        setIsCopyingBuiltIn(false)
      } else if (profileName) {
        // Load existing profile
        const profile = templateStore.templates.find((t) => t.name === profileName)
        if (profile) {
          setProfileForm({ ...profile })
          setIsEditing(!profile.name.startsWith("*"))
          setIsCopyingBuiltIn(profile.name.startsWith("*"))
        }
      }
    }
  }, [open, profileName, isCreatingNew, templateStore.templates])

  const handleSave = () => {
    if (!profileForm.name) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please provide a name for the analytics profile.",
      })
      return
    }

    try {
      if (isCopyingBuiltIn) {
        // Create a copy of the built-in profile
        const newProfile = {
          ...profileForm,
          name: profileForm.name.startsWith("*") ? profileForm.name.substring(1) : profileForm.name,
        } as AnalyticsProfile

        templateStore.addTemplate(newProfile)
        templateStore.setActiveTemplate(newProfile.name)

        toast({
          title: "Profile Created",
          description: `Created new analytics profile "${newProfile.name}"`,
        })
      } else if (isEditing) {
        // Save the edited profile
        const profileName = profileForm.name as string
        templateStore.updateTemplate(profileName, profileForm)
        templateStore.setActiveTemplate(profileName)

        toast({
          title: "Profile Saved",
          description: `Analytics profile "${profileName}" has been updated.`,
        })
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Profile",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreatingNew
              ? "Create New Analytics Profile"
              : isCopyingBuiltIn
                ? "Create Copy of Analytics Profile"
                : "Edit Analytics Profile"}
          </DialogTitle>
          <DialogDescription>
            {isCreatingNew
              ? "Create a new analytics profile from scratch."
              : isCopyingBuiltIn
                ? "Create an editable copy of this built-in profile."
                : "Customize how AI analyzes your conversations."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>

          {/* Basic Settings Tab */}
          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  value={
                    isCopyingBuiltIn && profileForm.name?.startsWith("*")
                      ? profileForm.name.substring(1)
                      : profileForm.name
                  }
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter profile name"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-description">Description</Label>
                <Textarea
                  id="profile-description"
                  value={profileForm.description}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter a brief description of this profile"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversation-mode">Conversation Mode</Label>
                <Select
                  value={profileForm.conversation_mode}
                  onValueChange={(value) =>
                    setProfileForm({
                      ...profileForm,
                      conversation_mode: value,
                    })
                  }
                  disabled={!isEditing && !isCopyingBuiltIn}
                >
                  <SelectTrigger id="conversation-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tracking">Tracking (Passive)</SelectItem>
                    <SelectItem value="guided">Guided (Suggestions)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Tracking mode passively analyzes conversations. Guided mode provides real-time suggestions.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* AI Prompts Tab */}
          <TabsContent value="prompts" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-prompt">User Prompt</Label>
                <Textarea
                  id="user-prompt"
                  value={profileForm.user_prompt}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      user_prompt: e.target.value,
                    })
                  }
                  placeholder="Enter the user prompt"
                  className="min-h-[80px]"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
                <p className="text-sm text-muted-foreground">
                  The initial instruction to the AI. Keep it concise and clear.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={profileForm.system_prompt}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      system_prompt: e.target.value,
                    })
                  }
                  placeholder="Enter the system prompt"
                  className="min-h-[150px]"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
                <p className="text-sm text-muted-foreground">
                  Instructions that define the AI's role and behavior. This sets the tone and approach.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-prompt">Template Prompt</Label>
                <Textarea
                  id="template-prompt"
                  value={profileForm.template_prompt}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      template_prompt: e.target.value,
                    })
                  }
                  placeholder="Enter the template prompt"
                  className="min-h-[200px]"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
                <p className="text-sm text-muted-foreground">
                  The structured format for the AI's response. Use numbered lists and sections for better organization.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="curiosity-prompt">Curiosity Engine Prompt</Label>
                <Textarea
                  id="curiosity-prompt"
                  value={profileForm.curiosity_prompt}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      curiosity_prompt: e.target.value,
                    })
                  }
                  placeholder="Enter the curiosity engine prompt"
                  className="min-h-[200px]"
                  disabled={!isEditing && !isCopyingBuiltIn}
                />
                <p className="text-sm text-muted-foreground">
                  Instructions for generating questions about the conversation. This powers the Curiosity Engine.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Visualization Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-layout">Default Layout</Label>
                    <Select
                      value={profileForm.visualization?.default_layout}
                      onValueChange={(value) =>
                        setProfileForm({
                          ...profileForm,
                          visualization: {
                            ...profileForm.visualization!,
                            default_layout: value,
                          },
                        })
                      }
                      disabled={!isEditing && !isCopyingBuiltIn}
                    >
                      <SelectTrigger id="default-layout">
                        <SelectValue placeholder="Select layout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radial">Radial</SelectItem>
                        <SelectItem value="flow">Flow Chart</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color-scheme">Color Scheme</Label>
                    <Select
                      value={profileForm.visualization?.node_color_scheme}
                      onValueChange={(value) =>
                        setProfileForm({
                          ...profileForm,
                          visualization: {
                            ...profileForm.visualization!,
                            node_color_scheme: value,
                          },
                        })
                      }
                      disabled={!isEditing && !isCopyingBuiltIn}
                    >
                      <SelectTrigger id="color-scheme">
                        <SelectValue placeholder="Select color scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bookmarks section would go here - simplified for now */}
              <div className="space-y-2">
                <Label>Bookmarks</Label>
                <p className="text-sm text-muted-foreground">
                  Bookmark configuration is available in the advanced editor.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {!isEditing && !isCopyingBuiltIn && !isCreatingNew && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Built-in Profile</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  This is a built-in profile that cannot be directly edited. You can create a copy to customize it.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 bg-white dark:bg-transparent"
                  onClick={() => setIsCopyingBuiltIn(true)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Create Copy
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isEditing && !isCopyingBuiltIn && !isCreatingNew}>
            <Save className="h-4 w-4 mr-2" />
            {isCopyingBuiltIn ? "Create Copy" : "Save Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
