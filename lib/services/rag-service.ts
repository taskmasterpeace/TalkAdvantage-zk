import { knowledgeGraphService } from './knowledge-graph-service';

interface RAGContext {
  content: string;
  name: string;
  tags?: string[];
  chunkIndex: number;
  userId: string;
  contextPackId: string;
  createdAt: Date;
}

export class RAGService {
  async getRelevantContext(query: string, userId: string, limit: number = 5): Promise<RAGContext[]> {
    try {
      // Search for relevant document chunks with higher similarity threshold for better relevance
      const chunks = await knowledgeGraphService.searchDocumentChunks(query, userId, limit); // Get more chunks initially
      
      // Sort chunks by relevance score and take the most relevant ones
      const sortedChunks = chunks.sort((a:any, b:any) => b.similarity - a.similarity).slice(0, limit);
      
      // Format chunks for RAG
      return sortedChunks.map(chunk => ({
        content: chunk.content,
        name: chunk.content,
        chunkIndex: chunk.chunkIndex,
        userId: chunk.userId,
        contextPackId: chunk.contextPackId,
        createdAt: chunk.createdAt
      }));
    } catch (error) {
      console.error('Error getting relevant context:', error);
      throw error;
    }
  }

  async getContextForWidget(widgetId: string, query: string, userId: string): Promise<RAGContext[]> {
    try {
      // Get widget's context pack
      const contextPack = await knowledgeGraphService.getContextPack(widgetId);
      if (!contextPack) {
        throw new Error('Context pack not found');
      }

      // Get relevant document chunks with higher relevance to widget name
      const chunks = await this.getRelevantContext(query, userId);

      // Combine with context pack information
      const context: RAGContext[] = [
        {
          content: `Goal: ${contextPack.goal}\nContext: ${contextPack.contextDescription}`,
          name: 'Context Pack',
          chunkIndex: 0,
          userId: userId,
          contextPackId: widgetId,
          createdAt: new Date()
        },
        ...chunks
      ];

      return context;
    } catch (error) {
      console.error('Error getting context for widget:', error);
      throw error;
    }
  }
}

export const ragService = new RAGService(); 