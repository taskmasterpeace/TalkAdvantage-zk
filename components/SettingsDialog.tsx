"use client"

import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { usePromptStore, type PromptStore } from "@/lib/prompt-store"

const DEFAULT_PROMPT = `[SYSTEM INSTRUCTIONS – DO NOT MODIFY]
You are an expert active listener and conversation analyst. Read the provided meeting transcript and generate questions suitable for click-to-answer cards.

[QUESTION TYPES – DO NOT MODIFY]
• YES_NO: simple yes/no questions (always use options ["Yes","No"])
• MULTIPLE_CHOICE: questions with 3–4 mutually exclusive options
• MULTIPLE_CHOICE_FILL: like MULTIPLE_CHOICE plus a final "Other" option

[EDITABLE GUIDELINES]
Transcript placeholder: {{TRANSCRIPT}}
Total questions: {{TOTAL_QUESTIONS}}
Number of YES_NO questions: {{YES_NO_COUNT}}
Number of MULTIPLE_CHOICE / MULTIPLE_CHOICE_FILL questions: {{MCQ_COUNT}}

Rules:
1. Generate exactly {{TOTAL_QUESTIONS}} questions.
2. Include exactly {{YES_NO_COUNT}} YES_NO and exactly {{MCQ_COUNT}} MULTIPLE_CHOICE or MULTIPLE_CHOICE_FILL.
3. Questions must be ≤80 characters, context-focused, clarify decisions, or uncover key details.
4. Options must be 1–5 words, non-overlapping, and meaningful.
5. For MULTIPLE_CHOICE_FILL, append an “Other” choice that allows free-form entry.

[OUTPUT FORMAT – DO NOT MODIFY]
Return only a JSON array of objects (no markdown, no commentary), each with:
- id: 1–{{TOTAL_QUESTIONS}}
- type: "YES_NO"|"MULTIPLE_CHOICE"|"MULTIPLE_CHOICE_FILL"
- text: the question
- options: array of strings`

export function SettingsDialog() {
  const prompt = usePromptStore((s: PromptStore) => s.curiosityPrompt)
  const totalQuestions = usePromptStore((s: PromptStore) => s.totalQuestions)
  const yesNoCount = usePromptStore((s: PromptStore) => s.yesNoCount)
  const mcqCount = usePromptStore((s: PromptStore) => s.mcqCount)
  const setPrompt = usePromptStore((s: PromptStore) => s.setCuriosityPrompt)
  const setTotal = usePromptStore((s: PromptStore) => s.setTotalQuestions)
  const setYesNo = usePromptStore((s: PromptStore) => s.setYesNoCount)
  const setMcq = usePromptStore((s: PromptStore) => s.setMcqCount)

  const [draftPrompt, setDraftPrompt] = useState(prompt)
  const [draftTotal, setDraftTotal] = useState(totalQuestions)
  const [draftYesNo, setDraftYesNo] = useState(yesNoCount)
  const [draftMcq, setDraftMcq] = useState(mcqCount)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          ⚙️
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <h3 className="text-lg font-medium mb-2">Curiosity Engine Settings</h3>
        <label className="block mb-1 font-medium">Prompt Template</label>
        <div className="mb-1 text-xs text-muted-foreground">
          This is the full system prompt sent to the AI. Edit carefully to control question generation and output format.
        </div>
        <Textarea
          className="w-full h-40 mb-4 font-mono text-xs"
          value={draftPrompt}
          onChange={(e) => setDraftPrompt(e.target.value)}
        />
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => {
              setPrompt(draftPrompt)
              setTotal(draftTotal)
              setYesNo(draftYesNo)
              setMcq(draftMcq)
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftPrompt(DEFAULT_PROMPT)
            }}
          >
            Restore Default
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftPrompt(prompt)
              setDraftTotal(totalQuestions)
              setDraftYesNo(yesNoCount)
              setDraftMcq(mcqCount)
            }}
          >
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block font-medium">Total Questions</label>
            <input
              type="number"
              className="w-full border rounded p-1"
              value={draftTotal}
              onChange={(e) => setDraftTotal(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-medium">Yes/No Count</label>
            <input
              type="number"
              className="w-full border rounded p-1"
              value={draftYesNo}
              onChange={(e) => setDraftYesNo(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-medium">MCQ Count</label>
            <input
              type="number"
              className="w-full border rounded p-1"
              value={draftMcq}
              onChange={(e) => setDraftMcq(Number(e.target.value))}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
