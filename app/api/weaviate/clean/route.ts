import { NextResponse } from 'next/server';
import { knowledgeGraphService } from '@/lib/services/knowledge-graph-service';

export async function POST() {
  try {
    // Delete all document chunks
    await knowledgeGraphService.deleteAllDocumentChunks();
    
    // Delete all context packs
    await knowledgeGraphService.deleteAllContextPacks();
    
    // Delete all files
    await knowledgeGraphService.deleteAllFiles();
    
    // Delete all relationships
    await knowledgeGraphService.deleteAllRelationships();
    
    // Delete all people
    await knowledgeGraphService.deleteAllPeople();

    return NextResponse.json({ success: true, message: 'All Weaviate data has been cleaned' });
  } catch (error) {
    console.error('Error cleaning Weaviate data:', error);
    return NextResponse.json(
      { error: 'Failed to clean Weaviate data' },
      { status: 500 }
    );
  }
} 