// src/ai/prompts.ts
// Centralized AI prompt engineering — all prompts live here, versioned, with documented
// expected inputs/outputs. Keep prompts out of controllers/services for maintainability.

/**
 * Vision — extract raw text from an image-based document.
 */
export function visionExtractPrompt(): string {
  return `Extract all text from this document exactly as it appears.
Focus on tabular data: student names, matric numbers, course codes, and scores.
Preserve the table structure using | as column separators.
Do not summarize or interpret — output raw text only.`;
}

/**
 * Student record extraction.
 */
export function extractStudentsPrompt(content: string): string {
  return `You are extracting student records from academic documents.

Return a JSON array of student objects with these fields:
rowNumber, matricNumber, firstName, lastName, departmentCode, admissionYear, studentLevel, email (optional), confidence (0.0-1.0).

confidence rules:
- 1.0 = all fields clearly present and well-formatted
- 0.7-0.9 = minor formatting issues but data is clear
- 0.4-0.6 = some fields ambiguous or missing
- below 0.4 = major issues

Return ONLY valid JSON array, no markdown, no explanation.

Content:
${content}`;
}

/**
 * Result/score record extraction.
 */
export function extractResultsPrompt(content: string, academicYear: string): string {
  return `You are extracting student score records from academic documents.
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
${content}`;
}

/**
 * Validation pass — tells the model to use the validation tools.
 */
export function validateStudentsPrompt(records: any[]): string {
  return `Validate these student records by calling validateStudent for each one,
then call findDuplicateStudents with all matric numbers at the end.
Records: ${JSON.stringify(records)}`;
}

export function validateResultsPrompt(records: any[], departmentCode: string): string {
  const sanitized = JSON.stringify(records.map(({ rawRecord: _, ...r }) => r));
  return `Validate and save these score records. Department code is "${departmentCode}" (from the system — do not read from file).
For each student row, follow this exact sequence:
1. Call checkRegistration with matricNumber, departmentCode "${departmentCode}", and ALL their courseCodes
2. Call validateCourse with departmentCode "${departmentCode}", academicYear, and ALL their courses (courseCode + score)
3. If BOTH pass (no issues), call saveResult with matricNumber, departmentCode "${departmentCode}", academicYear, and the courses array
4. If either check fails, do NOT call saveResult — flag the issues instead
Process all students. Pass all courses in one call per student — do not call per course.
Records: ${sanitized}`;
}

/**
 * GPA explanation — grounded in verified academic data only.
 */
export function explainGPAPrompt(data: {
  studentName: string;
  gpa: number;
  results: Array<{ courseCode: string; unit: number; score: number; grade: string; gradePoint: number; pxu: number }>;
  totalUnits: number;
  totalPoints: number;
}): string {
  return `Explain in 2-3 plain sentences why ${data.studentName} has a GPA of ${data.gpa.toFixed(2)}.

Results: ${JSON.stringify(data.results)}
Total units: ${data.totalUnits}, Total quality points: ${data.totalPoints.toFixed(2)}

Be specific — mention the courses that pulled the GPA up or down.
Write for a non-technical audience (lecturers, HODs).
Do not invent any facts that are not in the Results above.`;
}

/**
 * v1 prompt set.
 */
export const PROMPT_VERSION = 'v1';
