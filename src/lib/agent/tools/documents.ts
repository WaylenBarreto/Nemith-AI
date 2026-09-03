import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  search,
  getDocumentIds,
  getChunkCount,
  getTotalChunks,
  getAllDocuments,
  getDocument,
} from '@/lib/rag/store';

// --- Search documents ---
export const searchDocumentsTool = tool(
  async ({ query, documentId }) => {
    const results = search(query, documentId ? 10 : 5);
    const filtered = documentId
      ? results.filter((r) => r.chunk.documentId === documentId)
      : results;

    if (filtered.length === 0) {
      const total = getTotalChunks();
      const docs = getDocumentIds().length;
      return `No relevant documents found for "${query}". Store has ${docs} document(s) with ${total} chunks total.`;
    }

    return filtered
      .map(
        (r, i) =>
          `[${i + 1}] filename: "${r.filename}" | chunk ${r.chunk.index + 1} | score: ${r.score.toFixed(2)}\n${r.chunk.content}`
      )
      .join('\n\n---\n\n');
  },
  {
    name: 'search_documents',
    description:
      'Search through uploaded documents for information relevant to a query. Returns relevant text chunks with source filename, chunk index, and relevance score. Use this when the user asks about their uploaded files, documents, or PDFs.',
    schema: z.object({
      query: z.string().describe('The search query to find relevant document content'),
      documentId: z.string().optional().describe('Optional: limit search to a specific document ID'),
    }),
  }
);

// --- List uploaded documents ---
export const listDocumentsTool = tool(
  async () => {
    const allDocs = getAllDocuments();
    if (allDocs.length === 0) return 'No documents uploaded yet.';

    const lines = allDocs.map((doc) => {
      const size = doc.fileSize < 1024
        ? `${doc.fileSize} B`
        : doc.fileSize < 1024 * 1024
        ? `${(doc.fileSize / 1024).toFixed(1)} KB`
        : `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`;

      return [
        `- ID: ${doc.id}`,
        `  Filename: ${doc.filename}`,
        `  Size: ${size}`,
        `  Chunks: ${doc.chunkCount}`,
        `  Uploaded: ${doc.uploadedAt}`,
      ].join('\n');
    });

    return lines.join('\n\n') + `\n\nTotal: ${allDocs.length} document(s), ${getTotalChunks()} chunks`;
  },
  {
    name: 'list_documents',
    description:
      'List all uploaded documents with their filenames, sizes, chunk counts, and upload dates. Returns document IDs that can be used with search_documents to filter by specific documents.',
    schema: z.object({}),
  }
);

// --- Get single document metadata ---
export const getDocumentTool = tool(
  async ({ documentId }) => {
    const doc = getDocument(documentId);
    if (!doc) {
      // Try to find by chunk count as fallback
      const allIds = getDocumentIds();
      if (allIds.includes(documentId)) {
        return [
          `Document ID: ${documentId}`,
          `Chunks: ${getChunkCount(documentId)}`,
          `(Metadata not available — document may have been uploaded before metadata tracking was added)`,
        ].join('\n');
      }
      return `Document not found: ${documentId}. Use list_documents to see available documents.`;
    }

    const size = doc.fileSize < 1024
      ? `${doc.fileSize} B`
      : doc.fileSize < 1024 * 1024
      ? `${(doc.fileSize / 1024).toFixed(1)} KB`
      : `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`;

    return [
      `Document: ${doc.filename}`,
      `ID: ${doc.id}`,
      `Original name: ${doc.originalFilename}`,
      `Size: ${size}`,
      `Chunks: ${doc.chunkCount}`,
      `Uploaded: ${doc.uploadedAt}`,
    ].join('\n');
  },
  {
    name: 'get_document',
    description:
      'Get full metadata for a specific document by its ID. Returns filename, original name, file size, chunk count, and upload date.',
    schema: z.object({
      documentId: z.string().describe('The document ID (from list_documents)'),
    }),
  }
);

export const documentTools = [searchDocumentsTool, listDocumentsTool, getDocumentTool];
