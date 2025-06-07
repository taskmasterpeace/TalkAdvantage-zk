import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
});

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error getting batch embeddings:', error);
    throw error;
  }
} 