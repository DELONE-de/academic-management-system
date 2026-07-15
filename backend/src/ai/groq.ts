// FILE: backend/src/ai/groq.ts
// Groq fallback — used when Gemini hits quota limits (429)
// Handles the same structured extraction and validation loop using llama-3.3-70b

import Groq from 'groq-sdk';
import { dispatchToolCall } from './validation.tools.js';
import { ReviewItemPayload } from '../types/index.js';
import type { ExtractionType, ExtractedStudent, ExtractedResult } from './gemini.js';

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
        content: `You are extracting student records from the following content.
Return a JSON array of student objects with these fields:
rowNumber, matricNumber, firstName, lastName, departmentCode, admissionYear, studentLevel, email (optional), confidence (0.0-1.0).

confidence: 1.0=all fields clear, 0.7-0.9=minor issues, 0.4-0.6=ambiguous, <0.4=major issues.

Return ONLY a valid JSON array, no markdown, no explanation.

Content:
${content}`,
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
        content: `You are extracting student score records from the following content.
Each student can have MULTIPLE courses and scores.
The academic year for ALL records is "${academicYear}".

Return a JSON array where each element represents ONE student row with ALL their courses:
{
  rowNumber: number,
  matricNumber: string,
  academicYear: "${academicYear}",
  courses: [{ courseCode: string, score: number, confidence: number }],
  overallConfidence: number
}

Return ONLY a valid JSON array, no markdown.

Content:
${content}`,
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
// FUNCTION-CALLING VALIDATION PASS (Groq tool_calls)
// ============================================================

// Mirror the Gemini function declarations as Groq tool definitions
const groqTools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'checkRegistration',
      description: 'Check if a student exists and is registered for the given courses',
      parameters: {
        type: 'object',
        properties: {
          matricNumber: { type: 'string' },
          departmentCode: { type: 'string' },
          courseCodes: { type: 'array', items: { type: 'string' } },
        },
        required: ['matricNumber', 'departmentCode', 'courseCodes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validateCourse',
      description: 'Validate course codes and scores for a student',
      parameters: {
        type: 'object',
        properties: {
          matricNumber: { type: 'string' },
          departmentCode: { type: 'string' },
          academicYear: { type: 'string' },
          courses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                courseCode: { type: 'string' },
                score: { type: 'number' },
              },
              required: ['courseCode', 'score'],
            },
          },
        },
        required: ['matricNumber', 'departmentCode', 'academicYear', 'courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveResult',
      description: 'Save validated results for a student',
      parameters: {
        type: 'object',
        properties: {
          matricNumber: { type: 'string' },
          departmentCode: { type: 'string' },
          academicYear: { type: 'string' },
          courses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                courseCode: { type: 'string' },
                score: { type: 'number' },
              },
              required: ['courseCode', 'score'],
            },
          },
        },
        required: ['matricNumber', 'departmentCode', 'academicYear', 'courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validateStudent',
      description: 'Validate a student record',
      parameters: {
        type: 'object',
        properties: {
          matricNumber: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          departmentCode: { type: 'string' },
          admissionYear: { type: 'number' },
          studentLevel: { type: 'string' },
        },
        required: ['matricNumber', 'departmentCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'findDuplicateStudents',
      description: 'Find duplicate matric numbers in the batch and in the database',
      parameters: {
        type: 'object',
        properties: {
          matricNumbers: { type: 'array', items: { type: 'string' } },
          departmentCode: { type: 'string' },
        },
        required: ['matricNumbers', 'departmentCode'],
      },
    },
  },
];

