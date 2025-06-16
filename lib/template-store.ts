import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Bookmark {
  name: string
  bookmark_type: string
  key_shortcut: string
  voice_trigger: string
  content: string
  description: string
  is_user_speaking: boolean
  is_decision_point: boolean
  is_action_item: boolean
}

export interface Visualization {
  default_layout: string
  node_color_scheme: string
  highlight_decisions: boolean
  highlight_questions: boolean
  expand_level: number
}

export interface AnalyticsProfile {
  name: string
  description: string
  system_prompt: string
  user_prompt: string
  template_prompt: string
  curiosity_prompt?: string
  conversation_mode?: string
  version: number
  visualization: {
    default_layout: string
    node_color_scheme: string
    highlight_decisions: boolean
    highlight_questions: boolean
    expand_level: number
  }
  settings?: {
    model: string
    [key: string]: any
  }
  bookmarks?: Array<{
    name: string
    bookmark_type: string
    key_shortcut: string
    voice_trigger: string
    content: string
    description: string
    is_user_speaking: boolean
    is_decision_point: boolean
    is_action_item: boolean
  }>
  advanced?: {
    curiosity_engine_prompt: string
    // Add other advanced fields as needed
  }
}

interface TemplateState {
  templates: AnalyticsProfile[]
  activeTemplate: string

  // Actions
  addTemplate: (template: AnalyticsProfile) => void
  updateTemplate: (name: string, template: Partial<AnalyticsProfile>) => void
  deleteTemplate: (name: string) => void
  setActiveTemplate: (name: string) => void
  loadDefaultTemplates: () => void
}

