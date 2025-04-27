import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecordingTab from "@/components/recording-tab"
import LibraryTab from "@/components/library-tab"
import DeepAnalysisTab from "@/components/deep-analysis-tab"
import ImportTab from "@/components/import-tab"
import DashboardHeader from "@/components/dashboard-header"
import { MicIcon, BookIcon, SearchIcon, UploadIcon } from "lucide-react"

export const metadata = {
  title: "TalkAdvantage - AI-Enhanced Meeting Assistant",
  description: "Enhance your meetings with AI-powered transcription and analysis",
}

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="container py-6">
        <Tabs defaultValue="recording" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="recording" className="flex items-center gap-2">
              <MicIcon className="h-4 w-4" />
              <span>Recording</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookIcon className="h-4 w-4" />
              <span>Library</span>
            </TabsTrigger>
            <TabsTrigger value="deep-analysis" className="flex items-center gap-2">
              <SearchIcon className="h-4 w-4" />
              <span>Deep Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recording">
            <RecordingTab />
          </TabsContent>

          <TabsContent value="library">
            <LibraryTab />
          </TabsContent>

          <TabsContent value="deep-analysis">
            <DeepAnalysisTab />
          </TabsContent>

          <TabsContent value="import">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
