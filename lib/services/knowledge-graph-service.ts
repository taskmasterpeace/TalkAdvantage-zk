import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

let schemaInitialized = false;

// Define types for our knowledge graph
export interface Person {
  id: string;
  name: string;
  type: string;
  metadata: {
    data: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: string;
  name: string;
  type: string;
  personId: string;
  metadata: {
    data: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: {
    data: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextPack {
  id: string;
  userId: string;
  name: string;
  userRole: string;
  goal: string;
  subGoals: string[];
  person: string;
  personRelationship: string;
  participants: Array<{
    name: string;
    role: string;
    relationship_to_user: string;
    apex_profile?: {
      risk_tolerance?: string;
      decision_speed?: string;
      key_motivators?: string[];
      recent_behavior?: string;
    };
  }>;
  documents: Array<{
    name: string;
    file: string;
    tags?: string[];
  }>;
  contextDescription: string;
  keyTopics: string[];
  notes: string;
  timeline?: string[];
  conflictMap?: string;
  environmentalFactors?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentChunk {
  contextPackId: any;
  chunkIndex: any;
  id: string;
  userId: string;
  content: string;
  metadata: {
    name: string;
    file: string;
    tags?: string[];
    chunkIndex: number;
    totalChunks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface WeaviateResponse {
  id: string;
  properties: {
    userId: string;
    name: string;
    userRole: string;
    goal: string;
    subGoals: string[];
    person: string;
    personRelationship: string;
    participants: Array<{
      name: string;
      role: string;
      relationship_to_user: string;
      apex_profile?: {
        risk_tolerance?: string;
        decision_speed?: string;
        key_motivators?: string[];
        recent_behavior?: string;
      };
    }>;
    documents: Array<{
      name: string;
      file: string;
      tags?: string[];
    }>;
    contextDescription: string;
    keyTopics: string[];
    notes: string;
    timeline?: string[];
    conflictMap?: string;
    environmentalFactors?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Initialize schema on startup
async function ensureSchemaInitialized() {
  if (schemaInitialized) return;

  try {
    // Check if schema exists
    const schema = await client.schema.getter().do();
    if (!schema) {
      // Initialize schema if it doesn't exist
      await initializeKnowledgeGraphSchema();
    }
    schemaInitialized = true;
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw new Error('Failed to initialize database schema. Please ensure Weaviate is running at http://localhost:8080');
  }
}

// Initialize knowledge graph schema
async function initializeKnowledgeGraphSchema() {
  try {
    const schema = await client.schema.getter().do();
    
    // Create Person class if it doesn't exist
    const personClassExists = schema.classes?.some(c => c.class === 'Person');
    if (!personClassExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'Person',
          vectorizer: 'text2vec-transformers',
          moduleConfig: {
            'text2vec-transformers': {
              vectorizeClassName: false,
              model: 'sentence-transformers-multi-qa-MiniLM-L6-cos-v1',
              poolingStrategy: 'masked_mean',
              inferenceUrl: 'http://t2v-transformers:8080'
            }
          },
          properties: [
            {
              name: 'name',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'description',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'type',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'metadata',
              dataType: ['object'],
              properties: [
                {
                  name: 'data',
                  dataType: ['text']
                }
              ],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'createdAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'updatedAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            }
          ]
        })
        .do();
    }

    // Create File class if it doesn't exist
    const fileClassExists = schema.classes?.some(c => c.class === 'File');
    if (!fileClassExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'File',
          vectorizer: 'text2vec-transformers',
          moduleConfig: {
            'text2vec-transformers': {
              vectorizeClassName: false,
              model: 'sentence-transformers-multi-qa-MiniLM-L6-cos-v1',
              poolingStrategy: 'masked_mean',
              inferenceUrl: 'http://t2v-transformers:8080'
            }
          },
          properties: [
            {
              name: 'name',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'type',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'personId',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'metadata',
              dataType: ['object'],
              properties: [
                {
                  name: 'data',
                  dataType: ['text']
                }
              ],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'createdAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'updatedAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            }
          ]
        })
        .do();
    }

    // Create Relationship class if it doesn't exist
    const relationshipClassExists = schema.classes?.some(c => c.class === 'Relationship');
    if (!relationshipClassExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'Relationship',
          vectorizer: 'none',
          properties: [
            {
              name: 'source',
              dataType: ['string']
            },
            {
              name: 'target',
              dataType: ['string']
            },
            {
              name: 'type',
              dataType: ['string']
            },
            {
              name: 'properties',
              dataType: ['object'],
              properties: [
                {
                  name: 'data',
                  dataType: ['text']
                }
              ]
            },
            {
              name: 'createdAt',
              dataType: ['date']
            },
            {
              name: 'updatedAt',
              dataType: ['date']
            }
          ]
        })
        .do();
    }

    // Create ContextPack class if it doesn't exist
    const contextPackClassExists = schema.classes?.some(c => c.class === 'ContextPack');
    if (!contextPackClassExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'ContextPack',
          vectorizer: 'text2vec-transformers',
          moduleConfig: {
            'text2vec-transformers': {
              vectorizeClassName: false,
              model: 'sentence-transformers-multi-qa-MiniLM-L6-cos-v1',
              poolingStrategy: 'masked_mean',
              inferenceUrl: 'http://t2v-transformers:8080'
            }
          },
          properties: [
            {
              name: 'userId',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'name',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'userRole',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'goal',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false
                }
              }
            },
            {
              name: 'subGoals',
              dataType: ['string[]'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'person',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'personRelationship',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'participants',
              dataType: ['object[]'],
              properties: [
                {
                  name: 'name',
                  dataType: ['string']
                },
                {
                  name: 'role',
                  dataType: ['string']
                },
                {
                  name: 'relationship_to_user',
                  dataType: ['string']
                },
                {
                  name: 'apex_profile',
                  dataType: ['object'],
                  properties: [
                    {
                      name: 'risk_tolerance',
                      dataType: ['string']
                    },
                    {
                      name: 'decision_speed',
                      dataType: ['string']
                    },
                    {
                      name: 'key_motivators',
                      dataType: ['string[]']
                    },
                    {
                      name: 'recent_behavior',
                      dataType: ['string']
                    }
                  ]
                }
              ],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'documents',
              dataType: ['text[]'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'contextDescription',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false
                }
              }
            },
            {
              name: 'keyTopics',
              dataType: ['string[]'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'notes',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false
                }
              }
            },
            {
              name: 'timeline',
              dataType: ['string[]'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'conflictMap',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false
                }
              }
            },
            {
              name: 'environmentalFactors',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false
                }
              }
            },
            {
              name: 'createdAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'updatedAt',
              dataType: ['date'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            }
          ]
        })
        .do();
    }

    // Create DocumentChunk class if it doesn't exist
    const documentChunkClassExists = schema.classes?.some(c => c.class === 'DocumentChunk');
    if (!documentChunkClassExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'DocumentChunk',
          description: 'A chunk of a document with vector embeddings',
          vectorizer: 'text2vec-openai',
          moduleConfig: {
            'text2vec-openai': {
              model: 'ada',
              modelVersion: '002',
              type: 'text'
            }
          },
          properties: [
            {
              name: 'content',
              dataType: ['text'],
              description: 'The content of the document chunk'
            },
            {
              name: 'userId',
              dataType: ['string'],
              description: 'ID of the user who owns the document'
            },
            {
              name: 'createdAt',
              dataType: ['date'],
              description: 'When the chunk was created'
            }
          ]
        })
        .do();
    }

    console.log('Knowledge graph schema initialized');
  } catch (error) {
    console.error('Error initializing knowledge graph schema:', error);
    throw error;
  }
}