export async function groqValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<ReviewItemPayload[]> {
  const prompt =
    type === 'students'
      ? `Validate these student records by calling validateStudent for each one, then call findDuplicateStudents with all matric numbers at the end.
Records: ${JSON.stringify(records)}`
      : `Validate and save these score records. Department code is "${departmentCode}".
For each student row:
1. Call checkRegistration with their matricNumber, departmentCode "${departmentCode}", and all their courseCodes
2. Call validateCourse with departmentCode "${departmentCode}", academicYear, and all their courses
3. If BOTH pass, call saveResult
4. If either fails, do NOT call saveResult
Process all students. Pass all courses in one call per student.
Records: ${JSON.stringify(records)}`;

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'user', content: prompt },
  ];

  const reviewItems: ReviewItemPayload[] = [];

  // Agentic loop — keep going until no more tool calls
  while (true) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: groqTools,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const message = response.choices[0].message;
    messages.push(message as Groq.Chat.Completions.ChatCompletionMessageParam);

    if (!message.tool_calls || message.tool_calls.length === 0) break;

    const toolResults: Groq.Chat.Completions.ChatCompletionToolMessageParam[] = [];

    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments);
      onProgress?.(`Checking: ${call.function.name}(${JSON.stringify(args).slice(0, 60)}...)`);

      const toolResult = await dispatchToolCall(call.function.name, args);

      // Same review item logic as Gemini
      if (call.function.name === 'validateStudent' && toolResult.valid === false) {
        const record = records.find((r) => r.matricNumber?.toUpperCase() === args.matricNumber?.toUpperCase());
        reviewItems.push({
          rowNumber: record?.rowNumber ?? 0,
          field: 'student',
          originalValue: args.matricNumber,
          suggestedValue: Object.values(toolResult.suggestions ?? {})[0] as string,
          confidence: toolResult.confidence,
          issueType: toolResult.issues[0]?.includes('duplicate') ? 'duplicate'
            : toolResult.issues[0]?.includes('not found') ? 'missing_student' : 'invalid_score',
          issueDetail: toolResult.issues.join('; '),
        });
      }

      if (call.function.name === 'validateCourse' && !toolResult.valid) {
        const record = records.find((r) => r.matricNumber?.toUpperCase() === args.matricNumber?.toUpperCase());
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

      if (call.function.name === 'checkRegistration' && toolResult.valid === false) {
        const record = records.find((r) => r.matricNumber?.toUpperCase() === args.matricNumber?.toUpperCase());
        reviewItems.push({
          rowNumber: record?.rowNumber ?? 0,
          field: 'matricNumber',
          originalValue: args.matricNumber,
          suggestedValue: Object.values(toolResult.suggestions ?? {})[0] as string,
          confidence: toolResult.confidence,
          issueType: toolResult.issues[0]?.includes('not found') ? 'missing_student'
            : toolResult.issues[0]?.includes('not offered') ? 'wrong_course' : 'unregistered',
          issueDetail: toolResult.issues.join('; '),
        });
      }

      if (call.function.name === 'findDuplicateStudents') {
        const { duplicatesInBatch, duplicatesInDb } = toolResult;
        for (const m of [...(duplicatesInBatch ?? []), ...(duplicatesInDb ?? [])]) {
          const record = records.find((r) => r.matricNumber?.toUpperCase() === m.toUpperCase());
          reviewItems.push({
            rowNumber: record?.rowNumber ?? 0,
            field: 'matricNumber',
            originalValue: m,
            confidence: 0.95,
            issueType: 'duplicate',
            issueDetail: (duplicatesInBatch ?? []).includes(m)
              ? 'Duplicate matric number within this upload batch'
              : 'Student already exists in the database',
          });
        }
      }

      if (call.function.name === 'saveResult') {
        if (toolResult.error) {
          const record = records.find((r) => r.matricNumber?.toUpperCase() === args.matricNumber?.toUpperCase());
          reviewItems.push({
            rowNumber: record?.rowNumber ?? 0,
            field: 'matricNumber',
            originalValue: args.matricNumber,
            confidence: 0.0,
            issueType: 'missing_student',
            issueDetail: toolResult.error,
          });
        } else {
          onProgress?.(`Saved ${toolResult.saved} result(s) for ${args.matricNumber} — GPA recalculated`);
        }
      }

      toolResults.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      });
    }

    messages.push(...toolResults);
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
        content: `Explain in 2-3 plain sentences why ${data.studentName} has a GPA of ${data.gpa.toFixed(2)}.

Results: ${JSON.stringify(data.results)}
Total units: ${data.totalUnits}, Total quality points: ${data.totalPoints.toFixed(2)}

Be specific — mention the courses that pulled the GPA up or down.
Write for a non-technical audience (lecturers, HODs).`,
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content || '';
}
