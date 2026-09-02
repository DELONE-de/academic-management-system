// FILE: backend/src/ai/gemini.ts

import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { validationFunctionDeclarations, dispatchToolCall } from './validation.tools.js';
import { ReviewItemPayload } from '../types/index.js';
import {
  visionExtractPrompt,
  extractStudentsPrompt,
  extractResultsPrompt,
  validateStudentsPrompt,
  validateResultsPrompt,
  explainGPAPrompt,
} from './prompts.js';
import {
  groqExtractStudents,
  groqExtractResults,
  groqValidateWithTools,
  groqExplainGPA,
} from './groq.js';

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Flash is free tier: 15 req/min, 1M req/day
const MODEL = 'gemini-2.0-flash';

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ============================================================
// VISION — extract raw text from image or image-based PDF
// ============================================================

export async function geminiVisionExtract(
  base64: string,
  mimeType: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });

  const result = await model.generateContent([
    {
      inlineData: { data: base64, mimeType: mimeType as any },
    },
    visionExtractPrompt(),
  ]);

  return result.response.text();
}

// ============================================================
// STRUCTURED EXTRACTION — parse text/rows into typed records
// ============================================================

export type ExtractionType = 'students' | 'results';

export interface ExtractedStudent {
  rowNumber: number;
  matricNumber: string;
  firstName: string;
  lastName: string;
  departmentCode: string;
  admissionYear: number;
  studentLevel: string;
  email?: string;
  confidence: number;
}

export interface ExtractedResult {
  rowNumber: number;
  matricNumber: string;   // format: 2025/5337
  academicYear: string;
  courses: Array<{
    courseCode: string;
    score: number;
    confidence: number;
  }>;
  overallConfidence: number;
}

export async function geminiExtractStudents(
  content: string
): Promise<ExtractedStudent[]> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });
    const result = await model.generateContent([
      extractStudentsPrompt(content),
    ]);
    const text = result.response.text().trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('⚠️  Gemini quota exceeded — falling back to Groq');
      return groqExtractStudents(content);
    }
    return [];
  }
}

export async function geminiExtractResults(
  content: string,
  academicYear: string
): Promise<ExtractedResult[]> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });
    const result = await model.generateContent([
      extractResultsPrompt(content, academicYear),
    ]);
    const text = result.response.text().trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('⚠️  Gemini quota exceeded — falling back to Groq');
      return groqExtractResults(content, academicYear);
    }
    return [];
  }
}

// ============================================================
// FUNCTION-CALLING VALIDATION PASS
// Gemini reviews extracted records and calls validation tools
// ============================================================

export async function geminiValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<ReviewItemPayload[]> {
  try {
    return await _geminiValidateWithTools(records, type, departmentCode, onProgress);
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('⚠️  Gemini quota exceeded — falling back to Groq');
      return groqValidateWithTools(records, type, departmentCode, onProgress);
    }
    throw err;
  }
}

