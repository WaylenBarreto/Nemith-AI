import { NextRequest } from 'next/server';
import { extractText } from '@/lib/rag/extractor';
import { chunkText } from '@/lib/rag/chunker';
import { addChunk, clearDocument, registerDocument, updateDocumentChunkCount, getAllDocuments, getDocument, findDocumentByFilename } from '@/lib/rag/store';
import { dbGetDocuments, dbCreateDocument, dbUpdateDocument, dbDeleteDocument } from '@/lib/supabase/db';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle JSON requests (DB operations)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'create_db': {
          const doc = await dbCreateDocument({
            filename: body.filename,
            fileType: body.fileType,
            fileSize: body.fileSize,
            projectId: body.projectId,
          });
          return Response.json({ document: doc });
        }

        case 'update': {
          await dbUpdateDocument(body.id, { status: body.status, chunkCount: body.chunkCount });
          return Response.json({ success: true });
        }

        case 'delete': {
          await dbDeleteDocument(body.id);
          return Response.json({ success: true });
        }

        default:
          return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    }

    // Handle FormData requests (file upload + RAG)
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

    // Check for duplicate by filename
    const existing = findDocumentByFilename(file.name);
    if (existing && existing.id !== documentId) {
      // Clear old chunks and re-register
      clearDocument(existing.id);
    }

    // Register document metadata (handles sanitization + deduplication)
    const meta = registerDocument({
      id: documentId,
      filename: file.name,
      fileSize: file.size,
    });

    // Clear any existing chunks for this document
    clearDocument(documentId);
    // Re-register after clear (clearDocument deletes metadata)
    const finalMeta = registerDocument({
      id: documentId,
      filename: file.name,
      fileSize: file.size,
    });

    // Chunk and store
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      addChunk(documentId, finalMeta.filename, chunk.content, chunk.index);
    }

    // Update chunk count in metadata
    updateDocumentChunkCount(documentId, chunks.length);

    return Response.json({
      success: true,
      documentId,
      filename: finalMeta.filename,
      originalFilename: finalMeta.originalFilename,
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
  try {
    // Try Supabase first, fall back to in-memory store
    try {
      const documents = await dbGetDocuments();
      return Response.json({ documents });
    } catch {
      // Supabase not configured, use in-memory store
      const allDocs = getAllDocuments();
      return Response.json({
        documents: allDocs.map((doc) => ({
          id: doc.id,
          filename: doc.filename,
          fileType: doc.filename.split('.').pop() || 'txt',
          fileSize: doc.fileSize,
          chunkCount: doc.chunkCount,
          uploadedAt: doc.uploadedAt,
          status: 'ready',
        })),
      });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load documents' },
      { status: 500 }
    );
  }
}