// Default templates
const DEFAULT_TEMPLATES: AnalyticsProfile[] = [
  {
    name: "*Full Analysis",
    description: "Complete analysis of the entire conversation",
    user_prompt: "Analyze the complete transcript to provide a comprehensive understanding.",
    system_prompt:
      "You are an AI assistant performing comprehensive conversation analysis. Your role is to:\n1. Analyze the entire conversation context\n2. Identify key themes, decisions, and action items\n3. Track participant contributions and commitments\n4. Highlight important connections and insights\n5. Maintain a professional and thorough analysis style",
    template_prompt:
      "Please provide a thorough analysis of the entire conversation:\n\n1. Overall Summary\n   - Main topics and themes\n   - Key narrative flow\n   - Important context\n\n2. Key Elements\n   - Critical decisions made\n   - Action items and assignments\n   - Questions raised and answers provided\n   - Important dates or deadlines mentioned\n\n3. Participant Analysis\n   - Key contributions\n   - Responsibilities assigned\n   - Follow-up commitments\n\n4. Next Steps\n   - Immediate actions required\n   - Scheduled follow-ups\n   - Open items requiring attention\n\n5. Additional Insights\n   - Potential challenges identified\n   - Opportunities highlighted\n   - Important connections between topics",
    bookmarks: [
      {
        name: "New Topic",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+1",
        voice_trigger: "new topic",
        content: "=== New Topic ===",
        description: "Mark the start of a new discussion topic",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: false,
      },
      {
        name: "Decision Made",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+2",
        voice_trigger: "mark decision",
        content: "[DECISION]",
        description: "Mark an important decision point",
        is_user_speaking: false,
        is_decision_point: true,
        is_action_item: false,
      },
      {
        name: "Action Item",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+3",
        voice_trigger: "action item",
        content: "[ACTION]",
        description: "Mark an assigned task or action item",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: true,
      },
      {
        name: "User Speaking",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+U",
        voice_trigger: "me speaking",
        content: "[USER]",
        description: "Mark when the user is speaking",
        is_user_speaking: true,
        is_decision_point: false,
        is_action_item: false,
      },
    ],
    curiosity_prompt:
      '[SYSTEM INSTRUCTIONS - DO NOT MODIFY THIS SECTION]\nYou are an expert active listener analyzing meeting transcripts. \nGenerate 2-3 insightful questions that would help understand the context better.\n\n[QUESTION TYPES - DO NOT MODIFY THESE TYPES]\nQuestion types:\n- YES_NO: Simple yes/no questions\n- MULTIPLE_CHOICE: Questions with predefined options (provide 3-4 choices)\n- MULTIPLE_CHOICE_FILL: Multiple choice with an "other" option (provide 3-4 choices)\n- SPEAKER_IDENTIFICATION: Questions about who said specific statements\n- MEETING_TYPE: Questions about the type of meeting/conversation\n\n[CUSTOMIZABLE GUIDELINES - YOU CAN MODIFY THIS SECTION]\nGenerate questions that:\n- Are relevant to the transcript content\n- Help clarify important points\n- Uncover underlying context\n- Are concise and clear\n- Have meaningful multiple choice options when applicable\n\n[OUTPUT FORMAT - DO NOT MODIFY THIS SECTION]\nReturn a JSON array of questions in the following format:\n[\n  {\n    "type": "QUESTION_TYPE",\n    "text": "The question text",\n    "options": ["Option 1", "Option 2", "Option 3"] // Only for MULTIPLE_CHOICE and MULTIPLE_CHOICE_FILL types\n  }\n]\n\n[REQUIRED STRUCTURE - DO NOT MODIFY THIS SECTION]\nYou MUST return a valid JSON array of questions. Do not include any other text or explanation. The response must be a valid JSON array with this exact structure:\n[\n  {\n    "id": "q1",\n    "text": "The question text",\n    "type": "yes_no|multiple_choice|multiple_choice_fill|speaker_identification|meeting_type",\n    "options": ["Option 1", "Option 2", "Option 3"] // Only for multiple_choice and multiple_choice_fill types\n  }\n]',
    conversation_mode: "tracking",
    visualization: {
      default_layout: "radial",
      node_color_scheme: "default",
      highlight_decisions: true,
      highlight_questions: true,
      expand_level: 1,
    },
    version: 2,
  },
  {
    name: "*Meeting Summary",
    description: "Concise summary of key meeting points",
    user_prompt: "Summarize the key points from this meeting.",
    system_prompt:
      "You are an AI assistant specializing in meeting summaries. Your role is to:\n1. Extract the most important information from meeting transcripts\n2. Identify decisions, action items, and responsibilities\n3. Create clear, concise summaries that capture essential details\n4. Organize information in a business-friendly format\n5. Maintain a professional, direct communication style",
    template_prompt:
      "Please provide a concise summary of this meeting:\n\n1. Meeting Overview\n   - Main purpose and topics\n   - Key participants\n   - Overall context\n\n2. Decisions Made\n   - List all decisions finalized during the meeting\n   - Note any pending decisions requiring follow-up\n\n3. Action Items\n   - Tasks assigned during the meeting\n   - Person responsible for each task\n   - Deadlines or timeframes mentioned\n\n4. Follow-up Required\n   - Items needing additional discussion\n   - Scheduled follow-up meetings\n   - Outstanding questions or concerns",
    bookmarks: [
      {
        name: "Decision",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+D",
        voice_trigger: "decision",
        content: "[DECISION]",
        description: "Mark an important decision",
        is_user_speaking: false,
        is_decision_point: true,
        is_action_item: false,
      },
      {
        name: "Action Item",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+A",
        voice_trigger: "action",
        content: "[ACTION]",
        description: "Mark an action item",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: true,
      },
      {
        name: "Follow-up",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+F",
        voice_trigger: "follow up",
        content: "[FOLLOW-UP]",
        description: "Mark an item needing follow-up",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: false,
      },
    ],
    curiosity_prompt:
      '[SYSTEM INSTRUCTIONS - DO NOT MODIFY THIS SECTION]\nYou are an expert meeting facilitator analyzing meeting transcripts. \nGenerate 2-3 insightful questions that would help clarify meeting outcomes.\n\n[QUESTION TYPES - DO NOT MODIFY THESE TYPES]\nQuestion types:\n- YES_NO: Simple yes/no questions\n- MULTIPLE_CHOICE: Questions with predefined options (provide 3-4 choices)\n- MULTIPLE_CHOICE_FILL: Multiple choice with an "other" option (provide 3-4 choices)\n- SPEAKER_IDENTIFICATION: Questions about who said specific statements\n- MEETING_TYPE: Questions about the type of meeting/conversation\n\n[CUSTOMIZABLE GUIDELINES - YOU CAN MODIFY THIS SECTION]\nGenerate questions that:\n- Focus on action items and decisions\n- Clarify responsibilities and deadlines\n- Identify potential blockers or risks\n- Are business-oriented and practical\n- Have meaningful multiple choice options when applicable\n\n[OUTPUT FORMAT - DO NOT MODIFY THIS SECTION]\nReturn a JSON array of questions in the following format:\n[\n  {\n    "type": "QUESTION_TYPE",\n    "text": "The question text",\n    "options": ["Option 1", "Option 2", "Option 3"] // Only for MULTIPLE_CHOICE and MULTIPLE_CHOICE_FILL types\n  }\n]',
    conversation_mode: "tracking",
    visualization: {
      default_layout: "flow",
      node_color_scheme: "business",
      highlight_decisions: true,
      highlight_questions: false,
      expand_level: 2,
    },
    version: 2,
  },
  {
    name: "*Interview Analysis",
    description: "Analysis focused on interview conversations",
    user_prompt: "Analyze this interview transcript to extract key insights.",
    system_prompt:
      "You are an AI assistant specializing in interview analysis. Your role is to:\n1. Identify key qualifications and experiences discussed\n2. Extract candidate strengths and potential areas of concern\n3. Highlight notable responses to important questions\n4. Assess cultural fit indicators\n5. Maintain an objective, balanced assessment style",
    template_prompt:
      "Please analyze this interview transcript:\n\n1. Candidate Overview\n   - Key qualifications and background\n   - Relevant experience highlighted\n   - Education and certifications mentioned\n\n2. Technical Assessment\n   - Technical skills demonstrated\n   - Knowledge gaps identified\n   - Problem-solving approach\n\n3. Behavioral Insights\n   - Communication style and clarity\n   - Examples of past performance\n   - Teamwork and collaboration indicators\n\n4. Cultural Fit\n   - Alignment with company values\n   - Work style preferences\n   - Career goals and aspirations\n\n5. Overall Impression\n   - Key strengths\n   - Potential concerns\n   - Recommended follow-up questions",
    bookmarks: [
      {
        name: "Strong Answer",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+S",
        voice_trigger: "strong answer",
        content: "[STRONG]",
        description: "Mark a particularly strong response",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: false,
      },
      {
        name: "Concern",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+C",
        voice_trigger: "concern",
        content: "[CONCERN]",
        description: "Mark an area of concern",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: false,
      },
      {
        name: "Follow-up",
        bookmark_type: "marker",
        key_shortcut: "Ctrl+F",
        voice_trigger: "follow up",
        content: "[FOLLOW-UP]",
        description: "Mark a topic needing follow-up",
        is_user_speaking: false,
        is_decision_point: false,
        is_action_item: false,
      },
    ],
    curiosity_prompt:
      '[SYSTEM INSTRUCTIONS - DO NOT MODIFY THIS SECTION]\nYou are an expert interviewer analyzing interview transcripts. \nGenerate 2-3 insightful questions that would help assess the candidate better.\n\n[QUESTION TYPES - DO NOT MODIFY THESE TYPES]\nQuestion types:\n- YES_NO: Simple yes/no questions\n- MULTIPLE_CHOICE: Questions with predefined options (provide 3-4 choices)\n- MULTIPLE_CHOICE_FILL: Multiple choice with an "other" option (provide 3-4 choices)\n- SPEAKER_IDENTIFICATION: Questions about who said specific statements\n- MEETING_TYPE: Questions about the type of meeting/conversation\n\n[CUSTOMIZABLE GUIDELINES - YOU CAN MODIFY THIS SECTION]\nGenerate questions that:\n- Probe deeper into candidate qualifications\n- Assess cultural fit and work style\n- Clarify potential concerns or gaps\n- Are interview-appropriate and professional\n- Have meaningful multiple choice options when applicable\n\n[OUTPUT FORMAT - DO NOT MODIFY THIS SECTION]\nReturn a JSON array of questions in the following format:\n[\n  {\n    "type": "QUESTION_TYPE",\n    "text": "The question text",\n    "options": ["Option 1", "Option 2", "Option 3"] // Only for MULTIPLE_CHOICE and MULTIPLE_CHOICE_FILL types\n  }\n]',
    conversation_mode: "guided",
    visualization: {
      default_layout: "flow",
      node_color_scheme: "professional",
      highlight_decisions: false,
      highlight_questions: true,
      expand_level: 1,
    },
    version: 2,
  },
]

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES,
      activeTemplate: "*Meeting Summary",

      addTemplate: (template) => {
        // Ensure the template has a unique name
        const existingTemplate = get().templates.find((t) => t.name === template.name)
        if (existingTemplate) {
          let counter = 1
          let newName = `${template.name} (${counter})`
          while (get().templates.find((t) => t.name === newName)) {
            counter++
            newName = `${template.name} (${counter})`
          }
          template.name = newName
        }

        set((state) => ({
          templates: [...state.templates, template],
          activeTemplate: template.name,
        }))
      },

      updateTemplate: (name, updates) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.name === name ? { ...t, ...updates } : t)),
          activeTemplate: updates.name && state.activeTemplate === name ? updates.name : state.activeTemplate,
        })),

      deleteTemplate: (name) => {
        // Don't allow deletion of built-in templates (those starting with *)
        if (name.startsWith("*")) {
          console.warn("Cannot delete built-in template:", name)
          return
        }

        set((state) => ({
          templates: state.templates.filter((t) => t.name !== name),
          activeTemplate: state.activeTemplate === name ? "*Meeting Summary" : state.activeTemplate,
        }))
      },

      setActiveTemplate: (name) => set({ activeTemplate: name }),

      loadDefaultTemplates: () => {
        const currentTemplates = get().templates
        // Only add default templates that don't already exist
        const defaultsToAdd = DEFAULT_TEMPLATES.filter(
          (defaultTemplate) =>
            !currentTemplates.some((t) => t.name === defaultTemplate.name)
        )
        
        if (defaultsToAdd.length > 0) {
          set((state) => ({
            templates: [...state.templates, ...defaultsToAdd],
          }))
        }
      },
    }),
    {
      name: "talkadvantage-templates",
      version: 2, // Increment version to force rehydration
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          try {
            const data = JSON.parse(str)
            // Ensure we always have default templates
            if (!data.state.templates.some((t: any) => t.name === "*Meeting Summary")) {
              data.state.templates = [...data.state.templates, ...DEFAULT_TEMPLATES]
            }
            return data
          } catch (e) {
            console.error("Error parsing templates from storage:", e)
            return null
          }
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
