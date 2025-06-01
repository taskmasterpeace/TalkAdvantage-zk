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
}; 