// Initialize schema immediately
initializeKnowledgeGraphSchema().catch(error => {
  console.error('Failed to initialize schema on startup:', error);
});

export const knowledgeGraphService = {
  // Person operations
  async createPerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) {
    await ensureSchemaInitialized();
    try {
      const now = new Date().toISOString();
      const result = await client.data
        .creator()
        .withClassName('Person')
        .withProperties({
          ...person,
          createdAt: now,
          updatedAt: now
        })
        .do();

      return { 
        ...person, 
        id: result.id, 
        createdAt: new Date(now), 
        updatedAt: new Date(now) 
      };
    } catch (error) {
      console.error('Error creating person:', error);
      throw error;
    }
  },

  async updatePerson(id: string, updates: Partial<Person>) {
    try {
      const now = new Date();
      await client.data
        .updater()
        .withClassName('Person')
        .withId(id)
        .withProperties({
          ...updates,
          updatedAt: now
        })
        .do();

      return { id, ...updates, updatedAt: now };
    } catch (error) {
      console.error('Error updating person:', error);
      throw error;
    }
  },

  async deletePerson(id: string): Promise<boolean> {
    console.log('Deleting person with ID:', id);
    try {
      // First delete all relationships
      console.log('Deleting relationships for person:', id);
      await this.deletePersonRelationships(id);
      
      // Then delete all files
      console.log('Deleting files for person:', id);
      const files = await this.getPersonFiles(id);
      for (const file of files) {
        await this.deleteFile(file.id);
      }
      
      // Finally delete the person
      console.log('Deleting person:', id);
      await client.data
        .deleter()
        .withClassName('Person')
        .withId(id)
        .do();
      
      console.log('Delete person completed successfully');
      return true;
    } catch (error) {
      console.error('Error in deletePerson:', error);
      throw error;
    }
  },

  async getPerson(id: string) {
    try {
      const result = await client.data
        .getterById()
        .withClassName('Person')
        .withId(id)
        .do();

      if (!result) return null;

      const now = new Date().toISOString();
      const metadata = result.properties?.metadata || { data: '' };
      const createdAt = result.properties?.createdAt || now;
      const updatedAt = result.properties?.updatedAt || now;

      return {
        id: result.id || id,
        name: result.properties?.name || '',
        type: result.properties?.type || '',
        metadata: typeof metadata === 'object' ? metadata : { data: '' },
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt)
      } as Person;
    } catch (error) {
      console.error('Error getting person:', error);
      throw error;
    }
  },

  // File operations
  async createFile(file: Omit<File, 'id' | 'createdAt' | 'updatedAt'>) {
    await ensureSchemaInitialized();
    try {
      const now = new Date();
      const result = await client.data
        .creator()
        .withClassName('File')
        .withProperties({
          ...file,
          createdAt: now,
          updatedAt: now
        })
        .do();

      return { ...file, id: result.id, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  },

  async updateFile(id: string, updates: Partial<File>) {
    try {
      const now = new Date();
      await client.data
        .updater()
        .withClassName('File')
        .withId(id)
        .withProperties({
          ...updates,
          updatedAt: now
        })
        .do();

      return { id, ...updates, updatedAt: now };
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  },

  async deleteFile(id: string) {
    try {
      await client.data
        .deleter()
        .withClassName('File')
        .withId(id)
        .do();

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  async getPersonFiles(personId: string) {
    try {
      await ensureSchemaInitialized();
      const result = await client.graphql
        .get()
        .withClassName('File')
        .withFields('name type metadata { data } personId createdAt updatedAt _additional { id }')
        .withWhere({
          path: ['personId'],
          operator: 'Equal',
          valueString: personId
        })
        .do();

      if (!result.data?.Get?.File) {
        return [];
      }

      const now = new Date().toISOString();
      return result.data.Get.File.map((file: any) => {
        const metadata = file.metadata || { data: '' };
        const createdAt = file.createdAt || now;
        const updatedAt = file.updatedAt || now;

        return {
          id: file._additional?.id || '',
          name: file.name || '',
          type: file.type || '',
          metadata: typeof metadata === 'object' ? metadata : { data: '' },
          personId: file.personId || '',
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt)
        };
      });
    } catch (error: any) {
      console.error('Error getting person files:', error);
      return []; // Return empty array for any error
    }
  },

  async deletePersonFiles(personId: string) {
    try {
      const files = await this.getPersonFiles(personId);
      for (const file of files) {
        await this.deleteFile(file.id);
      }
      return { success: true, deletedCount: files.length };
    } catch (error) {
      console.error('Error deleting person files:', error);
      throw error;
    }
  },

  // Relationship operations
  async createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const now = new Date();
      const result = await client.data
        .creator()
        .withClassName('Relationship')
        .withProperties({
          ...relationship,
          createdAt: now,
          updatedAt: now
        })
        .do();

      return { ...relationship, id: result.id, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
  },

  async updateRelationship(id: string, updates: Partial<Relationship>) {
    try {
      const now = new Date();
      await client.data
        .updater()
        .withClassName('Relationship')
        .withId(id)
        .withProperties({
          ...updates,
          updatedAt: now
        })
        .do();

      return { id, ...updates, updatedAt: now };
    } catch (error) {
      console.error('Error updating relationship:', error);
      throw error;
    }
  },

  async deleteRelationship(id: string) {
    try {
      await client.data
        .deleter()
        .withClassName('Relationship')
        .withId(id)
        .do();

      return { success: true };
    } catch (error) {
      console.error('Error deleting relationship:', error);
      throw error;
    }
  },

  async deletePersonRelationships(personId: string) {
    try {
      const result = await client.graphql
        .get()
        .withClassName('Relationship')
        .withFields('_additional { id }')
        .withWhere({
          operator: 'Or',
          operands: [
            {
              operator: 'Equal',
              path: ['source'],
              valueString: personId
            },
            {
              operator: 'Equal',
              path: ['target'],
              valueString: personId
            }
          ]
        })
        .do();

      if (!result.data?.Get?.Relationship) {
        return { success: true, deletedCount: 0 };
      }

      for (const rel of result.data.Get.Relationship) {
        await this.deleteRelationship(rel._additional.id);
      }

      return { success: true, deletedCount: result.data.Get.Relationship.length };
    } catch (error) {
      console.error('Error deleting person relationships:', error);
      throw error;
    }
  },

  async getPersonRelationships(personId: string) {
    try {
      const result = await client.graphql
        .get()
        .withClassName('Relationship')
        .withFields('source target type properties createdAt updatedAt _additional { id }')
        .withWhere({
          operator: 'Or',
          operands: [
            {
              operator: 'Equal',
              path: ['source'],
              valueString: personId
            },
            {
              operator: 'Equal',
              path: ['target'],
              valueString: personId
            }
          ]
        })
        .do();

      if (!result.data?.Get?.Relationship) {
        return [];
      }

      return result.data.Get.Relationship.map((rel: any) => ({
        id: rel._additional?.id || '',
        source: rel.source || '',
        target: rel.target || '',
        type: rel.type || '',
        properties: rel.properties || {},
        createdAt: new Date(rel.createdAt || Date.now().toString()),
        updatedAt: new Date(rel.updatedAt || Date.now().toString())
      }));
    } catch (error: any) {
      console.error('Error getting person relationships:', error);
      return [];
    }
  },

  // Graph exploration
  async exploreGraph(startPersonId: string, depth: number = 2) {
    try {
      const visited = new Set<string>();
      const graph: { nodes: Person[], edges: Relationship[] } = {
        nodes: [],
        edges: []
      };

      const exploreNode = async (personId: string, currentDepth: number) => {
        if (currentDepth > depth || visited.has(personId)) return;
        visited.add(personId);

        // Get person details
        const person = await this.getPerson(personId);
        if (person) {
          graph.nodes.push(person);
        }

        // Get relationships
        const relationships = await this.getPersonRelationships(personId);
        for (const rel of relationships) {
          graph.edges.push(rel);

          // Explore connected nodes
          const nextPersonId = rel.source === personId ? rel.target : rel.source;
          await exploreNode(nextPersonId, currentDepth + 1);
        }
      };

      await exploreNode(startPersonId, 0);
      return graph;
    } catch (error) {
      console.error('Error exploring graph:', error);
      throw error;
    }
  },

  async searchPeople(query: string, limit: number = 10) {
    await ensureSchemaInitialized();
    try {
      if (!query.trim()) {
        return this.getAllPeople(limit);
      }

      const result = await client.graphql
        .get()
        .withClassName('Person')
        .withFields('name type metadata { data } createdAt updatedAt _additional { id }')
        .withNearText({ concepts: [query] })
        .withLimit(limit)
        .do();

      if (!result.data.Get || !result.data.Get.Person) {
        return [];
      }

      const now = new Date().toISOString();
      return result.data.Get.Person.map((person: any) => {
        const metadata = person.metadata || { data: '' };
        const createdAt = person.createdAt || now;
        const updatedAt = person.updatedAt || now;

        return {
          id: person._additional?.id || '',
          name: person.name || '',
          type: person.type || '',
          metadata: typeof metadata === 'object' ? metadata : { data: '' },
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt)
        };
      });
    } catch (error) {
      console.error('Error searching people:', error);
      throw error;
    }
  },

  async getAllPeople(limit: number = 100) {
    await ensureSchemaInitialized();
    try {
      const result = await client.data
        .getter()
        .withClassName('Person')
        .withLimit(limit)
        .do();

      if (!result || !result.objects) {
        return [];
      }

      const now = new Date().toISOString();
      return result.objects.map((person: any) => {
        const metadata = person.properties?.metadata || { data: '' };
        const createdAt = person.properties?.createdAt || now;
        const updatedAt = person.properties?.updatedAt || now;

        return {
          id: person.id || '',
          name: person.properties?.name || '',
          type: person.properties?.type || '',
          metadata: typeof metadata === 'object' ? metadata : { data: '' },
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt)
        };
      });
    } catch (error) {
      console.error('Error getting all people:', error);
      throw error;
    }
  },

  async getAllRelationships() {
    await ensureSchemaInitialized();
    try {
      const result = await client.data
        .getter()
        .withClassName('Relationship')
        .withLimit(1000)
        .do();

      if (!result || !result.objects) {
        return [];
      }

      const now = new Date().toISOString();
      return result.objects.map((rel: any) => ({
        id: rel.id || '',
        source: rel.properties?.source || '',
        target: rel.properties?.target || '',
        type: rel.properties?.type || '',
        properties: rel.properties?.properties || { data: '' },
        createdAt: new Date(rel.properties?.createdAt || now),
        updatedAt: new Date(rel.properties?.updatedAt || now)
      }));
    } catch (error) {
      console.error('Error getting all relationships:', error);
      throw error;
    }
  },

  // Add new query methods to match curl commands
  async queryPersons(where?: any) {
    await ensureSchemaInitialized();
    try {
      const result = await client.graphql
        .get()
        .withClassName('Person')
        .withFields('name type metadata { data } _additional { id }')
        .withWhere(where)
        .do();

      const now = new Date().toISOString();
      return result.data.Get.Person.map((person: any) => ({
        id: person._additional.id,
        name: person.name,
        type: person.type,
        metadata: person.metadata || { data: '' },
        createdAt: new Date(now),
        updatedAt: new Date(now)
      }));
    } catch (error) {
      console.error('Error querying persons:', error);
      throw error;
    }
  },

  async queryFiles(where?: any) {
    await ensureSchemaInitialized();
    try {
      const result = await client.graphql
        .get()
        .withClassName('File')
        .withFields('name type metadata { data } personId _additional { id }')
        .withWhere(where)
        .do();

      const now = new Date().toISOString();
      return result.data.Get.File.map((file: any) => ({
        id: file._additional.id,
        name: file.name,
        type: file.type,
        metadata: file.metadata || { data: '' },
        personId: file.personId,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      }));
    } catch (error) {
      console.error('Error querying files:', error);
      throw error;
    }
  },

  async queryRelationships(where?: any) {
    await ensureSchemaInitialized();
    try {
      const result = await client.graphql
        .get()
        .withClassName('Relationship')
        .withFields('source target type properties { data } _additional { id }')
        .withWhere(where)
        .do();

      const now = new Date().toISOString();
      return result.data.Get.Relationship.map((rel: any) => ({
        id: rel._additional.id,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        properties: rel.properties || { data: '' },
        createdAt: new Date(now),
        updatedAt: new Date(now)
      }));
    } catch (error) {
      console.error('Error querying relationships:', error);
      throw error;
    }
  },

  // Context Pack specific methods
  async createContextPack(contextPack: Omit<ContextPack, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContextPack> {
    await ensureSchemaInitialized();
    
    try {
      // Delete all previous context packs for this user
      await this.deleteAllUserContextPacks(contextPack.userId);

      // Format the documents array to match Weaviate's expected structure
      const formattedDocuments = contextPack.documents.map(doc => 
        JSON.stringify({
          name: doc.name,
          file: doc.file,
          tags: doc.tags || []
        })
      );

      const result = await client.data
        .creator()
        .withClassName('ContextPack')
        .withProperties({
          ...contextPack,
          documents: formattedDocuments,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .do() as WeaviateResponse;

      if (!result.properties) {
        throw new Error('No properties returned from Weaviate');
      }

      return {
        ...contextPack,
        id: result.id,
        createdAt: new Date(result.properties.createdAt),
        updatedAt: new Date(result.properties.updatedAt)
      };
    } catch (error) {
      console.error('Error creating context pack:', error);
      throw error;
    }
  },

  async updateContextPack(id: string, updates: Partial<ContextPack>): Promise<ContextPack> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.data
        .updater()
        .withClassName('ContextPack')
        .withId(id)
        .withProperties({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .do() as WeaviateResponse;

      if (!result.properties) {
        throw new Error('No properties returned from Weaviate');
      }

      return {
        ...result.properties,
        id: result.id,
        createdAt: new Date(result.properties.createdAt),
        updatedAt: new Date(result.properties.updatedAt)
      };
    } catch (error) {
      console.error('Error updating context pack:', error);
      throw error;
    }
  },

  async deleteContextPack(id: string): Promise<boolean> {
    await ensureSchemaInitialized();
    
    try {
      await client.data
        .deleter()
        .withClassName('ContextPack')
        .withId(id)
        .do();
      return true;
    } catch (error) {
      console.error('Error deleting context pack:', error);
      throw error;
    }
  },

  async getContextPack(id: string): Promise<ContextPack | null> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.data
        .getterById()
        .withClassName('ContextPack')
        .withId(id)
        .do() as WeaviateResponse;

      if (!result) return null;
      if (!result.properties) {
        throw new Error('No properties returned from Weaviate');
      }

      return {
        ...result.properties,
        id: result.id,
        createdAt: new Date(result.properties.createdAt),
        updatedAt: new Date(result.properties.updatedAt)
      };
    } catch (error) {
      console.error('Error getting context pack:', error);
      throw error;
    }
  },

  async getUserContextPacks(userId: string): Promise<ContextPack[]> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('ContextPack')
        .withFields('id userId name userRole goal subGoals person personRelationship participants documents contextDescription keyTopics notes timeline conflictMap environmentalFactors createdAt updatedAt')
        .withWhere({
          operator: 'Equal',
          path: ['userId'],
          valueString: userId
        })
        .do();

      return result.data.Get.ContextPack.map((pack: any) => ({
        ...pack,
        createdAt: new Date(pack.createdAt),
        updatedAt: new Date(pack.updatedAt)
      }));
    } catch (error) {
      console.error('Error getting user context packs:', error);
      throw error;
    }
  },

  async searchContextPacks(query: string, userId?: string, limit: number = 10): Promise<ContextPack[]> {
    await ensureSchemaInitialized();
    
    try {
      let graphqlQuery = client.graphql
        .get()
        .withClassName('ContextPack')
        .withFields('id userId name userRole goal subGoals person personRelationship participants documents contextDescription keyTopics notes timeline conflictMap environmentalFactors createdAt updatedAt')
        .withNearText({ concepts: [query] })
        .withLimit(limit);

      if (userId) {
        graphqlQuery = graphqlQuery.withWhere({
          operator: 'Equal',
          path: ['userId'],
          valueString: userId
        });
      }

      const result = await graphqlQuery.do();

      return result.data.Get.ContextPack.map((pack: any) => ({
        ...pack,
        createdAt: new Date(pack.createdAt),
        updatedAt: new Date(pack.updatedAt)
      }));
    } catch (error) {
      console.error('Error searching context packs:', error);
      throw error;
    }
  },

  // Add new method to delete all context packs for a user
  async deleteAllUserContextPacks(userId: string): Promise<boolean> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('ContextPack')
        .withFields('_additional { id }')
        .withWhere({
          operator: 'Equal',
          path: ['userId'],
          valueString: userId
        })
        .do();

      if (result.data?.Get?.ContextPack) {
        for (const pack of result.data.Get.ContextPack) {
          await this.deleteContextPack(pack._additional.id);
        }
      }
      return true;
    } catch (error) {
      console.error('Error deleting all user context packs:', error);
      throw error;
    }
  },

  // Add new method to get all context packs
  async getAllContextPacks(limit: number = 100): Promise<ContextPack[]> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('ContextPack')
        .withFields(`
          _additional { id }
          userId
          name
          userRole
          goal
          subGoals
          person
          personRelationship
          participants {
            name
            role
            relationship_to_user
          }
          documents
          contextDescription
          keyTopics
          notes
          timeline
          conflictMap
          environmentalFactors
          createdAt
          updatedAt
        `)
        .withLimit(limit)
        .do();

      if (!result.data?.Get?.ContextPack) {
        return [];
      }

      return result.data.Get.ContextPack.map((pack: any) => ({
        id: pack._additional?.id || '',
        userId: pack.userId || '',
        name: pack.name || '',
        userRole: pack.userRole || '',
        goal: pack.goal || '',
        subGoals: pack.subGoals || [],
        person: pack.person || '',
        personRelationship: pack.personRelationship || '',
        participants: (pack.participants || []).map((p: any) => ({
          name: p.name || '',
          role: p.role || '',
          relationship_to_user: p.relationship_to_user || '',
          apex_profile: p.apex_profile || {}
        })),
        documents:pack.documents ,
        contextDescription: pack.contextDescription || '',
        keyTopics: pack.keyTopics || [],
        notes: pack.notes || '',
        timeline: pack.timeline || [],
        conflictMap: pack.conflictMap || '',
        environmentalFactors: pack.environmentalFactors || '',
        createdAt: new Date(pack.createdAt || new Date().toISOString()),
        updatedAt: new Date(pack.updatedAt || new Date().toISOString())
      }));
    } catch (error) {
      console.error('Error getting all context packs:', error);
      throw error;
    }
  },

  // Document Chunk methods
  async createDocumentChunk(chunk: Omit<DocumentChunk, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentChunk> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.data
        .creator()
        .withClassName('DocumentChunk')
        .withProperties({
          ...chunk,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .do() as WeaviateResponse;

      if (!result.properties) {
        throw new Error('No properties returned from Weaviate');
      }

      return {
        ...chunk,
        id: result.id,
        createdAt: new Date(result.properties.createdAt),
        updatedAt: new Date(result.properties.updatedAt)
      };
    } catch (error) {
      console.error('Error creating document chunk:', error);
      throw error;
    }
  },

  async searchDocumentChunks(query: string, userId: string, limit: number = 5): Promise<DocumentChunk[]> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('DocumentChunk')
        .withFields(['content', 'userId', 'createdAt', '_additional { id }'])
        .withNearText({ concepts: [query] })
        .withWhere({
          operator: 'Equal',
          path: ['userId'],
          valueString: userId
        })
        .withLimit(limit)
        .do();

      return result.data.Get.DocumentChunk.map((chunk: any) => ({
        content: chunk.content,
        userId: chunk.userId,
        similarity:chunk.similarity,
        createdAt: new Date(chunk.createdAt)
      }));
    } catch (error) {
      console.error('Error searching document chunks:', error);
      throw error;
    }
  },

  async deleteDocumentChunks(userId: string, file: string): Promise<boolean> {
    await ensureSchemaInitialized();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('DocumentChunk')
        .withFields('_additional { id }')
        .withWhere({
          operator: 'And',
          operands: [
            {
              operator: 'Equal',
              path: ['userId'],
              valueString: userId
            },
            {
              operator: 'Equal',
              path: ['metadata', 'file'],
              valueString: file
            }
          ]
        })
        .do();

      if (result.data?.Get?.DocumentChunk) {
        for (const chunk of result.data.Get.DocumentChunk) {
          await client.data
            .deleter()
            .withClassName('DocumentChunk')
            .withId(chunk._additional.id)
            .do();
        }
      }
      return true;
    } catch (error) {
      console.error('Error deleting document chunks:', error);
      throw error;
    }
  },

  async getDocumentChunks(userId: string, contextPackId?: string): Promise<DocumentChunk[]> {
    try {
      const whereFilter: any = {
        operator: 'And',
        operands: [
          {
            path: ['userId'],
            operator: 'Equal',
            valueString: userId
          }
        ]
      };

      if (contextPackId) {
        whereFilter.operands.push({
          path: ['contextPackId'],
          operator: 'Equal',
          valueString: contextPackId
        });
      }

      const result = await client.graphql
        .get()
        .withClassName('DocumentChunk')
        .withFields(['content', 'userId', 'createdAt', '_additional { id }'])
        .withWhere(whereFilter)
        .do();

      return result.data.Get.DocumentChunk.map((chunk: any) => ({
        content: chunk.content,
        userId: chunk.userId,
        createdAt: new Date(chunk.createdAt)
      }));
    } catch (error) {
      console.error('Error getting document chunks:', error);
      throw error;
    }
  },

  async getSimilarDocumentChunks(userId: string, text: string, limit: number = 3): Promise<DocumentChunk[]> {
    try {
      const result = await client.graphql
        .get()
        .withClassName('DocumentChunk')
        .withFields(['content', 'userId', 'createdAt', '_additional { id }'])
        .withWhere({
          operator: 'Equal',
          valueString: userId,
          path: ['userId']
        })
        .withNearText({
          concepts: [text]
        })
        .withLimit(limit)
        .do();

      return result.data.Get.DocumentChunk.map((chunk: any) => ({
        content: chunk.content,
        userId: chunk.userId,
        createdAt: new Date(chunk.createdAt)
      }));
    } catch (error) {
      console.error('Error getting similar document chunks:', error);
      throw error;
    }
  }
}; 