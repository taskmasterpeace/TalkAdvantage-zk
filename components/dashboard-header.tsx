"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import SettingsModal from "./settings-modal"
import { PrivacyModeIndicator } from "./privacy-mode-indicator"

export function DashboardHeader() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <header className="border-b border-border p-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">
              TalkAdvantage <span className="text-muted-foreground text-lg font-normal">AI Conversation Assistant</span>
            </h1>
            <PrivacyModeIndicator />
          </div>
          <div className="flex items-center gap-4">
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="h-6 w-6" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-sm font-medium">JP</span>
            </div>
          </div>
        </div>
      </header>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}

// Add default export that references the named export
export default DashboardHeader
