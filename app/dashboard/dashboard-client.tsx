"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Mic, BookOpen, Upload, Brain } from "lucide-react"

// Use dynamic imports with ssr: false to avoid window is not defined errors
const RecordingTab = dynamic(() => import("@/components/recording-tab"), {
  ssr: false,
  loading: () => <TabContentSkeleton />,
})

// Fix for chunk loading error - adding webpack chunk name
const LibraryTab = dynamic(() => import(/* webpackChunkName: "library-tab" */ "@/components/library-tab"), {
  ssr: false,
  loading: () => <TabContentSkeleton />,
})

const ImportTab = dynamic(() => import("@/components/import-tab"), {
  ssr: false,
  loading: () => <TabContentSkeleton />,
})

const DeepAnalysisTab = dynamic(() => import("@/components/deep-analysis-tab"), {
  ssr: false,
  loading: () => <TabContentSkeleton />,
})

function TabContentSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full max-w-sm" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("record")

  // Only render the client component after mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)

    // Add event listener for tab switching
    const handleTabSwitch = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switchTab', handleTabSwitch as EventListener);
    return () => {
      window.removeEventListener('switchTab', handleTabSwitch as EventListener);
    };
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="h-16 border-b bg-background"></div>
        <main className="flex-1 p-4 md:p-6">
          <Card className="border-none shadow-none">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-64 w-full" />
            </div>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6">
        <Card className="border-none shadow-none">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-1 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
              <TabsTrigger 
                value="record"
                className="data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-1.5">
                  <Mic className="h-4 w-4" />
                  Record
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="library"
                className="data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  Library
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="import"
                className="data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  Import
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="analysis"
                className="data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  Analysis
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Keep RecordingTab always mounted but hidden when not active */}
            <div className={activeTab === "record" ? "" : "hidden"}>
              <RecordingTab />
            </div>

            <TabsContent value="library" className="mt-0">
              <LibraryTab />
            </TabsContent>
            <TabsContent value="import" className="mt-0">
              <ImportTab />
            </TabsContent>
            <TabsContent value="analysis" className="mt-0">
              <DeepAnalysisTab />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  )
}
