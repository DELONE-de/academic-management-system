// FILE: backend/src/utils/file-extractor.ts

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { parseExcelBuffer, parseStudentRows, parseScoreRows } from './excel.js';
import { geminiVisionExtract } from '../ai/gemini.js';

export type ExtractedFileContent =
  | { type: 'structured'; rows: any[]; format: 'excel' | 'csv' }
  | { type: 'text'; text: string; format: 'pdf' }
  | { type: 'image'; base64: string; mimeType: string; format: 'image' };

/**
 * Extract raw content from any supported file type.
 * Structured files (Excel/CSV) are parsed to rows immediately.
 * PDF and images are returned as text/base64 for Gemini to interpret.
 */
export async function extractFileContent(
  buffer: Buffer,
  fileType: string,
  mimeType: string
): Promise<ExtractedFileContent> {
  switch (fileType) {
    case 'excel':
    case 'csv': {
      const raw = parseExcelBuffer<any>(buffer);
      return { type: 'structured', rows: raw, format: fileType };
    }

    case 'pdf': {
      try {
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim();

        if (text && text.length > 50) {
          return { type: 'text', text, format: 'pdf' };
        }

        // Image-based PDF — use Gemini vision once
        const base64 = buffer.toString('base64');
        const extracted = await geminiVisionExtract(base64, 'application/pdf');
        return { type: 'text', text: extracted, format: 'pdf' };
      } catch {
        const base64 = buffer.toString('base64');
        const text = await geminiVisionExtract(base64, 'application/pdf');
        return { type: 'text', text, format: 'pdf' };
      }
    }

    case 'image': {
      const base64 = buffer.toString('base64');
      return { type: 'image', base64, mimeType, format: 'image' };
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
