// FILE: backend/src/ai/gemini.ts

import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { validationFunctionDeclarations, dispatchToolCall } from './validation.tools.js';
import { ReviewItemPayload } from '../types/index.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Flash is free tier: 15 req/min, 1M req/day
const MODEL = 'gemini-1.5-flash';

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
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
    `Extract all text from this document exactly as it appears. 
     Focus on tabular data: student names, matric numbers, course codes, and scores.
     Preserve the table structure using | as column separators.
     Do not summarize or interpret — output raw text only.`,
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
  const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });

  const result = await model.generateContent([
    `You are extracting student records from the following content.
     Return a JSON array of student objects with these fields:
     rowNumber, matricNumber, firstName, lastName, departmentCode, admissionYear, studentLevel, email (optional), confidence (0.0-1.0).
     
     confidence rules:
     - 1.0 = all fields clearly present and well-formatted
     - 0.7-0.9 = minor formatting issues but data is clear
     - 0.4-0.6 = some fields ambiguous or missing
     - below 0.4 = major issues
     
     Return ONLY valid JSON array, no markdown, no explanation.
     
     Content:
     ${content}`,
  ]);

  try {
    const text = result.response.text().trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function geminiExtractResults(
  content: string,
  academicYear: string
): Promise<ExtractedResult[]> {
  const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });

  const result = await model.generateContent([
    `You are extracting student score records from the following content.
     Each student can have MULTIPLE courses and scores.
     Matric number format is YYYY/NNNN e.g. 2025/5337 — extract exactly as written.
     The academic year for ALL records is "${academicYear}" — do not read it from the content.
     
     Return a JSON array where each element represents ONE student row with ALL their courses:
     {
       rowNumber: number,
       matricNumber: string,   // e.g. "2025/5337"
       academicYear: "${academicYear}",
       courses: [
         { courseCode: string, score: number, confidence: number },
         ...
       ],
       overallConfidence: number  // lowest confidence across all courses
     }
     
     Per-course confidence:
     - 1.0 = course code and score clearly readable
     - 0.7-0.9 = minor ambiguity
     - 0.4-0.6 = course code or score unclear
     - below 0.4 = unreadable
     
     Return ONLY valid JSON array, no markdown.
     
     Content:
     ${content}`,
  ]);

  try {
    const text = result.response.text().trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch {
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
  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: SAFETY,
    tools: [{ functionDeclarations: validationFunctionDeclarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  const prompt =
    type === 'students'
      ? `Validate these student records by calling validateStudent for each one,
         then call findDuplicateStudents with all matric numbers at the end.
         Records: ${JSON.stringify(records)}`
      : `Validate and save these score records. Department code is "${departmentCode}" (from the system — do not read from file).
         For each student row, follow this exact sequence:
         1. Call checkRegistration with matricNumber, departmentCode "${departmentCode}", and ALL their courseCodes
         2. Call validateCourse with departmentCode "${departmentCode}", academicYear, and ALL their courses (courseCode + score)
         3. If BOTH pass (no issues), call saveResult with matricNumber, departmentCode "${departmentCode}", academicYear, and the courses array
         4. If either check fails, do NOT call saveResult — flag the issues instead
         Process all students. Pass all courses in one call per student — do not call per course.
         Records: ${JSON.stringify(records)}`;

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

      // Convert failed validations into ReviewItems
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

      // validateCourse returns per-course issues
      if (call.name === 'validateCourse' && !toolResult.valid) {
        const record = records.find(
          (r) => r.departmentCode?.toUpperCase() === (call.args as any).departmentCode?.toUpperCase()
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

      // checkRegistration returns student-level + per-course issues
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

      // saveResult — just log progress, no ReviewItem needed on success
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
  const model = genAI.getGenerativeModel({ model: MODEL, safetySettings: SAFETY });

  const result = await model.generateContent([
    `Explain in 2-3 plain sentences why ${data.studentName} has a GPA of ${data.gpa.toFixed(2)}.
     
     Results: ${JSON.stringify(data.results)}
     Total units: ${data.totalUnits}, Total quality points: ${data.totalPoints.toFixed(2)}
     
     Be specific — mention the courses that pulled the GPA up or down.
     Write for a non-technical audience (lecturers, HODs).`,
  ]);

  return result.response.text();
}
