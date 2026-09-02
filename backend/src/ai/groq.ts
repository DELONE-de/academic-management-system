// FILE: backend/src/ai/groq.ts
// Groq fallback — used when Gemini hits quota limits (429)
// Handles the same structured extraction and validation loop using llama-3.3-70b

import Groq from 'groq-sdk';
import { dispatchToolCall } from './validation.tools.js';
import { ReviewItemPayload } from '../types/index.js';
import type { ExtractionType, ExtractedStudent, ExtractedResult } from './gemini.js';
import { extractStudentsPrompt, extractResultsPrompt, explainGPAPrompt } from './prompts.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const MODEL = 'llama-3.3-70b-versatile';

// ============================================================
// STRUCTURED EXTRACTION
// ============================================================

export async function groqExtractStudents(content: string): Promise<ExtractedStudent[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: extractStudentsPrompt(content),
      },
    ],
    temperature: 0.1,
  });

  try {
    const text = (completion.choices[0].message.content || '').trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function groqExtractResults(
  content: string,
  academicYear: string
): Promise<ExtractedResult[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: extractResultsPrompt(content, academicYear),
      },
    ],
    temperature: 0.1,
  });

  try {
    const text = (completion.choices[0].message.content || '').trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// ============================================================
// DIRECT VALIDATION — no LLM, calls tools directly
// Groq is only used for extraction; validation doesn't need an LLM
// since records are already structured at this point.
// ============================================================
export async function groqValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<ReviewItemPayload[]> {
  const reviewItems: ReviewItemPayload[] = [];

  if (type === 'students') {
    for (const record of records) {
      onProgress?.(`Validating student ${record.matricNumber}...`);
      const result = await dispatchToolCall('validateStudent', {
        matricNumber: record.matricNumber,
        firstName: record.firstName,
        lastName: record.lastName,
        departmentCode: record.departmentCode ?? departmentCode,
        admissionYear: record.admissionYear,
        studentLevel: record.studentLevel,
      });
      if (result.valid === false) {
        reviewItems.push({
          rowNumber: record.rowNumber ?? 0,
          field: 'student',
          originalValue: record.matricNumber,
          suggestedValue: Object.values(result.suggestions ?? {})[0] as string,
          confidence: result.confidence,
          issueType: result.issues[0]?.includes('duplicate') ? 'duplicate'
            : result.issues[0]?.includes('not found') ? 'missing_student' : 'invalid_score',
          issueDetail: result.issues.join('; '),
        });
      }
    }
    // duplicate check
    const dupResult = await dispatchToolCall('findDuplicateStudents', {
      matricNumbers: records.map((r) => r.matricNumber),
      departmentCode,
    });
    for (const m of [...(dupResult.duplicatesInBatch ?? []), ...(dupResult.duplicatesInDb ?? [])]) {
      const record = records.find((r) => r.matricNumber?.toUpperCase() === m.toUpperCase());
      reviewItems.push({
        rowNumber: record?.rowNumber ?? 0,
        field: 'matricNumber',
        originalValue: m,
        confidence: 0.95,
        issueType: 'duplicate',
        issueDetail: (dupResult.duplicatesInBatch ?? []).includes(m)
          ? 'Duplicate matric number within this upload batch'
          : 'Student already exists in the database',
      });
    }
  } else {
    for (const record of records) {
      const { matricNumber, academicYear, courses } = record;
      const courseCodes = (courses ?? []).map((c: any) => c.courseCode);
      onProgress?.(`Checking registration: ${matricNumber}...`);

      const regResult = await dispatchToolCall('checkRegistration', { matricNumber, departmentCode, courseCodes });
      if (regResult.valid === false) {
        reviewItems.push({
          rowNumber: record.rowNumber ?? 0,
          field: 'matricNumber',
          originalValue: matricNumber,
          suggestedValue: Object.values(regResult.suggestions ?? {})[0] as string,
          confidence: regResult.confidence,
          issueType: regResult.issues[0]?.includes('not found') ? 'missing_student'
            : regResult.issues[0]?.includes('not offered') ? 'wrong_course' : 'unregistered',
          issueDetail: regResult.issues.join('; '),
        });
        continue;
      }

      const courseResult = await dispatchToolCall('validateCourse', { matricNumber, departmentCode, academicYear, courses });
      if (!courseResult.valid) {
        for (const ci of courseResult.courseIssues ?? []) {
          if (ci.issues.length > 0) {
            reviewItems.push({
              rowNumber: record.rowNumber ?? 0,
              field: 'courseCode',
              originalValue: ci.courseCode,
              suggestedValue: Object.values(ci.suggestions ?? {})[0] as string,
              confidence: ci.confidence,
              issueType: ci.issues[0]?.includes('not found') ? 'wrong_course' : 'invalid_score',
              issueDetail: `${ci.courseCode}: ${ci.issues.join('; ')}`,
            });
          }
        }
        continue;
      }

      onProgress?.(`Saving results: ${matricNumber}...`);
      const saveResult = await dispatchToolCall('saveResult', { matricNumber, departmentCode, academicYear, courses });
      if (saveResult.error) {
        reviewItems.push({
          rowNumber: record.rowNumber ?? 0,
          field: 'matricNumber',
          originalValue: matricNumber,
          confidence: 0.0,
          issueType: 'missing_student',
          issueDetail: saveResult.error,
        });
      } else {
        onProgress?.(`Saved ${saveResult.saved} result(s) for ${matricNumber} — GPA recalculated`);
      }
    }
  }

  return reviewItems;
}

export async function groqExplainGPA(data: {
  studentName: string;
  gpa: number;
  results: Array<{ courseCode: string; unit: number; score: number; grade: string; gradePoint: number; pxu: number }>;
  totalUnits: number;
  totalPoints: number;
}): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: explainGPAPrompt(data),
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content || '';
}
