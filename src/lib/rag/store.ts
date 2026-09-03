/**
 * In-memory document store with BM25-style keyword similarity search.
 * No embeddings API needed — works out of the box.
 */

export interface StoredChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  index: number;
  terms: Map<string, number>; // term frequency
}

export interface SearchResult {
  chunk: StoredChunk;
  score: number;
}

// Global in-memory store (resets on server restart)
const chunks: StoredChunk[] = [];
let idCounter = 0;

/**
 * Tokenize text into terms (lowercase, split on non-alphanumeric).
 */
function tokenize(text: string): Map<string, number> {
  const terms = new Map<string, number>();
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const word of words) {
    if (word.length < 2) continue;
    terms.set(word, (terms.get(word) || 0) + 1);
  }
  return terms;
}

/**
 * Add a chunk to the store.
 */
export function addChunk(
  documentId: string,
  documentName: string,
  content: string,
  index: number
): string {
  const id = `chunk_${++idCounter}`;
  chunks.push({
    id,
    documentId,
    documentName,
    content,
    index,
    terms: tokenize(content),
  });
  return id;
}

/**
 * Clear all chunks for a document.
 */
export function clearDocument(documentId: string): void {
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].documentId === documentId) {
      chunks.splice(i, 1);
    }
  }
}

/**
 * Search for relevant chunks using BM25-style scoring.
 */
export function search(query: string, topK = 5): SearchResult[] {
  const queryTerms = tokenize(query);
  if (queryTerms.size === 0) return [];

  const avgDl = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + c.terms.size, 0) / chunks.length
    : 1;
  const N = chunks.length;
  const k1 = 1.5;
  const b = 0.75;

  // IDF for each query term
  const idf = new Map<string, number>();
  for (const [term] of queryTerms) {
    const df = chunks.filter((c) => c.terms.has(term)).length;
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  // Score each chunk
  const scored: SearchResult[] = chunks.map((chunk) => {
    let score = 0;
    for (const [term, tf] of queryTerms) {
      const chunkTf = chunk.terms.get(term) || 0;
      const termIdf = idf.get(term) || 0;
      const dl = chunk.terms.size;
      const numerator = chunkTf * (k1 + 1);
      const denominator = chunkTf + k1 * (1 - b + b * (dl / avgDl));
      score += termIdf * (numerator / denominator);
    }
    return { chunk, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Get all stored document IDs.
 */
export function getDocumentIds(): string[] {
  return [...new Set(chunks.map((c) => c.documentId))];
}

/**
 * Get chunk count for a document.
 */
export function getChunkCount(documentId: string): number {
  return chunks.filter((c) => c.documentId === documentId).length;
}

/**
 * Get total chunks in store.
 */
export function getTotalChunks(): number {
  return chunks.length;
}
