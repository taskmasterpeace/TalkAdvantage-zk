import {
  ContextPack,
  GraphOutput,
  formatPrompt,
  GOAL_REFINEMENT_PROMPT,
  GRAPH_GENERATOR_PROMPT,
  EXPRESS_MODE_PROMPT,
  PERSONA_SUMMARIZER_PROMPT,
  GUIDED_MODE_EXPANDER_PROMPT,
} from '../prompts/conversation-compass-prompts';

// Helper function to make API calls
async function callCompassAPI(type: string, context: any) {
  try {
    const response = await fetch('/api/ai/compass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Compass API:', error);
    throw error;
  }
}

// Goal refinement service
export async function refineGoal(goal: string): Promise<string[]> {
  try {
    const response = await callCompassAPI('refine-goal', { goal });
    const suggestions = response.text.split('\n').filter(Boolean);
    return suggestions;
  } catch (error) {
    console.error('Error refining goal:', error);
    throw error;
  }
}

// Graph generation service
export async function generateConversationGraph(context: ContextPack): Promise<GraphOutput> {
  try {
    const response = await callCompassAPI('generate-graph', context);
    return response.data;
  } catch (error) {
    console.error('Error generating conversation graph:', error);
    throw error;
  }
}

// Express mode service
export async function generateExpressContext(input: {
  goal: string;
  userRole: string;
  counterpartRole: string;
}): Promise<ContextPack> {
  try {
    const response = await callCompassAPI('express-mode', input);
    return response.data;
  } catch (error) {
    console.error('Error generating express context:', error);
    throw error;
  }
}

// Persona summarization service
export async function summarizePersona(input: string): Promise<string> {
  try {
    const response = await callCompassAPI('summarize-persona', { input });
    return response.text;
  } catch (error) {
    console.error('Error summarizing persona:', error);
    throw error;
  }
}

// Talking points expansion service
export async function expandTalkingPoints(statement: string): Promise<string[]> {
  try {
    const response = await callCompassAPI('expand-talking-points', { statement });
    const points = response.text.split('\n').filter(Boolean);
    return points;
  } catch (error) {
    console.error('Error expanding talking points:', error);
    throw error;
  }
}

// Prediction engine service
export async function evaluateGoalProgress(goal: string, history: string): Promise<number> {
  try {
    const response = await callCompassAPI('evaluate-progress', { goal, history });
    return parseFloat(response.text);
  } catch (error) {
    console.error('Error evaluating goal progress:', error);
    throw error;
  }
}

// Additional helper functions for the Conversation Compass
export function calculateGoalProximity(currentNode: string, targetNode: string, graph: GraphOutput): number {
  // Implementation of goal proximity calculation using graph traversal
  // This is a placeholder - actual implementation would use path finding algorithms
  return 0;
}

export function suggestNextNodes(currentNode: string, graph: GraphOutput): string[] {
  // Find all possible next nodes from the current node
  return graph.edges
    .filter(edge => edge.from === currentNode)
    .map(edge => edge.to);
}

export function findOptimalPath(
  currentNode: string,
  targetNode: string,
  graph: GraphOutput
): { path: string[]; confidence: number } {
  // Implementation of path finding between nodes
  // This is a placeholder - actual implementation would use path finding algorithms
  return {
    path: [],
    confidence: 0
  };
} 