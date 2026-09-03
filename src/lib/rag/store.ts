/**
 * In-memory document store with BM25-style keyword similarity search.
 * Tracks document metadata (filename, upload date, chunk count) alongside chunks.
 * Deduplicates by sanitized filename.
 */

export interface StoredChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  index: number;
  terms: Map<string, number>;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  uploadedAt: string;
  chunkCount: number;
}

export interface SearchResult {
  chunk: StoredChunk;
  score: number;
  filename: string;
}

// Global in-memory stores
const chunks: StoredChunk[] = [];
const documents = new Map<string, DocumentMeta>();
let idCounter = 0;

// ============================================================
// Filename utilities
// ============================================================

/** Sanitize a filename: strip path components, dangerous chars, normalize unicode */
function sanitizeFilename(name: string): string {
  // Strip any path separators
  let clean = name.replace(/[/\\]/g, '');
  // Remove null bytes and control characters
  clean = clean.replace(/[\x00-\x1f\x7f]/g, '');
  // Replace problematic characters with underscore
  clean = clean.replace(/[<>:"|?*]/g, '_');
  // Collapse multiple underscores
  clean = clean.replace(/_{2,}/g, '_');
  // Trim whitespace and dots (Windows-incompatible)
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');
  // Fallback if empty
  return clean || 'unnamed_document';
}

/** Split filename into name and extension */
function splitExtension(filename: string): [string, string] {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return [filename, ''];
  return [filename.slice(0, lastDot), filename.slice(lastDot)];
}

/** Generate a unique filename by appending (1), (2), etc. if a collision exists */
function deduplicateFilename(requested: string): string {
  const existing = new Set(
    Array.from(documents.values()).map((d) => d.filename.toLowerCase())
  );

  if (!existing.has(requested.toLowerCase())) return requested;

  const [base, ext] = splitExtension(requested);
  let counter = 1;
  while (existing.has(`${base}(${counter})${ext}`.toLowerCase())) {
    counter++;
  }
  return `${base}(${counter})${ext}`;
}

// ============================================================
// Tokenization (BM25)
// ============================================================

function tokenize(text: string): Map<string, number> {
  const terms = new Map<string, number>();
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const word of words) {
    if (word.length < 2) continue;
    terms.set(word, (terms.get(word) || 0) + 1);
  }
  return terms;
}

// ============================================================
// Chunk operations
// ============================================================

/** Add a chunk to the store with document metadata */
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

/** Clear all chunks for a document */
export function clearDocument(documentId: string): void {
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].documentId === documentId) {
      chunks.splice(i, 1);
    }
  }
  documents.delete(documentId);
}

// ============================================================
// Document metadata operations
// ============================================================

/** Register a document with metadata, deduplicating by filename */
export function registerDocument(doc: {
  id: string;
  filename: string;
  fileSize: number;
}): DocumentMeta {
  const sanitized = sanitizeFilename(doc.filename);
  const deduped = deduplicateFilename(sanitized);

  const meta: DocumentMeta = {
    id: doc.id,
    filename: deduped,
    originalFilename: doc.filename,
    fileSize: doc.fileSize,
    uploadedAt: new Date().toISOString(),
    chunkCount: 0,
  };

  documents.set(doc.id, meta);
  return meta;
}

/** Update chunk count after chunking completes */
export function updateDocumentChunkCount(documentId: string, count: number): void {
  const meta = documents.get(documentId);
  if (meta) meta.chunkCount = count;
}

/** Get metadata for a single document */
export function getDocument(documentId: string): DocumentMeta | undefined {
  return documents.get(documentId);
}

/** Get all document metadata */
export function getAllDocuments(): DocumentMeta[] {
  return Array.from(documents.values());
}

/** Get all stored document IDs */
export function getDocumentIds(): string[] {
  return [...new Set(chunks.map((c) => c.documentId))];
}

/** Get chunk count for a document */
export function getChunkCount(documentId: string): number {
  return chunks.filter((c) => c.documentId === documentId).length;
}

/** Get total chunks in store */
export function getTotalChunks(): number {
  return chunks.length;
}

/** Find a document by filename (case-insensitive) */
export function findDocumentByFilename(filename: string): DocumentMeta | undefined {
  const lower = filename.toLowerCase();
  return Array.from(documents.values()).find(
    (d) => d.filename.toLowerCase() === lower || d.originalFilename.toLowerCase() === lower
  );
}

// ============================================================
// Search
// ============================================================

/** Search for relevant chunks using BM25-style scoring */
export function search(query: string, topK = 5): SearchResult[] {
  const queryTerms = tokenize(query);
  if (queryTerms.size === 0) return [];

  const avgDl = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + c.terms.size, 0) / chunks.length
    : 1;
  const N = chunks.length;
  const k1 = 1.5;
  const b = 0.75;

  const idf = new Map<string, number>();
  for (const [term] of queryTerms) {
    const df = chunks.filter((c) => c.terms.has(term)).length;
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  const scored: SearchResult[] = chunks.map((chunk) => {
    let score = 0;
    for (const [term] of queryTerms) {
      const chunkTf = chunk.terms.get(term) || 0;
      const termIdf = idf.get(term) || 0;
      const dl = chunk.terms.size;
      const numerator = chunkTf * (k1 + 1);
      const denominator = chunkTf + k1 * (1 - b + b * (dl / avgDl));
      score += termIdf * (numerator / denominator);
    }

    // Resolve filename from metadata
    const meta = documents.get(chunk.documentId);
    const filename = meta?.filename || chunk.documentName || 'unknown';

    return { chunk, score, filename };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
