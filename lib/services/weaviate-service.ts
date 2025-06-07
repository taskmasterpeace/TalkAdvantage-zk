import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

// Helper function to chunk documents
async function chunkDocument(text: string, chunkSize: number = 250, overlap: number = 50) {
  try {
    // Input validation
    if (!text || typeof text !== 'string') {
      console.log('Invalid input text:', text);
      return [];
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      console.log('Empty text after trimming');
      return [];
    }

    // Split into words and validate
    const words = trimmedText.split(/\s+/).filter(Boolean);
    console.log(`Split into ${words.length} words`);

    if (words.length === 0) {
      console.log('No valid words found after splitting');
      return [];
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let wordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Add word to current chunk
      currentChunk.push(word);
      wordCount++;

      // Check if we need to create a new chunk
      if (wordCount >= chunkSize || i === words.length - 1) {
        // Look ahead for sentence end
        let endIndex = i;
        if (i < words.length - 1) {
          for (let j = i + 1; j < Math.min(i + 50, words.length); j++) {
            if (words[j].match(/[.!?]$/)) {
              endIndex = j;
              break;
            }
          }
        }

        // Add words up to the sentence end
        while (i < endIndex) {
          i++;
          if (i < words.length) {
            currentChunk.push(words[i]);
          }
        }

        // Create chunk
        const chunkText = currentChunk.join(' ').trim();
        if (chunkText) {
          chunks.push(chunkText);
        }

        // Prepare for next chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        currentChunk = currentChunk.slice(overlapStart);
        wordCount = currentChunk.length;
      }
    }

    console.log(`Created ${chunks.length} chunks`);
    return chunks;
  } catch (error) {
    console.error('Error in chunkDocument:', error);
    return [];
  }
}

// Initialize schema
async function initializeSchema() {
  try {
    // Check if class exists
    const schema = await client.schema.getter().do();
    const classExists = schema.classes?.some(c => c.class === 'Transcript');
    
    if (!classExists) {
      // Create class with explicit vectorizer configuration
      await client.schema
        .classCreator()
        .withClass({
          class: 'Transcript',
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
              name: 'text',
              dataType: ['text'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: false,
                  vectorizePropertyName: false
                }
              }
            },
            {
              name: 'index',
              dataType: ['number'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'originalName',
              dataType: ['string'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'chunkIndex',
              dataType: ['number'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            },
            {
              name: 'totalChunks',
              dataType: ['number'],
              moduleConfig: {
                'text2vec-transformers': {
                  skip: true
                }
              }
            }
          ]
        })
        .do();
      console.log('Created Transcript class in Weaviate with MiniLM model');
    }
  } catch (error) {
    console.error('Error initializing Weaviate schema:', error);
    throw error;
  }
}

// Initialize schema on startup
initializeSchema().catch(console.error);

export const weaviateService = {
  async addDocument(name: string, text: string, index: number) {
    try {
      const chunks = await chunkDocument(text);
      
      // Add each chunk as a separate document
      for (let i = 0; i < chunks.length; i++) {
        await client.data
          .creator()
          .withClassName('Transcript')
          .withProperties({
            name: `${name}_chunk_${i}`,
            text: chunks[i],
            index: i,
            originalName: name,
            chunkIndex: i,
            totalChunks: chunks.length
          })
          .do();
      }
      
      return { success: true, chunks: chunks.length };
    } catch (error) {
      console.error('Error adding document to Weaviate:', error);
      throw error;
    }
  },

  async removeDocument(name: string) {
    try {
      const result = await client.graphql
        .get()
        .withClassName('Transcript')
        .withFields('_additional { id }')
        .withWhere({
          operator: 'Equal',
          path: ['originalName'],
          valueString: name
        })
        .do();

      const objects = result.data.Get.Transcript;
      if (objects && objects.length > 0) {
        for (const obj of objects) {
          await client.data
            .deleter()
            .withClassName('Transcript')
            .withId(obj._additional.id)
            .do();
        }
      }

      return { success: true, deletedCount: objects?.length || 0 };
    } catch (error) {
      console.error('Error removing document from Weaviate:', error);
      throw error;
    }
  },

  async search(query: string, limit: number = 3) {
    try {
      const result = await client.graphql
        .get()
        .withClassName('Transcript')
        .withFields('name text index originalName chunkIndex totalChunks _additional { certainty }')
        .withNearText({ concepts: [query] })
        .withLimit(limit)
        .do();

      // Group chunks by original document
      const groupedResults = result.data.Get.Transcript.reduce((acc: any, curr: any) => {
        if (!acc[curr.originalName]) {
          acc[curr.originalName] = {
            name: curr.originalName,
            chunks: [],
            text: ''
          };
        }
        acc[curr.originalName].chunks.push({
          text: curr.text,
          chunkIndex: curr.chunkIndex,
          similarity: curr._additional.certainty
        });
        return acc;
      }, {});

      // Sort chunks by index and combine text
      Object.values(groupedResults).forEach((doc: any) => {
        doc.chunks.sort((a: any, b: any) => a.chunkIndex - b.chunkIndex);
        doc.text = doc.chunks.map((c: any) => c.text).join('\n');
      });

      return Object.values(groupedResults);
    } catch (error) {
      console.error('Error searching Weaviate:', error);
      throw error;
    }
  },

  async getDocumentCount() {
    try {
      const result = await client.graphql
        .aggregate()
        .withClassName('Transcript')
        .withFields('meta { count }')
        .do();

      return result.data.Aggregate.Transcript[0].meta.count;
    } catch (error) {
      console.error('Error getting document count:', error);
      throw error;
    }
  },

  async deleteAllTranscripts() {
    try {
      // First get all objects
      const result = await client.graphql
        .get()
        .withClassName('Transcript')
        .withFields('_additional { id }')
        .do();

      const objects = result.data.Get.Transcript;
      let deletedCount = 0;

      if (objects && objects.length > 0) {
        // Delete each object by ID
        for (const obj of objects) {
          await client.data
            .deleter()
            .withClassName('Transcript')
            .withId(obj._additional.id)
            .do();
          deletedCount++;
        }
      }

      console.log(`Deleted ${deletedCount} transcripts from Weaviate`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error deleting all transcripts from Weaviate:', error);
      throw error;
    }
  }
}; 