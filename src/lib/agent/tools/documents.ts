import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { search, getDocumentIds, getChunkCount, getTotalChunks } from '@/lib/rag/store';

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
          `[${i + 1}] (from ${r.chunk.documentName}, chunk ${r.chunk.index + 1}, score: ${r.score.toFixed(2)})\n${r.chunk.content}`
      )
      .join('\n\n---\n\n');
  },
  {
    name: 'search_documents',
    description:
      'Search through uploaded documents for information relevant to a query. Returns the most relevant text chunks. Use this when the user asks about their uploaded files, documents, or PDFs.',
    schema: z.object({
      query: z.string().describe('The search query to find relevant document content'),
      documentId: z.string().optional().describe('Optional: limit search to a specific document ID'),
    }),
  }
);

// --- List uploaded documents ---
export const listDocumentsTool = tool(
  async () => {
    const { getDocumentIds, getChunkCount, getTotalChunks } = await import('@/lib/rag/store');
    const docIds = getDocumentIds();
    if (docIds.length === 0) return 'No documents uploaded yet.';
    return docIds
      .map((id) => `- Document ${id}: ${getChunkCount(id)} chunks`)
      .join('\n') + `\n\nTotal: ${docIds.length} document(s), ${getTotalChunks()} chunks`;
  },
  {
    name: 'list_documents',
    description: 'List all uploaded documents available for search. Use this to know what documents exist before searching them.',
    schema: z.object({}),
  }
);

export const documentTools = [searchDocumentsTool, listDocumentsTool];
