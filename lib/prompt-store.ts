import create from 'zustand'

export interface PromptStore {
  curiosityPrompt: string
  totalQuestions: number
  yesNoCount: number
  mcqCount: number
  setCuriosityPrompt: (p: string) => void
  setTotalQuestions: (n: number) => void
  setYesNoCount: (n: number) => void
  setMcqCount: (n: number) => void
}

export const usePromptStore = create<PromptStore>((set) => ({
  curiosityPrompt: `[SYSTEM INSTRUCTIONS – DO NOT MODIFY]
You are an expert active listener and conversation analyst. Read the provided  transcript and generate questions suitable for click-to-answer cards.

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
- options: array of strings`,
  totalQuestions: 5,
  yesNoCount: 2,
  mcqCount: 3,
  setCuriosityPrompt: (p) => set({ curiosityPrompt: p }),
  setTotalQuestions: (n) => set({ totalQuestions: n }),
  setYesNoCount: (n) => set({ yesNoCount: n }),
  setMcqCount: (n) => set({ mcqCount: n }),
}))
