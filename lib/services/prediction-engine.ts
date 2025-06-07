import { useSettingsStore } from "@/lib/settings-store"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Define the prediction response type
export interface Prediction {
  response: string
  confidence: number
}

export async function generatePredictionsFromAPI(
  goal: string,
  history: string,
  currentInput: string
): Promise<Prediction[]> {
  try {
    const prompt = `Given a conversation goal and history, predict 3-5 likely responses that would effectively progress toward the goal.

Goal: ${goal}

Conversation History:
${history}

Current Input: ${currentInput}

Generate responses that:
1. Are natural and contextually appropriate
2. Progress toward the conversation goal
3. Consider the conversation history
4. Vary in approach and strategy

For each response, provide:
- A natural conversational response
- A confidence score (0-1) indicating how well it aligns with the goal

Output the responses in JSON format like:
[
  {
    "response": "the response text",
    "confidence": 0.85
  }
]`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TalkAdvantage Conversation Compass'
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-opus-20240229",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in conversation planning and guidance. You provide clear, structured responses that help users navigate complex conversations effectively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate predictions');
    }

    const result = await response.json();
    const predictions = JSON.parse(result.choices[0]?.message?.content || '[]');

    return predictions;
  } catch (error) {
    console.error('Error generating predictions:', error);
    return [];
  }
}

export async function evaluateGoalProgress(goal: string, history: string): Promise<number> {
  try {
    const prompt = `Evaluate how well this conversation is progressing toward its goal.

Goal: ${goal}

Conversation History:
${history}

Analyze:
1. Goal alignment of each exchange
2. Forward momentum
3. Depth of engagement
4. Potential blockers

Return a single number between 0 and 1 representing overall progress, where:
0 = No progress / Off track
0.5 = Making progress with room for improvement
1 = Goal achieved effectively`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TalkAdvantage Conversation Compass'
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-opus-20240229",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in evaluating conversation progress. You provide numerical assessments of how well conversations are achieving their goals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to evaluate goal progress');
    }

    const result = await response.json();
    const progressText = result.choices[0]?.message?.content || '0';
    const progress = parseFloat(progressText);

    return isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress));
  } catch (error) {
    console.error('Error evaluating goal progress:', error);
    return 0;
  }
}
