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
    const { PDFParse, VerbosityLevel } = await import('pdf-parse');

    // Disable the web worker — we're running server-side in Next.js
    // where the worker .mjs file isn't bundled. This forces pdfjs-dist
    // to run synchronously in the main thread, which is fine for our use case.
    try { (PDFParse as any).setWorker(undefined); } catch {}

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      verbosity: VerbosityLevel.ERRORS,
    });

    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
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
