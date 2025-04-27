"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AnalysisResult {
  id: string
  recording_id: string
  profile_id: string | null
  summary: string | null
  key_points: any[] | null
  action_items: any[] | null
  decisions_made: any[] | null
  follow_up_required: any[] | null
  raw_analysis: string | null
  analytics_profiles: {
    name: string
  } | null
}

interface AnalysisResultsProps {
  analysis: AnalysisResult
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Analysis Results</CardTitle>
          {analysis.analytics_profiles && (
            <div className="text-sm text-muted-foreground">Profile: {analysis.analytics_profiles.name}</div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {analysis.summary && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Summary</h3>
            <p>{analysis.summary}</p>
          </div>
        )}

        <Tabs defaultValue="key-points">
          <TabsList>
            <TabsTrigger value="key-points">Key Points</TabsTrigger>
            <TabsTrigger value="action-items">Action Items</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="key-points" className="mt-4">
            {analysis.key_points && analysis.key_points.length > 0 ? (
              <ul className="space-y-2 list-disc pl-5">
                {analysis.key_points.map((point, index) => (
                  <li key={index}>{point.point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No key points identified</p>
            )}
          </TabsContent>

          <TabsContent value="action-items" className="mt-4">
            {analysis.action_items && analysis.action_items.length > 0 ? (
              <ul className="space-y-2">
                {analysis.action_items.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p>{item.item}</p>
                      {item.assignee && <p className="text-sm text-muted-foreground">Assignee: {item.assignee}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No action items identified</p>
            )}
          </TabsContent>

          <TabsContent value="decisions" className="mt-4">
            {analysis.decisions_made && analysis.decisions_made.length > 0 ? (
              <ul className="space-y-2 list-disc pl-5">
                {analysis.decisions_made.map((decision, index) => (
                  <li key={index}>{decision.decision}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No decisions identified</p>
            )}
          </TabsContent>

          <TabsContent value="follow-up" className="mt-4">
            {analysis.follow_up_required && analysis.follow_up_required.length > 0 ? (
              <ul className="space-y-2 list-disc pl-5">
                {analysis.follow_up_required.map((item, index) => (
                  <li key={index}>{item.item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No follow-up items identified</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