async function _geminiValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<ReviewItemPayload[]> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: SAFETY,
    tools: [{ functionDeclarations: validationFunctionDeclarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  const prompt =
    type === 'students'
      ? validateStudentsPrompt(records)
      : validateResultsPrompt(records, departmentCode);

  const chat = model.startChat();
  let response = await chat.sendMessage(prompt);
  const reviewItems: ReviewItemPayload[] = [];

  // Agentic loop — keep processing until Gemini stops calling functions
  while (true) {
    const calls = response.response.functionCalls();
    if (!calls || calls.length === 0) break;

    const toolResults = [];
    for (const call of calls) {
      onProgress?.(`Checking: ${call.name}(${JSON.stringify(call.args).slice(0, 60)}...)`);

      const toolResult = await dispatchToolCall(call.name, call.args as Record<string, any>);

      if (call.name === 'validateStudent' && toolResult.valid === false) {
        const record = records.find(
          (r) => r.matricNumber?.toUpperCase() === (call.args as any).matricNumber?.toUpperCase()
        );
        reviewItems.push({
          rowNumber: record?.rowNumber ?? 0,
          field: 'student',
          originalValue: (call.args as any).matricNumber,
          suggestedValue: Object.values((toolResult.suggestions ?? {}))[0] as string,
          confidence: toolResult.confidence,
          issueType: toolResult.issues[0]?.includes('duplicate') ? 'duplicate'
            : toolResult.issues[0]?.includes('not found') ? 'missing_student'
            : 'invalid_score',
          issueDetail: toolResult.issues.join('; '),
        });
      }

      if (call.name === 'validateCourse' && !toolResult.valid) {
        const record = records.find(
          (r) => r.matricNumber?.toUpperCase() === (call.args as any).matricNumber?.toUpperCase()
        );
        for (const ci of toolResult.courseIssues ?? []) {
          if (ci.issues.length > 0) {
            reviewItems.push({
              rowNumber: record?.rowNumber ?? 0,
              field: 'courseCode',
              originalValue: ci.courseCode,
              suggestedValue: Object.values(ci.suggestions ?? {})[0] as string,
              confidence: ci.confidence,
              issueType: ci.issues[0]?.includes('not found') ? 'wrong_course' : 'invalid_score',
              issueDetail: `${ci.courseCode}: ${ci.issues.join('; ')}`,
            });
          }
        }
      }

      if (call.name === 'checkRegistration' && toolResult.valid === false) {
        const record = records.find(
          (r) => r.matricNumber?.toUpperCase() === (call.args as any).matricNumber?.toUpperCase()
        );
        reviewItems.push({
          rowNumber: record?.rowNumber ?? 0,
          field: 'matricNumber',
          originalValue: (call.args as any).matricNumber,
          suggestedValue: Object.values(toolResult.suggestions ?? {})[0] as string,
          confidence: toolResult.confidence,
          issueType: toolResult.issues[0]?.includes('not found') ? 'missing_student'
            : toolResult.issues[0]?.includes('not offered') ? 'wrong_course'
            : 'unregistered',
          issueDetail: toolResult.issues.join('; '),
        });
      }

      if (call.name === 'findDuplicateStudents') {
        const { duplicatesInBatch, duplicatesInDb } = toolResult;
        for (const m of [...duplicatesInBatch, ...duplicatesInDb]) {
          const record = records.find(
            (r) => r.matricNumber?.toUpperCase() === m.toUpperCase()
          );
          reviewItems.push({
            rowNumber: record?.rowNumber ?? 0,
            field: 'matricNumber',
            originalValue: m,
            confidence: 0.95,
            issueType: 'duplicate',
            issueDetail: duplicatesInBatch.includes(m)
              ? 'Duplicate matric number within this upload batch'
              : 'Student already exists in the database',
          });
        }
      }

      if (call.name === 'saveResult') {
        if (toolResult.error) {
          const record = records.find(
            (r) => r.matricNumber?.toUpperCase() === (call.args as any).matricNumber?.toUpperCase()
          );
          reviewItems.push({
            rowNumber: record?.rowNumber ?? 0,
            field: 'matricNumber',
            originalValue: (call.args as any).matricNumber,
            confidence: 0.0,
            issueType: 'missing_student',
            issueDetail: toolResult.error,
          });
        } else {
          onProgress?.(`Saved ${toolResult.saved} result(s) for ${(call.args as any).matricNumber} — GPA recalculated`);
        }
      }

      toolResults.push({
        functionResponse: { name: call.name, response: toolResult },
      });
    }

    response = await chat.sendMessage(toolResults as any);
  }

  return reviewItems;
}

// ============================================================
// GPA EXPLANATION — plain language summary of a GPA calculation
// ============================================================

export async function geminiExplainGPA(data: {
  studentName: string;
  gpa: number;
  results: Array<{ courseCode: string; unit: number; score: number; grade: string; gradePoint: number; pxu: number }>;
  totalUnits: number;
  totalPoints: number;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });
    const result = await model.generateContent([
      explainGPAPrompt(data),
    ]);
    return result.response.text();
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('⚠️  Gemini quota exceeded — falling back to Groq');
      return groqExplainGPA(data);
    }
    return '';
  }
}
