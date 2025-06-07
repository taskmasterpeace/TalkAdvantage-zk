// Types for prompt inputs and outputs
export interface ContextPack {
  goal: string;
  userPersona?: string;
  counterpartPersona?: string;
  domain?: string;
  tone?: string;
  constraints?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  expandedTalkingPoints: string[];
  intent: 'intro' | 'explore' | 'respond' | 'pivot' | 'close';
  goalProximity: number; // 0-100
}

export interface GraphEdge {
  from: string;
  to: string;
  trigger: string;
  sentiment?: string;
}

export interface GraphOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Helper function to format prompts with context
export function formatPrompt(template: string, context: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || '');
}

// Goal Refinement Prompt
export const GOAL_REFINEMENT_PROMPT = `You are an AI assistant that helps improve vague or unclear conversation goals.

Given Goal: {goal}

Instructions:
1. Analyze if this goal is too broad, passive, or non-specific
2. If it needs improvement, suggest 3-5 refined alternatives that:
   - Use action verbs
   - Include measurable or observable outcomes
   - Are phrased naturally and conversationally
   - Consider the domain context: {domain}
   - Account for the personas involved:
     * User: {userPersona}
     * Counterpart: {counterpartPersona}

If the goal is already clear and actionable, respond with:
"The goal is clear and can be used as-is."

Otherwise, provide numbered alternatives, one per line.`;

// Graph Generator Prompt
export const GRAPH_GENERATOR_PROMPT = `Generate a structured conversation flow as a directed graph.

Context:
- Goal: {goal}
- User Persona: {userPersona}
- Counterpart Persona: {counterpartPersona}
- Domain: {domain}
- Tone: {tone}
- Constraints: {constraints}

Instructions:
1. Create 6-10 conversation nodes that:
   - Progress naturally toward the goal
   - Include diverse intents (intro, explore, respond, pivot, close)
   - Have clear talking points
   - Consider emotional dynamics

2. For each node, specify:
   - A natural conversational statement/question
   - 3-4 expanded talking points
   - The conversational intent
   - Goal proximity (0-100)

3. Create edges between nodes that:
   - Show natural conversation flow
   - Include transition triggers
   - Note emotional/sentiment shifts

Output the result as a JSON object matching the GraphOutput interface with nodes and edges arrays.`;

// Express Mode Prompt
export const EXPRESS_MODE_PROMPT = `Help me quickly understand the key aspects of this conversation.

Goal: {goal}
User Role: {userRole}
Counterpart Role: {counterpartRole}

Guide me through 2-3 quick questions to establish:
1. Core objectives
2. Key constraints
3. Success criteria

Based on the responses, compose a lightweight context pack that includes:
- Refined goal
- Relevant persona details
- Domain-specific considerations
- Suggested tone
- Critical constraints

Output the result as a JSON object matching the ContextPack interface.`;

// Persona Summarizer Prompt
export const PERSONA_SUMMARIZER_PROMPT = `Convert this detailed input into a concise, conversational persona summary.

Input: {input}

Instructions:
1. Extract key professional traits and experience
2. Identify communication style and preferences
3. Note relevant domain expertise
4. Remove corporate jargon and buzzwords

Create a 2-3 sentence summary that:
- Uses natural, conversational language
- Highlights what's most relevant for conversation
- Maintains professionalism while being approachable
- Focuses on interaction style and expertise`;

// Guided Mode Expander Prompt
export const GUIDED_MODE_EXPANDER_PROMPT = `Analyze this conversation statement and provide intelligent expansions.

Statement: {statement}

Generate 4-6 talking points that:
1. Deepen the conversation naturally
2. Explore underlying assumptions
3. Connect to broader context
4. Offer concrete examples or analogies

For each point:
- Keep the tone consistent
- Add fresh insights
- Maintain conversational flow
- Support the overall goal

Format each point as a clear, actionable statement on a new line.`;

// Progress Evaluation Prompt
export const PROGRESS_EVALUATION_PROMPT = `Evaluate the conversation progress toward the stated goal.

Goal: {goal}

Conversation History:
{history}

Analyze:
1. Goal alignment of each exchange
2. Forward momentum
3. Depth of engagement
4. Potential blockers

Return a single number between 0 and 1 representing overall progress, where:
0 = No progress / Off track
0.5 = Making progress with room for improvement
1 = Goal achieved effectively`; 