import { NextResponse } from 'next/server';
import { 
  GOAL_REFINEMENT_PROMPT,
  GRAPH_GENERATOR_PROMPT,
  EXPRESS_MODE_PROMPT,
  PERSONA_SUMMARIZER_PROMPT,
  GUIDED_MODE_EXPANDER_PROMPT,
  formatPrompt
} from '@/lib/prompts/conversation-compass-prompts';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const { type, context } = await req.json();

    if (!type || !context) {
      return NextResponse.json(
        { error: 'Please provide prompt type and context' },
        { status: 400 }
      );
    }

    // Select the appropriate prompt based on type
    let prompt: string;
    let temperature = 0.7;

    switch (type) {
      case 'refine-goal':
        prompt = formatPrompt(GOAL_REFINEMENT_PROMPT, context);
        temperature = 0.7;
        break;
      case 'generate-graph':
        prompt = formatPrompt(GRAPH_GENERATOR_PROMPT, context);
        temperature = 0.8;
        break;
      case 'express-mode':
        prompt = formatPrompt(EXPRESS_MODE_PROMPT, context);
        temperature = 0.7;
        break;
      case 'summarize-persona':
        prompt = formatPrompt(PERSONA_SUMMARIZER_PROMPT, context);
        temperature = 0.6;
        break;
      case 'expand-talking-points':
        prompt = formatPrompt(GUIDED_MODE_EXPANDER_PROMPT, context);
        temperature = 0.8;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid prompt type' },
          { status: 400 }
        );
    }

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
        temperature: temperature,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'OpenRouter API request failed');
    }

    const result = await response.json();
    const aiResponse = result.choices[0]?.message?.content || '';

    // For graph generation and express mode, try to parse JSON
    if (type === 'generate-graph' || type === 'express-mode') {
      try {
        const jsonResponse = JSON.parse(aiResponse);
        return NextResponse.json({ data: jsonResponse });
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        return NextResponse.json(
          { error: 'Failed to parse AI response as JSON' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ text: aiResponse });
  } catch (error: any) {
    console.error(`Error with OpenRouter API request: ${error.message}`);
    return NextResponse.json(
      { error: 'An error occurred during your request.' },
      { status: 500 }
    );
  }
} 