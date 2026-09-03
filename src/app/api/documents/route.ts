import { NextRequest } from 'next/server';
import { extractText } from '@/lib/rag/extractor';
import { chunkText } from '@/lib/rag/chunker';
import { addChunk, clearDocument } from '@/lib/rag/store';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentId = formData.get('documentId') as string | null;

    if (!file || !documentId) {
      return Response.json({ error: 'file and documentId are required' }, { status: 400 });
    }

    // Determine file type from extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const validTypes = ['pdf', 'txt', 'md', 'docx'];
    if (!validTypes.includes(ext)) {
      return Response.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const text = await extractText(buffer, ext);
    if (!text.trim()) {
      return Response.json({ error: 'No text could be extracted from the file' }, { status: 400 });
    }

    // Clear any existing chunks for this document
    clearDocument(documentId);

    // Chunk and store
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      addChunk(documentId, file.name, chunk.content, chunk.index);
    }

    return Response.json({
      success: true,
      documentId,
      filename: file.name,
      fileType: ext,
      fileSize: file.size,
      chunkCount: chunks.length,
      textLength: text.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { getDocumentIds, getChunkCount, getTotalChunks } = await import('@/lib/rag/store');
  const docIds = getDocumentIds();
  return Response.json({
    documentCount: docIds.length,
    totalChunks: getTotalChunks(),
    documents: docIds.map((id) => ({ id, chunks: getChunkCount(id) })),
  });
}
