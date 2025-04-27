"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import SettingsModal from "./settings-modal"

export function DashboardHeader() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <header className="border-b border-border p-4">
        <div className="container flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">
            TalkAdvantage <span className="text-muted-foreground text-lg font-normal">AI Conversation Assistant</span>
          </h1>
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
