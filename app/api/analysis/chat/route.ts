import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { weaviateService } from '@/lib/services/weaviate-service';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Input validation schemas
const TranscriptSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  index: z.number().int().min(0)
});

const ChatRequestSchema = z.object({
  question: z.string().optional(),
  transcripts: z.array(TranscriptSchema).optional(),
  action: z.enum(['add', 'remove', 'deleteAll']).optional()
});

const OPENAI_API_KEY = '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';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Storage utility
const STORAGE_FILE = path.join(process.cwd(), 'assistant-storage.json');

interface StorageData {
  assistantId: string | null;
  threadId: string | null;
  transcripts?: { id: string; name: string; text: string }[];
}

interface AssistantWithFiles extends OpenAI.Beta.Assistants.Assistant {
  file_ids: string[];
}

interface AssistantUpdateParams extends OpenAI.Beta.Assistants.AssistantUpdateParams {
  file_ids?: string[];
}

function readStorage(): StorageData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading storage:', error);
  }
  return { assistantId: null, threadId: null };
}

function writeStorage(data: StorageData) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing storage:', error);
  }
}

async function initializeAssistant() {
  try {
    const storage = readStorage();
    
    // If we have a stored assistant ID, verify it exists
    if (storage.assistantId) {
      try {
        const assistant = await openai.beta.assistants.retrieve(storage.assistantId) as AssistantWithFiles;
        console.log('Found existing assistant:', assistant.id);
        return assistant.id;
      } catch (error) {
        console.log('Stored assistant not found, creating new one');
      }
    }
    
    // Create new assistant
    console.log('Creating new assistant...');
    const assistant = await openai.beta.assistants.create({
      name: "Transcript Analysis Assistant",
      instructions: `You are an AI assistant that analyzes and answers questions about provided transcripts. 
      Your primary task is to use the uploaded documents to answer questions accurately.
      Always refer to specific documents by their names when answering.
      If you're not sure about something, say so rather than making assumptions.
      Use the code interpreter tool to analyze the content of the documents when needed.
      Make sure to cite specific parts of the documents in your answers.`,
      model: "gpt-4-turbo-preview",
      tools: [{ type: "code_interpreter" }]
    });
    
    console.log('Created new assistant:', assistant.id);
    writeStorage({ ...storage, assistantId: assistant.id });
    return assistant.id;
  } catch (error) {
    console.error('Error initializing assistant:', error);
    throw error;
  }
}

async function getOrCreateThread() {
  const storage = readStorage();
  
  if (storage.threadId) {
    try {
      // Verify thread exists
      await openai.beta.threads.retrieve(storage.threadId);
      return storage.threadId;
    } catch (error) {
      console.log('Stored thread not found, creating new one');
    }
  }
  
  // Create new thread
  const thread = await openai.beta.threads.create();
  
  // If we have transcripts, send them as the first message
  if (storage.transcripts && storage.transcripts.length > 0) {
    const formattedTranscripts = storage.transcripts.map(t => 
      `Document: ${t.name}\nContent: ${t.text}\n`
    ).join('\n');
    console.log('Formatted transcripts:', formattedTranscripts,"again");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Here are the transcripts to analyze:\n\n${formattedTranscripts}`
    });
  }
  
  writeStorage({ ...storage, threadId: thread.id });
  return thread.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    logger.info('Received chat request', { body });
    
    // Validate input
    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Invalid request format', { errors: validationResult.error.format() });
      return NextResponse.json(
        { error: 'Invalid request format', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { question, transcripts, action } = validationResult.data;

    // Handle adding/removing transcripts
    if (action === 'deleteAll') {
      logger.info('Deleting all transcripts');
      const result = await weaviateService.deleteAllTranscripts();
      return NextResponse.json(result);
    }

    if (transcripts) {
      if (action === 'add') {
        logger.info('Adding transcripts', { count: transcripts.length });
        for (const transcript of transcripts) {
          await weaviateService.addDocument(transcript.name, transcript.text, transcript.index);
        }
        return NextResponse.json({ success: true });
      } else if (action === 'remove') {
        logger.info('Removing transcripts', { count: transcripts.length });
        for (const transcript of transcripts) {
          await weaviateService.removeDocument(transcript.name);
        }
        return NextResponse.json({ success: true });
      }
    }

    // Handle chat question
    if (question) {
      logger.info('Processing chat question', { question });
      
      // Search for relevant context
      const searchResults = await weaviateService.search(question);
      logger.debug('Search results', { count: searchResults.length });
      
      // Prepare context from search results
      const context = searchResults.map((result: any) => {
        // Only include the most relevant chunks for each document
        const relevantChunks = result.chunks
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .slice(0, 2) // Take top 2 most relevant chunks
          .map((c: any) => c.text);
        
        return `From ${result.name}:\n${relevantChunks.join('\n')}`;
      }).join('\n\n');

      const activeTranscripts = searchResults.map((result: any) => result.name);
console.log(context,"context")
      // Create system message with context
      const systemMessage = `You are an AI assistant analyzing transcripts. Use the following context from the transcripts to answer the question. If the context doesn't contain relevant information, say so.

Context:
${context}`;

      // Get response from OpenRouter using Mistral-7B
      logger.info('Sending request to OpenRouter');
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "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"}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://talkadvantage.com",
          "X-Title": "TalkAdvantage"
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct",
          messages: [
            {
              role: "system",
              content: systemMessage
            },
            {
              role: "user",
              content: question
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const answer = data.choices[0].message.content;

      return NextResponse.json({
        answer,
        activeTranscripts,
        context
      });
    }

    return NextResponse.json({ error: 'No question or action provided' }, { status: 400 });
  } catch (error) {
    logger.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 