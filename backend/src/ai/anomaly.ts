// src/ai/anomaly.ts
// Deterministic anomaly detection for AI-extracted academic records.
// These checks run AFTER AI extraction and BEFORE persistence, providing
// an additional layer of validation that the AI model cannot bypass.
// No AI is involved in these checks — they are pure deterministic rules.

import { prisma } from '../config/database.js';

export interface Anomaly {
  rowNumber: number;
  type: 'score_range' | 'grade_mismatch' | 'duplicate_result' | 'suspicious_score_pattern' | 'missing_credit_unit' | 'course_level_mismatch' | 'inconsistent_academic_session';
  detail: string;
  confidence: number;
}

/**
 * Check if a score is suspicious (e.g., many courses have the exact same score).
 */
export function detectSuspiciousScorePattern(
  courses: Array<{ courseCode: string; score: number }>,
): Anomaly[] {
  const results: Anomaly[] = [];
  if (courses.length < 3) return results;

  const scores = courses.map((c) => c.score);
  // All same score across 3+ courses is suspicious
  if (new Set(scores).size === 1 && courses.length >= 3) {
    results.push({
      rowNumber: 0,
      type: 'suspicious_score_pattern',
      detail: `All ${courses.length} courses have the same score (${scores[0]}). This may indicate data entry error.`,
      confidence: 0.7,
    });
  }

  return results;
}

/**
 * Check if a score would result in an unexpected grade given the pass mark.
 */
export function detectScoreGradeMismatch(
  courseCode: string,
  score: number,
  passMark: number,
): Anomaly[] {
  const results: Anomaly[] = [];
  const isPassing = score >= passMark;

  if (score >= 0 && score <= 5 && isPassing) {
    results.push({
      rowNumber: 0,
      type: 'grade_mismatch',
      detail: `Score ${score} for ${courseCode} is unusually low but would be passing.`,
      confidence: 0.5,
    });
  }

  if (score >= 98 && score <= 100 && !isPassing) {
    results.push({
      rowNumber: 0,
      type: 'grade_mismatch',
      detail: `Score ${score} for ${courseCode} is very high but would not pass (pass mark: ${passMark}).`,
      confidence: 0.8,
    });
  }

  return results;
}

/**
 * Check for an existing Result record that would conflict with the new one.
 */
export async function detectDuplicateResult(
  studentId: string,
  courseId: string,
  academicYear: string,
  rowNumber: number,
): Promise<Anomaly | null> {
  const existing = await prisma.result.findUnique({
    where: {
      studentId_courseId_academicYear: { studentId, courseId, academicYear },
    },
    select: { id: true, score: true, grade: true },
  });

  if (existing) {
    return {
      rowNumber,
      type: 'duplicate_result',
      detail: `Result already exists for student/course/year with score ${existing.score}. Upload would overwrite.`,
      confidence: 1.0,
    };
  }

  return null;
}