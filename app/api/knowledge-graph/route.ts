import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraphService } from '@/lib/services/knowledge-graph-service';
import { z } from 'zod';

// Input validation schemas
const PersonSchema = z.object({
  name: z.string(),
  type: z.string().default('individual'),
  description: z.string().optional(),
  metadata: z.object({
    data: z.string()
  }).optional()
}).transform(data => ({
  name: data.name,
  type: data.type,
  metadata: {
    data: data.description || data.metadata?.data || ''
  }
}));

const FileSchema = z.object({
  name: z.string(),
  type: z.string(),
  personId: z.string(),
  metadata: z.object({
    data: z.string()
  })
});

const RelationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  properties: z.object({
    data: z.string()
  })
});

const GraphRequestSchema = z.object({
  action: z.enum([
    'createPerson',
    'updatePerson',
    'deletePerson',
    'getPerson',
    'searchPeople',
    'createFile',
    'updateFile',
    'deleteFile',
    'getPersonFiles',
    'createRelationship',
    'updateRelationship',
    'deleteRelationship',
    'getPersonRelationships',
    'exploreGraph',
    'getAllPeople',
    'getAllRelationships',
    'queryPersons',
    'queryFiles',
    'queryRelationships'
  ]),
  data: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = GraphRequestSchema.parse(body);

    switch (action) {
      case 'createPerson': {
        const personData = PersonSchema.parse(data);
        const result = await knowledgeGraphService.createPerson(personData);
        return NextResponse.json(result);
      }

      case 'updatePerson': {
        const { id, ...updates } = data;
        const result = await knowledgeGraphService.updatePerson(id, updates);
        return NextResponse.json(result);
      }

      case 'deletePerson': {
        console.log('Delete person request received:', data);
        try {
          const result = await knowledgeGraphService.deletePerson(data.id);
          console.log('Delete person result:', result);
          return NextResponse.json(result);
        } catch (error) {
          console.error('Error in deletePerson endpoint:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete person' },
            { status: 500 }
          );
        }
      }

      case 'getPerson': {
        const result = await knowledgeGraphService.getPerson(data.id);
        return NextResponse.json(result);
      }

      case 'searchPeople': {
        const result = await knowledgeGraphService.searchPeople(data.query, data.limit);
        return NextResponse.json(result);
      }

      case 'createFile': {
        const fileData = FileSchema.parse(data);
        const result = await knowledgeGraphService.createFile(fileData);
        return NextResponse.json(result);
      }

      case 'updateFile': {
        const { id, ...updates } = data;
        const result = await knowledgeGraphService.updateFile(id, updates);
        return NextResponse.json(result);
      }

      case 'deleteFile': {
        const result = await knowledgeGraphService.deleteFile(data.id);
        return NextResponse.json(result);
      }

      case 'getPersonFiles': {
        const result = await knowledgeGraphService.getPersonFiles(data.personId);
        return NextResponse.json(result);
      }

      case 'createRelationship': {
        const relationshipData = RelationshipSchema.parse(data);
        const result = await knowledgeGraphService.createRelationship(relationshipData);
        return NextResponse.json(result);
      }

      case 'updateRelationship': {
        const { id, ...updates } = data;
        const result = await knowledgeGraphService.updateRelationship(id, updates);
        return NextResponse.json(result);
      }

      case 'deleteRelationship': {
        const result = await knowledgeGraphService.deleteRelationship(data.id);
        return NextResponse.json(result);
      }

      case 'getPersonRelationships': {
        const result = await knowledgeGraphService.getPersonRelationships(data.personId);
        return NextResponse.json(result);
      }

      case 'exploreGraph': {
        const result = await knowledgeGraphService.exploreGraph(data.startPersonId, data.depth);
        return NextResponse.json(result);
      }

      case 'getAllPeople': {
        const result = await knowledgeGraphService.getAllPeople(data.limit);
        return NextResponse.json(result);
      }

      case 'getAllRelationships': {
        const result = await knowledgeGraphService.getAllRelationships();
        return NextResponse.json(result);
      }

      case 'queryPersons': {
        const result = await knowledgeGraphService.queryPersons(data.where);
        return NextResponse.json(result);
      }

      case 'queryFiles': {
        const result = await knowledgeGraphService.queryFiles(data.where);
        return NextResponse.json(result);
      }

      case 'queryRelationships': {
        const result = await knowledgeGraphService.queryRelationships(data.where);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling knowledge graph request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 