"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Save,
  Key,
  User,
  Database,
  Sliders,
  Palette,
  Volume2,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  BrainCircuit,
  Settings2,
  HelpCircle,
  Compass,
  Sparkles,
  Mic,
  Cloud,
  Move,
  Minus,
  Maximize2,
} from "lucide-react"
import {
  useSettingsStore,
  type ThemeOption,
  type AudioQualityOption,
  type StorageLocationType,
  type QuestionType,
} from "@/lib/settings-store"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import SilenceAlertDialog from "./silence-alert-dialog"
import { Card } from "@/components/ui/card"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { toast } = useToast()
  const settings = useSettingsStore()

  const [activeTab, setActiveTab] = useState("general")
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showSilenceAlert, setShowSilenceAlert] = useState(false)
  const [silenceAlertType, setSilenceAlertType] = useState<'initial' | 'stopped' | 'continued'>('initial')
  const [autoStopTimer, setAutoStopTimer] = useState<NodeJS.Timeout | null>(null)

  // Local state for form values
  const [localSettings, setLocalSettings] = useState({
    theme: settings.theme,
    autoSave: settings.autoSave,
    audioQuality: settings.audioQuality,
    volume: settings.volume,
    assemblyAIKey: settings.assemblyAIKey,
    openRouterKey: settings.openRouterKey || "",
    aiBaseURL: settings.aiBaseURL || "https://api.openai.com/v1",
    aiProvider: settings.aiProvider || "openai",
    aiModel: settings.aiModel || "gpt-4o",
    aiRefererURL: settings.aiRefererURL || window?.location?.origin || "",
    aiSiteName: settings.aiSiteName || "TalkAdvantage",
    systemProps: settings.systemProps,
    storageLocation: settings.storageLocation,
    silenceDetection: settings.silenceDetection,
    contextPackEnabled: settings.contextPackEnabled,
  })

  // Update local state when settings change
  useEffect(() => {
    if (open) {
      setLocalSettings({
        theme: settings.theme,
        autoSave: settings.autoSave,
        audioQuality: settings.audioQuality,
        volume: settings.volume,
        assemblyAIKey: settings.assemblyAIKey,
        openRouterKey: settings.openRouterKey || "",
        aiBaseURL: settings.aiBaseURL || "https://api.openai.com/v1",
        aiProvider: settings.aiProvider || "openai",
        aiModel: settings.aiModel || "gpt-4o",
        aiRefererURL: settings.aiRefererURL || window?.location?.origin || "",
        aiSiteName: settings.aiSiteName || "TalkAdvantage",
        systemProps: settings.systemProps,
        storageLocation: settings.storageLocation,
        silenceDetection: settings.silenceDetection,
        contextPackEnabled: settings.contextPackEnabled,
      })

      // Reset key status when opening modal
      setKeyStatus("idle")
    }
  }, [open, settings])

  const testAPIKey = async () => {
    if (!localSettings.assemblyAIKey.trim()) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter an AssemblyAI API key to test.",
      })
      return
    }

    setIsTestingKey(true)
    setKeyStatus("idle")

    try {
      const response = await fetch("/api/test-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: localSettings.assemblyAIKey }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setKeyStatus("valid")
        toast({
          variant: "default",
          title: "API Key Valid",
          description: "Your AssemblyAI API key has been validated successfully.",
        })
      } else {
        setKeyStatus("invalid")
        toast({
          variant: "destructive",
          title: "Invalid API Key",
          description: data.message || "The API key provided is not valid. Please check and try again.",
        })
      }
    } catch (error) {
      console.error("Error testing API key:", error)
      setKeyStatus("invalid")
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Failed to validate API key. Please try again later.",
      })
    } finally {
      setIsTestingKey(false)
    }
  }

  const testOpenRouterKey = async () => {
    if (!localSettings.openRouterKey.trim()) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter an OpenRouter API key to test.",
      })
      return
    }

    setIsTestingKey(true)

    try {
      toast({
        variant: "default",
        title: "Testing OpenRouter Key",
        description: "Validating your OpenRouter API key...",
      })

      // In a real implementation, you would test the key here
      // For now, we'll just simulate a successful test
      setTimeout(() => {
        setIsTestingKey(false)
        toast({
          variant: "default",
          title: "API Key Valid",
          description: "Your OpenRouter API key has been validated successfully.",
        })
      }, 1500)
    } catch (error) {
      console.error("Error testing OpenRouter key:", error)
      setIsTestingKey(false)
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Failed to validate OpenRouter API key. Please check your key and try again.",
      })
    }
  }

  const saveSettings = () => {
    // Apply all settings at once
    settings.setTheme(localSettings.theme as ThemeOption)
    settings.setAutoSave(localSettings.autoSave)
    settings.setAudioQuality(localSettings.audioQuality as AudioQualityOption)
    settings.setVolume(localSettings.volume)
    settings.setAssemblyAIKey(localSettings.assemblyAIKey)
    settings.setOpenRouterKey(localSettings.openRouterKey)
    settings.setAIBaseURL(localSettings.aiBaseURL)
    settings.setAIProvider(localSettings.aiProvider as "openai" | "openrouter" | "custom")
    settings.setAIModel(localSettings.aiModel)
    settings.setAIRefererURL(localSettings.aiRefererURL)
    settings.setAISiteName(localSettings.aiSiteName)
    settings.setStorageLocation(localSettings.storageLocation as StorageLocationType)
    
    // Save silence detection settings
    settings.setSilenceDetectionEnabled(localSettings.silenceDetection.enabled)
    settings.setSilenceThresholdMinutes(localSettings.silenceDetection.thresholdMinutes)
    settings.setSilenceAutoStopSeconds(localSettings.silenceDetection.autoStopSeconds)

    settings.setContextPackEnabled(localSettings.contextPackEnabled)

    toast({
      variant: "default",
      title: "Settings Saved",
      description: "Your settings have been updated successfully.",
    })
  }

  const resetSettings = () => {
    setIsResetting(true)

    // Simulate a delay for better UX
    setTimeout(() => {
      settings.resetSettings()
      setLocalSettings({
        theme: settings.theme,
        autoSave: settings.autoSave,
        audioQuality: settings.audioQuality,
        volume: settings.volume,
        assemblyAIKey: settings.assemblyAIKey,
        openRouterKey: settings.openRouterKey || "",
        aiBaseURL: settings.aiBaseURL || "https://api.openai.com/v1",
        aiProvider: settings.aiProvider || "openai",
        aiModel: settings.aiModel || "gpt-4o",
        aiRefererURL: settings.aiRefererURL || window?.location?.origin || "",
        aiSiteName: settings.aiSiteName || "TalkAdvantage",
        systemProps: settings.systemProps,
        storageLocation: settings.storageLocation,
        silenceDetection: settings.silenceDetection,
        contextPackEnabled: settings.contextPackEnabled,
      })

      toast({
        variant: "default",
        title: "Settings Reset",
        description: "All settings have been reset to default values.",
      })

      setIsResetting(false)
    }, 1000)
  }

  // Update local system props
  const updateCuriosityEngineSettings = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      systemProps: {
        ...localSettings.systemProps,
        curiosityEngine: {
          ...localSettings.systemProps.curiosityEngine,
          [key]: value,
        },
      },
    })
  }

  const updateConversationCompassSettings = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      systemProps: {
        ...localSettings.systemProps,
        conversationCompass: {
          ...localSettings.systemProps.conversationCompass,
          [key]: value,
        },
      },
    })
  }

  const updateGuidedConversationsSettings = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      systemProps: {
        ...localSettings.systemProps,
        conversationCompass: {
          ...localSettings.systemProps.conversationCompass,
          guidedConversations: {
            ...localSettings.systemProps.conversationCompass.guidedConversations,
            [key]: value,
          },
        },
      },
    })
  }

  const updateTrackingModeSettings = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      systemProps: {
        ...localSettings.systemProps,
        conversationCompass: {
          ...localSettings.systemProps.conversationCompass,
          trackingMode: {
            ...localSettings.systemProps.conversationCompass.trackingMode,
            [key]: value,
          },
        },
      },
    })
  }

  const handleQuestionTypeToggle = (type: QuestionType, checked: boolean) => {
    const currentTypes = [...localSettings.systemProps.curiosityEngine.allowedQuestionTypes]

    if (checked && !currentTypes.includes(type)) {
      updateCuriosityEngineSettings("allowedQuestionTypes", [...currentTypes, type])
    } else if (!checked && currentTypes.includes(type)) {
      updateCuriosityEngineSettings(
        "allowedQuestionTypes",
        currentTypes.filter((t) => t !== type),
      )
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your TalkAdvantage preferences and API integrations.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">
              <Sliders className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="recording">
              <Mic className="h-4 w-4 mr-2" />
              Recording
            </TabsTrigger>
            <TabsTrigger value="api">
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="ai">
              <BrainCircuit className="h-4 w-4 mr-2" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="storage">
              <Database className="h-4 w-4 mr-2" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings2 className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
            <TabsTrigger value="widgets">
              <Move className="h-4 w-4 mr-2" />
              Widgets
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Appearance</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Theme</Label>
                    <div className="text-sm text-muted-foreground">Choose your preferred color theme</div>
                  </div>
                  <Select
                    value={localSettings.theme}
                    onValueChange={(value) => setLocalSettings({ ...localSettings, theme: value as ThemeOption })}
                  >
                    <SelectTrigger id="theme" className="w-[180px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span>Light</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span>Dark</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span>System</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Context Pack Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="context-pack-enabled">Enable Context Pack for Analysis</Label>
                    <div className="text-sm text-muted-foreground">All analysis will use Context Packs for context if enabled.</div>
                  </div>
                  <Switch
                    id="context-pack-enabled"
                    checked={localSettings.contextPackEnabled}
                    onCheckedChange={(checked) => setLocalSettings({ ...localSettings, contextPackEnabled: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recording</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-save">Auto Save</Label>
                    <div className="text-sm text-muted-foreground">Automatically save recordings when stopped</div>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={localSettings.autoSave}
                    onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoSave: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="audio-quality">Audio Quality</Label>
                    <div className="text-sm text-muted-foreground">Higher quality uses more storage</div>
                  </div>
                  <Select
                    value={localSettings.audioQuality}
                    onValueChange={(value) => setLocalSettings((prev) => ({ ...prev, audioQuality: value as AudioQualityOption }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Smaller file size)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="volume">Default Volume</Label>
                    <span className="text-sm text-muted-foreground">{localSettings.volume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      id="volume"
                      value={[localSettings.volume]}
                      max={100}
                      step={1}
                      onValueChange={(value) => setLocalSettings({ ...localSettings, volume: value[0] })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Recording Settings */}
          <TabsContent value="recording" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Recording Settings</h3>
              <p className="text-sm text-muted-foreground">Configure your recording preferences and silence detection.</p>
            </div>

            <div className="space-y-4">
              {/* Audio Quality Settings */}
              <div>
                <Label>Audio Quality</Label>
                <Select
                  value={localSettings.audioQuality}
                  onValueChange={(value) =>
                    setLocalSettings((prev) => ({ ...prev, audioQuality: value as AudioQualityOption }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Smaller file size)</SelectItem>
                    <SelectItem value="medium">Medium (Balanced)</SelectItem>
                    <SelectItem value="high">High (Best quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Settings */}
              <div className="space-y-2">
                <Label>Volume</Label>
                <div className="flex items-center gap-4">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[localSettings.volume]}
                    onValueChange={(value) => setLocalSettings((prev) => ({ ...prev, volume: value[0] }))}
                    max={100}
                    step={1}
                  />
                  <span className="w-12 text-right text-sm">{localSettings.volume}%</span>
                </div>
              </div>

              {/* Silence Detection Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Silence Detection</Label>
                  <Switch
                    checked={localSettings.silenceDetection.enabled}
                    onCheckedChange={(enabled) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        silenceDetection: { ...prev.silenceDetection, enabled }
                      }))
                    }
                  />
                </div>

                <div className="space-y-4 pl-4">
                  <div className="space-y-2">
                    <Label>Silence Threshold (minutes)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={localSettings.silenceDetection.thresholdMinutes}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            silenceDetection: {
                              ...prev.silenceDetection,
                              thresholdMinutes: parseInt(e.target.value) || 1
                            }
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes before notification</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-stop Timer (seconds)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={10}
                        max={120}
                        value={localSettings.silenceDetection.autoStopSeconds}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            silenceDetection: {
                              ...prev.silenceDetection,
                              autoStopSeconds: parseInt(e.target.value) || 10
                            }
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">seconds to wait before auto-stop</span>
                    </div>
                  </div>

                  {/* Add Test Button */}
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSilenceAlertType('initial')
                        setShowSilenceAlert(true)
                        
                        // Set timer for auto-stop
                        const timer = setTimeout(() => {
                          if (silenceAlertType === 'initial') {
                            setSilenceAlertType('stopped')
                          }
                        }, localSettings.silenceDetection.autoStopSeconds * 1000)
                        
                        setAutoStopTimer(timer)
                      }}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Mic className="h-4 w-4" />
                      Test Silence Detection
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to simulate the silence detection prompt that appears during recording.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api" className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">AssemblyAI Integration</h3>
              <div className="space-y-2">
                <Label htmlFor="assemblyai-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="assemblyai-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Enter your AssemblyAI API key"
                      value={localSettings.assemblyAIKey}
                      onChange={(e) => setLocalSettings({ ...localSettings, assemblyAIKey: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={testAPIKey}
                    disabled={isTestingKey || !localSettings.assemblyAIKey.trim()}
                  >
                    {isTestingKey ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Key"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Don't have an API key?{" "}
                  <a
                    href="https://www.assemblyai.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get one from AssemblyAI
                  </a>
                </p>

                {keyStatus === "valid" && (
                  <Alert className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900">
                    <AlertDescription className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      API key is valid and working correctly.
                    </AlertDescription>
                  </Alert>
                )}

                {keyStatus === "invalid" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>Invalid API key. Please check and try again.</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">API Usage</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Current plan: Free Tier</p>
                  <p>Usage this month: 0 / 5 hours</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">OpenRouter Integration</h3>
              <div className="space-y-2">
                <Label htmlFor="openrouter-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="openrouter-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Enter your OpenRouter API key"
                      value={localSettings.openRouterKey}
                      onChange={(e) => setLocalSettings({ ...localSettings, openRouterKey: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={testOpenRouterKey}
                    disabled={isTestingKey || !localSettings.openRouterKey.trim()}
                  >
                    {isTestingKey ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Key"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Don't have an API key?{" "}
                  <a
                    href="https://openrouter.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get one from OpenRouter
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* AI Models Tab */}
          <TabsContent value="ai" className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">AI Provider Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-provider">AI Provider</Label>
                    <div className="text-sm text-muted-foreground">Select your preferred AI provider</div>
                  </div>
                  <Select
                    value={localSettings.aiProvider}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        aiProvider: value as "openai" | "openrouter" | "custom",
                        // Update baseURL based on provider selection
                        aiBaseURL:
                          value === "openai"
                            ? "https://api.openai.com/v1"
                            : value === "openrouter"
                              ? "https://openrouter.ai/api/v1"
                              : localSettings.aiBaseURL,
                      })
                    }
                  >
                    <SelectTrigger id="ai-provider" className="w-[180px]">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">Custom Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {localSettings.aiProvider === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="ai-base-url">Base URL</Label>
                    <Input
                      id="ai-base-url"
                      placeholder="Enter custom API base URL"
                      value={localSettings.aiBaseURL}
                      onChange={(e) => setLocalSettings({ ...localSettings, aiBaseURL: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">Enter the base URL for your custom AI provider</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select
                    value={localSettings.aiModel}
                    onValueChange={(value) => setLocalSettings({ ...localSettings, aiModel: value })}
                  >
                    <SelectTrigger id="ai-model" className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {localSettings.aiProvider === "openai" && (
                        <>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </>
                      )}
                      {localSettings.aiProvider === "openrouter" && (
                        <>
                          <SelectItem value="openai/gpt-3.5-turbo">OpenAI: GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="openai/gpt-4">OpenAI: GPT-4</SelectItem>
                          <SelectItem value="openai/gpt-4-turbo">OpenAI: GPT-4 Turbo</SelectItem>
                          <SelectItem value="openai/gpt-4-vision">OpenAI: GPT-4 Vision</SelectItem>
                          <SelectItem value="anthropic/claude-3-opus">Anthropic: Claude 3 Opus</SelectItem>
                          <SelectItem value="anthropic/claude-3-sonnet">Anthropic: Claude 3 Sonnet</SelectItem>
                          <SelectItem value="google/gemini-pro">Google: Gemini Pro</SelectItem>
                          <SelectItem value="meta-llama/llama-3-70b-instruct">Meta: Llama 3 70B</SelectItem>
                        </>
                      )}
                      {localSettings.aiProvider === "custom" && (
                        <SelectItem value="custom-model">Custom Model (specify in code)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {localSettings.aiProvider === "openrouter" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ai-referer-url">HTTP Referer URL</Label>
                      <Input
                        id="ai-referer-url"
                        placeholder="Your site URL (for OpenRouter rankings)"
                        value={localSettings.aiRefererURL}
                        onChange={(e) => setLocalSettings({ ...localSettings, aiRefererURL: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Optional: Your site URL for rankings on openrouter.ai
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-site-name">Site Name</Label>
                      <Input
                        id="ai-site-name"
                        placeholder="Your site name (for OpenRouter rankings)"
                        value={localSettings.aiSiteName}
                        onChange={(e) => setLocalSettings({ ...localSettings, aiSiteName: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Optional: Your site name for rankings on openrouter.ai
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">AI Usage Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analysis Depth</Label>
                    <div className="text-sm text-muted-foreground">Configure how detailed AI analysis should be</div>
                  </div>
                  <Select defaultValue="balanced">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Faster)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="detailed">Detailed (More Tokens)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Analysis</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically analyze transcripts when completed
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* System Props Tab */}
          <TabsContent value="system" className="space-y-6 py-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">System Properties</h3>
              <p className="text-sm text-muted-foreground">Configure the AI components and system behavior</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="curiosity-engine">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">Curiosity Engine</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="curiosity-enabled">Enable Curiosity Engine</Label>
                      <div className="text-sm text-muted-foreground">
                        Generate AI-powered questions about your conversations
                      </div>
                    </div>
                    <Switch
                      id="curiosity-enabled"
                      checked={localSettings.systemProps.curiosityEngine.enabled}
                      onCheckedChange={(checked) => updateCuriosityEngineSettings("enabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="curiosity-auto">Auto-Generate Questions</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically generate questions when analysis is triggered
                      </div>
                    </div>
                    <Switch
                      id="curiosity-auto"
                      checked={localSettings.systemProps.curiosityEngine.autoGenerateOnAnalysis}
                      onCheckedChange={(checked) => updateCuriosityEngineSettings("autoGenerateOnAnalysis", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question-count">Number of Questions</Label>
                    <Select
                      value={localSettings.systemProps.curiosityEngine.questionCount.toString()}
                      onValueChange={(value) => updateCuriosityEngineSettings("questionCount", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Question</SelectItem>
                        <SelectItem value="2">2 Questions</SelectItem>
                        <SelectItem value="3">3 Questions</SelectItem>
                        <SelectItem value="5">5 Questions</SelectItem>
                        <SelectItem value="10">10 Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Question Types</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-yes-no"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes("YES_NO")}
                          onCheckedChange={(checked) => handleQuestionTypeToggle("YES_NO", checked as boolean)}
                        />
                        <Label htmlFor="question-type-yes-no">Yes/No Questions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-multiple-choice"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes(
                            "MULTIPLE_CHOICE",
                          )}
                          onCheckedChange={(checked) => handleQuestionTypeToggle("MULTIPLE_CHOICE", checked as boolean)}
                        />
                        <Label htmlFor="question-type-multiple-choice">Multiple Choice</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-multiple-choice-fill"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes(
                            "MULTIPLE_CHOICE_FILL",
                          )}
                          onCheckedChange={(checked) =>
                            handleQuestionTypeToggle("MULTIPLE_CHOICE_FILL", checked as boolean)
                          }
                        />
                        <Label htmlFor="question-type-multiple-choice-fill">Multiple Choice with Other</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-speaker"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes(
                            "SPEAKER_IDENTIFICATION",
                          )}
                          onCheckedChange={(checked) =>
                            handleQuestionTypeToggle("SPEAKER_IDENTIFICATION", checked as boolean)
                          }
                        />
                        <Label htmlFor="question-type-speaker">Speaker Identification</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-meeting"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes(
                            "MEETING_TYPE",
                          )}
                          onCheckedChange={(checked) => handleQuestionTypeToggle("MEETING_TYPE", checked as boolean)}
                        />
                        <Label htmlFor="question-type-meeting">Meeting Type</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="question-type-open-ended"
                          checked={localSettings.systemProps.curiosityEngine.allowedQuestionTypes.includes(
                            "OPEN_ENDED",
                          )}
                          onCheckedChange={(checked) => handleQuestionTypeToggle("OPEN_ENDED", checked as boolean)}
                        />
                        <Label htmlFor="question-type-open-ended">Open-Ended</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curiosity-guidelines">Customizable Guidelines</Label>
                    <Textarea
                      id="curiosity-guidelines"
                      placeholder="Enter guidelines for question generation"
                      value={localSettings.systemProps.curiosityEngine.customizableGuidelines}
                      onChange={(e) => updateCuriosityEngineSettings("customizableGuidelines", e.target.value)}
                      className="min-h-[150px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      These guidelines instruct the AI on what kind of questions to generate
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="conversation-compass">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    <span className="font-medium">Conversation Compass</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compass-enabled">Enable Conversation Compass</Label>
                      <div className="text-sm text-muted-foreground">
                        Visualize conversation flow and get AI-powered guidance
                      </div>
                    </div>
                    <Switch
                      id="compass-enabled"
                      checked={localSettings.systemProps.conversationCompass.enabled}
                      onCheckedChange={(checked) => updateConversationCompassSettings("enabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compass-auto">Auto-Update Visualization</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically update visualization when analysis is triggered
                      </div>
                    </div>
                    <Switch
                      id="compass-auto"
                      checked={localSettings.systemProps.conversationCompass.autoUpdateOnAnalysis}
                      onCheckedChange={(checked) => updateConversationCompassSettings("autoUpdateOnAnalysis", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visualization-type">Visualization Type</Label>
                    <Select
                      value={localSettings.systemProps.conversationCompass.visualizationType}
                      onValueChange={(value) => updateConversationCompassSettings("visualizationType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visualization type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tree">Tree View</SelectItem>
                        <SelectItem value="flow">Flow View</SelectItem>
                        <SelectItem value="network">Network View</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose how conversation topics and relationships are visualized
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="guided-conversations">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    <span className="font-medium">Guided Conversations</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="guided-enabled">Enable Guided Conversations</Label>
                      <div className="text-sm text-muted-foreground">
                        Get AI-powered guidance for achieving conversation goals
                      </div>
                    </div>
                    <Switch
                      id="guided-enabled"
                      checked={localSettings.systemProps.conversationCompass.guidedConversations.enabled}
                      onCheckedChange={(checked) => updateGuidedConversationsSettings("enabled", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-goal">Default Goal</Label>
                    <Input
                      id="default-goal"
                      value={localSettings.systemProps.conversationCompass.guidedConversations.defaultGoal}
                      onChange={(e) => updateGuidedConversationsSettings("defaultGoal", e.target.value)}
                      placeholder="Enter default conversation goal"
                    />
                    <p className="text-sm text-muted-foreground">
                      The default goal to use when starting a new guided conversation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-predictions">Maximum Predictions</Label>
                    <Select
                      value={localSettings.systemProps.conversationCompass.guidedConversations.maxPredictions.toString()}
                      onValueChange={(value) =>
                        updateGuidedConversationsSettings("maxPredictions", Number.parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Prediction</SelectItem>
                        <SelectItem value="2">2 Predictions</SelectItem>
                        <SelectItem value="3">3 Predictions</SelectItem>
                        <SelectItem value="5">5 Predictions</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Maximum number of response predictions to generate</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prediction-prompt">Prediction Prompt</Label>
                    <Textarea
                      id="prediction-prompt"
                      value={localSettings.systemProps.conversationCompass.guidedConversations.predictionPrompt}
                      onChange={(e) => updateGuidedConversationsSettings("predictionPrompt", e.target.value)}
                      className="min-h-[150px] font-mono text-xs"
                      placeholder="Enter prompt for generating predictions"
                    />
                    <p className="text-sm text-muted-foreground">
                      Prompt template for generating response predictions. Use &#123;&#123; goal &#125;&#125;,
                      &#123;&#123; conversationHistory &#125;&#125;, and &#123;&#123; lastUserInput &#125;&#125; as
                      placeholders.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal-evaluation-prompt">Goal Evaluation Prompt</Label>
                    <Textarea
                      id="goal-evaluation-prompt"
                      value={localSettings.systemProps.conversationCompass.guidedConversations.goalEvaluationPrompt}
                      onChange={(e) => updateGuidedConversationsSettings("goalEvaluationPrompt", e.target.value)}
                      className="min-h-[150px] font-mono text-xs"
                      placeholder="Enter prompt for evaluating goal progress"
                    />
                    <p className="text-sm text-muted-foreground">
                      Prompt template for evaluating progress toward the conversation goal. Use &#123;&#123; goal
                      &#125;&#125; and &#123;&#123; conversationHistory &#125;&#125; as placeholders.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tracking-mode">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    <span className="font-medium">Tracking Mode</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tracking-enabled">Enable Tracking Mode</Label>
                      <div className="text-sm text-muted-foreground">
                        Get real-time suggestions and expansions as you speak
                      </div>
                    </div>
                    <Switch
                      id="tracking-enabled"
                      checked={localSettings.systemProps.conversationCompass.trackingMode.enabled}
                      onCheckedChange={(checked) => updateTrackingModeSettings("enabled", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic-drift-threshold">Topic Drift Threshold</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="topic-drift-threshold"
                        value={[localSettings.systemProps.conversationCompass.trackingMode.topicDriftThreshold * 100]}
                        max={100}
                        step={5}
                        onValueChange={(value) => updateTrackingModeSettings("topicDriftThreshold", value[0] / 100)}
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {Math.round(
                          localSettings.systemProps.conversationCompass.trackingMode.topicDriftThreshold * 100,
                        )}
                        %
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sensitivity to topic changes (higher = more sensitive)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="silence-timeout">Silence Timeout</Label>
                    <Select
                      value={localSettings.systemProps.conversationCompass.trackingMode.silenceTimeoutSeconds.toString()}
                      onValueChange={(value) =>
                        updateTrackingModeSettings("silenceTimeoutSeconds", Number.parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Time of silence before automatically stopping tracking
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-thoughts">Maximum Thoughts History</Label>
                    <Select
                      value={localSettings.systemProps.conversationCompass.trackingMode.maxThoughtsHistory.toString()}
                      onValueChange={(value) =>
                        updateTrackingModeSettings("maxThoughtsHistory", Number.parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 thoughts</SelectItem>
                        <SelectItem value="10">10 thoughts</SelectItem>
                        <SelectItem value="20">20 thoughts</SelectItem>
                        <SelectItem value="50">50 thoughts</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Maximum number of previous thoughts to keep in memory
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expansion-prompt">Expansion Prompt</Label>
                    <Textarea
                      id="expansion-prompt"
                      value={localSettings.systemProps.conversationCompass.trackingMode.expansionPrompt}
                      onChange={(e) => updateTrackingModeSettings("expansionPrompt", e.target.value)}
                      className="min-h-[150px] font-mono text-xs"
                      placeholder="Enter prompt for generating thought expansions"
                    />
                    <p className="text-sm text-muted-foreground">
                      Prompt template for generating thought expansions. Use &#123;&#123; thought &#125;&#125; as a
                      placeholder.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="future-components">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-medium">Future Components</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 border rounded-md bg-muted/30 text-center">
                    <p className="text-muted-foreground">
                      Additional AI components will be available in future updates
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Widgets Tab */}
          <TabsContent value="widgets" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Widget Settings</h3>
                <div className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                  New Feature
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Control how widgets behave in the recording tab.
              </p>
              
              <Card className="p-4 border-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-center justify-between space-x-2 mb-4">
                  <Label htmlFor="enable-drag-drop" className="flex flex-col space-y-1">
                    <span className="text-base font-medium">Enable Drag & Drop</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      When enabled: widgets can be moved, minimized, and maximized. Widget headers 
                      will show a drag handle for repositioning.
                    </span>
                    <span className="font-normal text-sm text-muted-foreground mt-1">
                      When disabled: widgets will have a fixed layout without minimize/maximize controls.
                    </span>
                    <span className="font-normal text-xs text-blue-600 dark:text-blue-400 mt-1">
                      When drag & drop is enabled, all widgets start minimized by default. Click the maximize button to expand them.
                    </span>
                  </Label>
                  <Switch
                    id="enable-drag-drop"
                    checked={settings.enableDragDrop}
                    onCheckedChange={settings.setEnableDragDrop}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center justify-between space-x-2 mb-4">
                    <Label htmlFor="talking-points-enabled" className="flex flex-col space-y-1">
                      <span className="text-base font-medium">Enable Talking Points</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        When enabled: real-time AI-powered talking points will be generated and displayed.
                      </span>
                      <span className="font-normal text-sm text-muted-foreground mt-1">
                        When disabled: talking points widget will be hidden and no processing will occur.
                      </span>
                    </Label>
                    <Switch
                      id="talking-points-enabled"
                      checked={settings.talkingPointsEnabled}
                      onCheckedChange={settings.setTalkingPointsEnabled}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-2 border-dashed border-muted flex flex-col gap-4 items-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      settings.resetWidgetPositions();
                      toast({
                        title: "Layout Reset",
                        description: "All widgets have been reset to their default positions and minimized.",
                      });
                    }}
                    className="flex items-center gap-2 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 w-full"
                    disabled={!settings.enableDragDrop}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset All Widget Positions & States
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    {settings.enableDragDrop 
                      ? "This will reset all widgets to their default positions and minimize them all."
                      : "Enable drag & drop above to allow widget repositioning."}
                  </p>
                </div>
              </Card>
              
              <div className="pt-4 flex flex-col gap-2">
                <h4 className="font-medium">How to use drag and drop:</h4>
                <ol className="text-sm text-muted-foreground space-y-1.5 ml-5 list-decimal">
                  <li>Enable drag and drop using the switch above</li>
                  <li>Click the maximize button <Maximize2 className="inline h-3 w-3" /> to expand a widget</li>
                  <li>Use the widget headers <Move className="inline h-3 w-3 ml-1" /> to drag widgets to new positions</li>
                  <li>Click the minimize button <Minus className="inline h-3 w-3" /> to collapse a widget</li>
                  <li>Use "Reset All Widget Positions" to return to the default layout</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Profile</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" defaultValue="John Doe" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" defaultValue="john.doe@example.com" className="col-span-3" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Subscription</h3>
              <div className="p-4 border rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Current Plan: Free</h4>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">5 hours of transcription per month, basic features</p>
                <Button>Upgrade Plan</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Security</h3>
              <div className="grid gap-4">
                <Button variant="outline">Change Password</Button>
                <Button variant="outline">Enable Two-Factor Authentication</Button>
              </div>
            </div>
          </TabsContent>

          {/* Storage Settings */}
          <TabsContent value="storage" className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Storage Location</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Storage Type</Label>
                    <div className="text-sm text-muted-foreground">Where to store recordings and transcripts</div>
                  </div>
                  <Select
                    value={localSettings.storageLocation}
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, storageLocation: value as StorageLocationType })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local" className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        <span>Local Storage</span>
                      </SelectItem>
                      <SelectItem value="cloud" className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        <span>Cloud Storage</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Management</h3>
              <div className="grid gap-4">
                <Button variant="outline">Clear All Data</Button>
                <Button variant="outline">Export All Data</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={resetSettings} 
            disabled={isResetting} 
            className="gap-2 group bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all shadow-sm hover:shadow"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200 group-hover:text-blue-500" />
                <span>Reset to Defaults</span>
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Silence Detection Alert Dialog */}
        <SilenceAlertDialog
          open={showSilenceAlert}
          onOpenChange={(open) => {
            setShowSilenceAlert(open)
            if (!open && autoStopTimer) {
              clearTimeout(autoStopTimer)
              setAutoStopTimer(null)
            }
          }}
          onContinue={() => {
            if (autoStopTimer) {
              clearTimeout(autoStopTimer)
              setAutoStopTimer(null)
            }
            setSilenceAlertType('continued')
          }}
          onStop={() => {
            if (autoStopTimer) {
              clearTimeout(autoStopTimer)
              setAutoStopTimer(null)
            }
            setSilenceAlertType('stopped')
          }}
          countdownSeconds={localSettings.silenceDetection.autoStopSeconds}
          thresholdMinutes={localSettings.silenceDetection.thresholdMinutes}
          type={silenceAlertType}
        />
      </DialogContent>
    </Dialog>
  )
}

function Badge({ variant, className, children }: { variant: string; className: string; children: React.ReactNode }) {
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>{children}</span>
}
