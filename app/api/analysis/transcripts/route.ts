import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CHUNK_SIZE = 450; // Number of words per chunk

// Function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  console.log(`Total words in text: ${words.length}`);
  console.log(`Using chunk size: ${chunkSize} words`);
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    console.log(`Created chunk ${chunks.length}: ${chunk.length} characters, ${chunk.split(/\s+/).length} words`);
  }
  
  console.log(`Split text into ${chunks.length} chunks of size ${chunkSize}`);
  console.log('First chunk preview:', chunks[0]?.substring(0, 100) + '...');
  console.log('Last chunk preview:', chunks[chunks.length - 1]?.substring(0, 100) + '...');
  
  return chunks;
}

async function callOpenRouter(prompt: string) {
  console.log(prompt,"prompt")
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "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"}`,
    },
    body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
      messages: [
        { role: 'system', content: 'You are an AI assistant specialized in transcripts analysis and their relationship.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Function to analyze a single chunk
async function analyzeChunk(chunk: string, chunkIndex: number, totalChunks: number) {
  console.log(`Analyzing chunk ${chunkIndex + 1}/${totalChunks}`);
  const summaryPrompt = `Summarize the following transcript chunk (${chunkIndex + 1}/${totalChunks}):\n\n${chunk}`;
  const sentimentPrompt = `Analyze the sentiment of the following transcript chunk (${chunkIndex + 1}/${totalChunks}). Respond with only one word (Positive, Negative, or Neutral) and a percentage score (0-100) for confidence. Example: Positive (87%)\n\n${chunk}`;
  
  const [summary, sentimentRaw] = await Promise.all([
    callOpenRouter(summaryPrompt),
    callOpenRouter(sentimentPrompt),
  ]);

  console.log(`Chunk ${chunkIndex + 1} analysis complete:`, {
    summaryLength: summary.length,
    sentiment: sentimentRaw
  });

  // Parse sentiment and confidence
  let sentiment = sentimentRaw;
  let confidence = null;
  const match = sentimentRaw.match(/(Positive|Negative|Neutral)\s*\(?([0-9]{1,3})%?\)?/i);
  if (match) {
    sentiment = match[1];
    confidence = parseInt(match[2], 10);
  }

  return {
    summary,
    sentiment,
    confidence,
    sentimentRaw,
  };
}

// Function to combine chunk analyses
function combineChunkAnalyses(chunkAnalyses: any[]) {
  console.log('Combining analyses from', chunkAnalyses.length, 'chunks');
  
  // Combine summaries
  const combinedSummary = chunkAnalyses.map(c => c.summary).join('\n\n');
  
  // Calculate weighted average sentiment
  let totalConfidence = 0;
  let weightedSentiment = 0;
  
  const sentimentValues = {
    'Positive': 1,
    'Neutral': 0,
    'Negative': -1
  };
  
  chunkAnalyses.forEach((analysis, index) => {
    if (analysis.confidence !== null) {
      const sentimentValue = sentimentValues[analysis.sentiment as keyof typeof sentimentValues] || 0;
      weightedSentiment += sentimentValue * analysis.confidence;
      totalConfidence += analysis.confidence;
      console.log(`Chunk ${index + 1} sentiment:`, {
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        weightedValue: sentimentValue * analysis.confidence
      });
    }
  });
  
  const averageSentiment = totalConfidence > 0 ? weightedSentiment / totalConfidence : 0;
  let finalSentiment = 'Neutral';
  let finalConfidence = Math.round(totalConfidence / chunkAnalyses.length);
  
  if (averageSentiment > 0.3) {
    finalSentiment = 'Positive';
  } else if (averageSentiment < -0.3) {
    finalSentiment = 'Negative';
  }
  
  console.log('Final combined analysis:', {
    finalSentiment,
    finalConfidence,
    averageSentiment,
    totalChunks: chunkAnalyses.length
  });
  
  return {
    summary: combinedSummary,
    sentiment: finalSentiment,
    confidence: finalConfidence,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { transcripts } = await req.json();
    if (!Array.isArray(transcripts) || transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts provided' }, { status: 400 });
    }

    console.log(`Processing ${transcripts.length} transcripts`);

    // Process each transcript in chunks
    const results = await Promise.all(transcripts.map(async (t: { name: string, text: string }) => {
      console.log(`\nProcessing transcript: ${t.name}`);
      console.log(`Transcript length: ${t.text.length} characters`);
      
      // Split transcript into chunks
      const chunks = splitIntoChunks(t.text);
      console.log(`Created ${chunks.length} chunks for transcript: ${t.name}`);
      
      // Analyze each chunk
      const chunkAnalyses = await Promise.all(
        chunks.map((chunk, index) => analyzeChunk(chunk, index, chunks.length))
      );
      
      // Combine chunk analyses
      const combinedAnalysis = combineChunkAnalyses(chunkAnalyses);
      
      return {
        name: t.name,
        ...combinedAnalysis,
        chunkCount: chunks.length,
      };
    }));

    // For relation analysis, use the first chunk of each transcript to avoid token limits
    const firstChunks = transcripts.map(t => splitIntoChunks(t.text)[0]);
    console.log('Performing relation analysis on first chunks');
    const relationPrompt = `Given these transcript chunks:\n${firstChunks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nWhat is common between them? What is different? If there is no relation, state that.`;
    const relation = await callOpenRouter(relationPrompt);

    return NextResponse.json({ results, relation });
  } catch (error) {
    console.error('Error in transcript analysis API:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 