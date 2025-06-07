import { getEmbeddings, getEmbeddingsBatch } from './embeddings';

interface Document {
  id: string;
  content: string;
  metadata: {
    name: string;
    timestamp?: string;
  };
  embedding?: number[];
}

class VectorStore {
  private documents: Map<string, Document> = new Map();

  async addDocument(doc: Document) {
    if (this.documents.has(doc.id)) {
      return; // Document already exists
    }
    const embedding = await getEmbeddings(doc.content);
    this.documents.set(doc.id, { ...doc, embedding });
  }

  async addDocuments(docs: Document[]) {
    const newDocs = docs.filter(doc => !this.documents.has(doc.id));
    if (newDocs.length === 0) return;

    const contents = newDocs.map(doc => doc.content);
    const embeddings = await getEmbeddingsBatch(contents);
    
    newDocs.forEach((doc, i) => {
      this.documents.set(doc.id, { ...doc, embedding: embeddings[i] });
    });
  }

  removeDocument(id: string) {
    this.documents.delete(id);
  }

  removeDocuments(ids: string[]) {
    ids.forEach(id => this.documents.delete(id));
  }

  async search(query: string, k: number = 3): Promise<Document[]> {
    const queryEmbedding = await getEmbeddings(query);
    
    const results = Array.from(this.documents.values())
      .map(doc => ({
        doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(result => result.doc);

    return results;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  clear() {
    this.documents.clear();
  }

  getDocumentCount(): number {
    return this.documents.size;
  }

  getDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }
}

// Create a singleton instance
export const vectorStore = new VectorStore(); 