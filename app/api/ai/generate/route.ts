import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { prompt, temperature = 0.7 } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please provide a prompt' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
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
    });

    const response = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ text: response });
  } catch (error: any) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json(
        { error: error.response.data },
        { status: error.response.status }
      );
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json(
        { error: 'An error occurred during your request.' },
        { status: 500 }
      );
    }
  }
}
