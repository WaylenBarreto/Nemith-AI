/**
 * Text chunking for RAG.
 * Splits text into overlapping chunks of ~500 characters.
 */

export interface Chunk {
  content: string;
  index: number;
  startOffset: number;
}

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;

/**
 * Split text into overlapping chunks.
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): Chunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    let chunkEnd = end;

    // Try to break at a sentence or word boundary
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end);
      const lastNewline = cleaned.lastIndexOf('\n', end);
      const breakAt = Math.max(lastPeriod, lastNewline);
      if (breakAt > start + chunkSize * 0.5) {
        chunkEnd = breakAt + 1;
      }
    }

    const content = cleaned.slice(start, chunkEnd).trim();
    if (content) {
      chunks.push({ content, index, startOffset: start });
      index++;
    }

    start = chunkEnd - overlap;
    if (start <= chunks[chunks.length - 1]?.startOffset) break;
  }

  return chunks;
}
