/**
 * Extract text from uploaded files.
 * Supports: PDF, TXT, Markdown, DOCX
 */

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'txt':
    case 'md':
      return buffer.toString('utf-8');
    case 'pdf':
      return extractPdf(buffer);
    case 'docx':
      return extractDocx(buffer);
    default:
      return buffer.toString('utf-8');
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    throw new Error(`Failed to parse PDF: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (e) {
    throw new Error(`Failed to parse DOCX: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
