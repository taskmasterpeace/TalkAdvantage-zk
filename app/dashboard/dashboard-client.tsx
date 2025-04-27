"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Use dynamic imports with ssr: false to avoid window is not defined errors
const RecordingTab = dynamic(() => import("@/components/recording-tab"), {
  ssr: false,
  loading: () => <TabContentSkeleton />,
})

const LibraryTab = dynamic(() => import("@/components/library-tab"), {
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
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="record">Record</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="record" className="mt-0">
              <RecordingTab />
            </TabsContent>
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
