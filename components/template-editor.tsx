"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTemplateStore, type AnalyticsProfile } from "@/lib/template-store"
import { useErrorHandler } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function TemplateEditor() {
  const { toast } = useToast()
  const { handleError } = useErrorHandler()
  const templateStore = useTemplateStore()

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Form state
  const [templateForm, setTemplateForm] = useState<Partial<AnalyticsProfile>>({
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

  // Load template data when selected
  const loadTemplate = (templateName: string) => {
    const template = templateStore.templates.find((t) => t.name === templateName)
    if (template) {
      setTemplateForm(template)
      setSelectedTemplate(templateName)
      setIsCreatingNew(false)
    }
  }

  // Create a new template
  const createNewTemplate = () => {
    setTemplateForm({
      name: "New Template",
      description: "Description of your template",
      user_prompt: "Enter your user prompt here",
      system_prompt: "You are an AI assistant analyzing conversations. Your role is to...",
      template_prompt: "Please analyze the following transcript:\n\n1. Summary\n2. Key Points\n3. Action Items",
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
      bookmarks: [],
      version: 2,
    })
    setSelectedTemplate(null)
    setIsCreatingNew(true)
    setActiveTab("basic")
  }

  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setTemplateForm((prev) => {
      if (field.includes(".")) {
        const [parent, child] = field.split(".")
        return {
          ...prev,
          [parent]: {
            ...prev[parent as keyof typeof prev],
            [child]: value,
          },
        }
      }
      return {
        ...prev,
        [field]: value,
      }
    })
  }

  // Save the template
  const saveTemplate = async () => {
    try {
      if (!templateForm.name) {
        toast({
          title: "Error",
          description: "Template name is required",
          variant: "destructive",
        })
        return
      }

      const completeTemplate = {
        ...templateForm,
        id: isCreatingNew ? `template_${Date.now()}` : templateForm.id || `template_${Date.now()}`,
        version: templateForm.version || 2,
      } as AnalyticsProfile

      if (isCreatingNew) {
        await templateStore.addTemplate(completeTemplate)
        toast({
          title: "Success",
          description: "Template created successfully",
        })
      } else {
        await templateStore.updateTemplate(completeTemplate)
        toast({
          title: "Success",
          description: "Template updated successfully",
        })
      }

      setSelectedTemplate(completeTemplate.name)
      setIsCreatingNew(false)
    } catch (error) {
      handleError(error, "Failed to save template")
    }
  }

  // Delete the template
  const deleteTemplate = async () => {
    try {
      if (!selectedTemplate || !templateForm.id) return

      await templateStore.removeTemplate(templateForm.id)
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })

      setSelectedTemplate(null)
      setTemplateForm({
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
    } catch (error) {
      handleError(error, "Failed to delete template")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Template Editor</h2>
        <div className="flex gap-2">
          <Select value={selectedTemplate || ""} onValueChange={(value) => value && loadTemplate(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templateStore.templates.map((template) => (
                <SelectItem key={template.id} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={createNewTemplate}>New Template</Button>
        </div>
      </div>

      {(selectedTemplate || isCreatingNew) && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Input
                value={templateForm.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Template Name"
                className="text-xl font-bold"
              />
            </CardTitle>
            <CardDescription>
              <Textarea
                value={templateForm.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Template Description"
                className="mt-2"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <div className="space-y-4">
                  <div>
                    <Label>Conversation Mode</Label>
                    <Select
                      value={templateForm.conversation_mode || "tracking"}
                      onValueChange={(value) => handleChange("conversation_mode", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tracking">Tracking</SelectItem>
                        <SelectItem value="guided">Guided</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prompts">
                <div className="space-y-4">
                  <div>
                    <Label>System Prompt</Label>
                    <Textarea
                      value={templateForm.system_prompt || ""}
                      onChange={(e) => handleChange("system_prompt", e.target.value)}
                      placeholder="System instructions for the AI"
                      className="h-32"
                    />
                  </div>

                  <div>
                    <Label>User Prompt</Label>
                    <Textarea
                      value={templateForm.user_prompt || ""}
                      onChange={(e) => handleChange("user_prompt", e.target.value)}
                      placeholder="Default user prompt"
                      className="h-32"
                    />
                  </div>

                  <div>
                    <Label>Template Prompt</Label>
                    <Textarea
                      value={templateForm.template_prompt || ""}
                      onChange={(e) => handleChange("template_prompt", e.target.value)}
                      placeholder="Template for analysis"
                      className="h-32"
                    />
                  </div>

                  <div>
                    <Label>Curiosity Prompt</Label>
                    <Textarea
                      value={templateForm.curiosity_prompt || ""}
                      onChange={(e) => handleChange("curiosity_prompt", e.target.value)}
                      placeholder="Prompt for generating questions"
                      className="h-32"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visualization">
                <div className="space-y-4">
                  <div>
                    <Label>Default Layout</Label>
                    <Select
                      value={templateForm.visualization?.default_layout || "radial"}
                      onValueChange={(value) => handleChange("visualization.default_layout", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select layout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radial">Radial</SelectItem>
                        <SelectItem value="tree">Tree</SelectItem>
                        <SelectItem value="force">Force</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Node Color Scheme</Label>
                    <Select
                      value={templateForm.visualization?.node_color_scheme || "default"}
                      onValueChange={(value) => handleChange("visualization.node_color_scheme", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="sentiment">Sentiment</SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={templateForm.visualization?.highlight_questions || false}
                      onCheckedChange={(checked) => handleChange("visualization.highlight_questions", checked)}
                    />
                    <Label>Highlight Questions</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={templateForm.visualization?.highlight_decisions || false}
                      onCheckedChange={(checked) => handleChange("visualization.highlight_decisions", checked)}
                    />
                    <Label>Highlight Decisions</Label>
                  </div>

                  <div>
                    <Label>Expand Level</Label>
                    <Select
                      value={String(templateForm.visualization?.expand_level || 1)}
                      onValueChange={(value) => handleChange("visualization.expand_level", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expand level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1</SelectItem>
                        <SelectItem value="2">Level 2</SelectItem>
                        <SelectItem value="3">Level 3</SelectItem>
                        <SelectItem value="4">Level 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {!isCreatingNew && (
                <Button variant="destructive" onClick={deleteTemplate}>
                  Delete
                </Button>
              )}
              <Button onClick={saveTemplate}>{isCreatingNew ? "Create" : "Update"}</Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
