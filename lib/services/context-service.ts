import { knowledgeGraphService } from './knowledge-graph-service';
import { ragService } from './rag-service';
import { useSettingsStore } from '@/lib/settings-store';

interface AnalysisContext {
  contextPack: any;
  relevantChunks: Array<{
    content: string;
    userId: string;
    createdAt: Date;
  }>;
}

interface RelevantChunk {
  content: string;
  userId: string;
  createdAt: Date;
}

export class ContextService {
  async getContextForAnalysis(
    userId: string,
    analysisType: 'quick' | 'detailed' | 'hotlink' | 'chat',
    query?: string,
    widgetName?: string
  ): Promise<AnalysisContext> {
    try {
      // Get settings
      const settings = useSettingsStore.getState();
      
      // If context pack is not enabled, return empty context
      if (!settings.contextPackEnabled) {
        return { contextPack: null, relevantChunks: [] };
      }

      // Get the most recent context pack
      const packs = await knowledgeGraphService.getAllContextPacks();
      const userPacks = packs.filter(p => p.userId === userId);
      if (userPacks.length === 0) {
        return { contextPack: null, relevantChunks: [] };
      }

      // Sort by createdAt descending and get the most recent
      userPacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const contextPack = userPacks[0];

      // Get relevant chunks based on analysis type
      let relevantChunks: RelevantChunk[] = [];
      if (query) {
        // For chat analysis, get 3 most relevant chunks to the question
        if (analysisType === 'chat') {
          relevantChunks = await ragService.getRelevantContext(query, userId, 3);
        }
        // For hotlink analysis, get 3 chunks most relevant to the widget name
        else if (analysisType === 'hotlink') {
          relevantChunks = await ragService.getRelevantContext(widgetName || query, userId, 3);
        }
        // For detailed analysis, get 10 chunks for comprehensive analysis
        else if (analysisType === 'detailed') {
          relevantChunks = await ragService.getRelevantContext(query, userId, 5);
        }
        // For quick analysis (including talking points), get 5 chunks that best summarize the content
        // and are most relevant to the current conversation
        else if (analysisType === 'quick') {
          // Get chunks relevant to both the query and the context pack's key topics
          const queryChunks = await ragService.getRelevantContext(query, userId, 3);
          const topicChunks = await Promise.all(
            contextPack.keyTopics.map(topic => 
              ragService.getRelevantContext(topic, userId, 1)
            )
          );
          
          // Combine and deduplicate chunks
          const allChunks = [...queryChunks, ...topicChunks.flat()];
          const uniqueChunks = Array.from(new Map(
            allChunks.map(chunk => [chunk.content, chunk])
          ).values());
          
          // Sort by relevance and take top 5
          relevantChunks = uniqueChunks
            .slice(0, 3);
        }
      } else if (widgetName) {
        // For analytic profile, get 5 chunks most relevant to the profile name
        relevantChunks = await ragService.getRelevantContext(widgetName, userId, 5);
      }

      // Format context based on analysis type
      const formattedContext = this.formatContextForAnalysis(contextPack, relevantChunks, analysisType);

      return {
        contextPack: formattedContext,
        relevantChunks
      };
    } catch (error) {
      console.error('Error getting context for analysis:', error);
      return { contextPack: null, relevantChunks: [] };
    }
  }

  private formatContextForAnalysis(
    contextPack: any,
    chunks: any[],
    analysisType: 'quick' | 'detailed' | 'hotlink' | 'chat'
  ): any {
    // Base context from context pack - include ALL fields
    const baseContext = {
      goal: contextPack.goal,
      subGoals: contextPack.subGoals,
      userRole: contextPack.userRole,
      name:contextPack.name,
      person: contextPack.person,
      personRelationship: contextPack.personRelationship,
      participants: contextPack.participants,
      contextDescription: contextPack.contextDescription,
      keyTopics: contextPack.keyTopics,
      notes: contextPack.notes,
      timeline: contextPack.timeline,
      conflictMap: contextPack.conflictMap,
      environmentalFactors: contextPack.environmentalFactors,
      documents: contextPack.documents
    };

    // Add relevant documents based on analysis type
    switch (analysisType) {
      case 'quick':
        return {
          ...baseContext,
          relevantDocuments: chunks.slice(0, 3).map(chunk => ({
            content: chunk.content,
            metadata: chunk.metadata
          }))
        };

      case 'detailed':
        return {
          ...baseContext,
          relevantDocuments: chunks.map(chunk => ({
            content: chunk.content,
            metadata: chunk.metadata
          }))
        };

      case 'hotlink':
        return {
          ...baseContext,
          relevantDocuments: chunks.slice(0, 5).map(chunk => ({
            content: chunk.content,
            metadata: chunk.metadata
          }))
        };

      case 'chat':
        return {
          ...baseContext,
          relevantDocuments: chunks.map(chunk => ({
            content: chunk.content,
            metadata: chunk.metadata
          }))
        };

      default:
        return baseContext;
    }
  }
}

export const contextService = new ContextService(); 