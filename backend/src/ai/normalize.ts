// src/ai/normalize.ts
// Deterministic normalization stage — runs AFTER AI extraction and BEFORE validation.
// Normalizes identifiers and values into canonical forms WITHOUT inventing values.
// Where ambiguity exists, the value is left unchanged and flagged for human review.

import { parseLevel, parseSemester, validateAcademicYear } from '../validators/bulk.validator.js';
import { Level, Semester } from '@prisma/client';

export interface NormalizationIssue {
  rowNumber: number;
  field: string;
  original: string;
  normalized: string | null;
  reason: string;
}

export interface NormalizedCourse {
  courseCode: string;
  score: number;
  confidence: number;
  issues: NormalizationIssue[];
}

export interface NormalizedStudent {
  rowNumber: number;
  matricNumber: string;
  firstName: string;
  lastName: string;
  departmentCode: string;
  admissionYear: number;
  studentLevel: string;
  level: Level | null;
  email?: string;
  confidence: number;
  issues: NormalizationIssue[];
}

export interface NormalizedResult {
  rowNumber: number;
  matricNumber: string;
  academicYear: string;
  courses: NormalizedCourse[];
  overallConfidence: number;
  issues: NormalizationIssue[];
}

/**
 * Normalize a matric number into the canonical stored form.
 * Handles: "CSC/2024/001", "CSC-2024-001", "csc 2024 001", "2024/001".
 * Ambiguous formats (e.g. no department prefix) are preserved for matching.
 */
export function normalizeMatricNumber(raw: string): { normalized: string; ambiguous: boolean } {
  const trimmed = (raw || '').trim().toUpperCase();
  // Split on / - space separators
  const parts = trimmed.split(/[/\s-]+/).filter(Boolean);

  if (parts.length === 3) {
    // DEPT/YEAR/NUM — canonical
    return { normalized: `${parts[0]}/${parts[1]}/${parts[2]}`, ambiguous: false };
  }
  if (parts.length === 2 && /^\d{4}$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    // YEAR/NUM — short score-file form
    return { normalized: `${parts[0]}/${parts[1]}`, ambiguous: false };
  }
  // Anything else — keep original, flag as ambiguous
  return { normalized: trimmed, ambiguous: true };
}

/**
 * Normalize a course code into canonical uppercase-with-space form.
 * Handles: "CSC101", "CSC 101", "CSC-101".
 * Returns the canonical form if it looks like letters+digits, otherwise unchanged.
 */
export function normalizeCourseCode(raw: string): { normalized: string; ambiguous: boolean } {
  const trimmed = (raw || '').trim().toUpperCase();
  // Match letters followed by digits, allowing spaces/dashes between
  const match = trimmed.match(/^([A-Z]{2,6})[\s\-]?(\d{2,5})$/);
  if (match) {
    return { normalized: `${match[1]} ${match[2]}`, ambiguous: false };
  }
  // Course codes sometimes have no department prefix (e.g. "101") — leave as-is
  return { normalized: trimmed, ambiguous: true };
}

/**
 * Normalize a score value. Handles "85", "85%", "85.0", "85 / 100".
 * Returns null if the value cannot be parsed as a numeric score.
 */
export function normalizeScore(raw: string | number): { normalized: number | null; ambiguous: boolean } {
  if (typeof raw === 'number') {
    if (raw >= 0 && raw <= 100) return { normalized: raw, ambiguous: false };
    return { normalized: null, ambiguous: true };
  }

  const trimmed = (raw || '').trim();

  // "85 / 100" — take the numerator
  const fractionMatch = trimmed.match(/^(\d{1,3})\s*\/\s*100$/);
  if (fractionMatch) {
    const v = parseFloat(fractionMatch[1]);
    if (v >= 0 && v <= 100) return { normalized: v, ambiguous: false };
    return { normalized: null, ambiguous: true };
  }

  // "85%"
  const percentMatch = trimmed.match(/^(\d{1,3}(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    const v = parseFloat(percentMatch[1]);
    if (v >= 0 && v <= 100) return { normalized: v, ambiguous: false };
    return { normalized: null, ambiguous: true };
  }

  // "85" or "85.0"
  const plain = parseFloat(trimmed);
  if (!isNaN(plain) && plain >= 0 && plain <= 100) {
    return { normalized: plain, ambiguous: false };
  }

  return { normalized: null, ambiguous: true };
}

/**
 * Normalize a semester value into the canonical enum.
 * Handles "First Semester", "1st Semester", "Semester 1", "FIRST", "1".
 */
export function normalizeSemester(raw: string): { normalized: Semester | null; ambiguous: boolean } {
  const parsed = parseSemester(raw);
  if (parsed) return { normalized: parsed, ambiguous: false };
  return { normalized: null, ambiguous: true };
}

/**
 * Normalize a level value into the canonical enum.
 * Handles "ND1", "ND 1", "ND I", "100", "LEVEL 100", "HND2".
 */
export function normalizeLevel(raw: string): { normalized: Level | null; ambiguous: boolean } {
  const trimmed = (raw || '').trim();
  const parsed = parseLevel(trimmed);
  if (parsed) return { normalized: parsed, ambiguous: false };

  // Roman numeral handling: "ND I", "HND II"
  const romanMap: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5' };
  const romanMatch = trimmed.toUpperCase().match(/^(ND|HND)\s*(I{1,3}|IV|V)$/i);
  if (romanMatch) {
    const arabic = romanMap[romanMatch[2]];
    const parsedRoman = parseLevel(`${romanMatch[1]}${arabic}`);
    if (parsedRoman) return { normalized: parsedRoman, ambiguous: false };
  }

  return { normalized: null, ambiguous: true };
}

/**
 * Normalize an academic year value into canonical "YYYY/YYYY" form.
 */
export function normalizeAcademicYear(raw: string): { normalized: string | null; ambiguous: boolean } {
  const trimmed = (raw || '').trim();
  if (validateAcademicYear(trimmed)) return { normalized: trimmed, ambiguous: false };

  // "2024-2025" or "20242025"
  const hyphenMatch = trimmed.match(/^(\d{4})[-\s](\d{4})$/);
  if (hyphenMatch && parseInt(hyphenMatch[2]) === parseInt(hyphenMatch[1]) + 1) {
    return { normalized: `${hyphenMatch[1]}/${hyphenMatch[2]}`, ambiguous: false };
  }

  return { normalized: null, ambiguous: true };
}

/**
 * Normalize a set of raw extracted student records into canonical form.
 * Non-destructive: original values preserved, issues collected.
 */
export function normalizeStudentRecords(
  raw: Array<{
    rowNumber: number;
    matricNumber: string;
    firstName: string;
    lastName: string;
    departmentCode: string;
    admissionYear: number;
    studentLevel: string;
    email?: string;
  }>
): NormalizedStudent[] {
  return raw.map((r: any) => {
    const issues: NormalizationIssue[] = [];

    const matric = normalizeMatricNumber(r.matricNumber);
    if (matric.ambiguous) {
      issues.push({ rowNumber: r.rowNumber, field: 'matricNumber', original: r.matricNumber, normalized: matric.normalized, reason: 'Matric format unrecognized — verify manually' });
    }

    const level = normalizeLevel(r.studentLevel);
    if (level.ambiguous) {
      issues.push({ rowNumber: r.rowNumber, field: 'studentLevel', original: r.studentLevel, normalized: null, reason: `Unrecognized level '${r.studentLevel}'` });
    }

    const dept = r.departmentCode?.trim().toUpperCase() || '';
    if (dept) {
      issues.push({ rowNumber: r.rowNumber, field: 'departmentCode', original: r.departmentCode, normalized: dept, reason: 'Department code uppercased' });
    }

    return {
      rowNumber: r.rowNumber,
      matricNumber: matric.normalized,
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      departmentCode: dept || r.departmentCode?.trim().toUpperCase() || '',
      admissionYear: r.admissionYear,
      studentLevel: r.studentLevel,
      level: level.normalized,
      email: r.email?.trim() || undefined,
      confidence: r.confidence ?? 1.0,
      issues,
    };
  });
}

/**
 * Normalize a set of raw extracted result records into canonical form.
 */
export function normalizeResultRecords(
  raw: Array<{
    rowNumber: number;
    matricNumber: string;
    academicYear: string;
    courses: Array<{ courseCode: string; score: number; confidence?: number }>;
    overallConfidence?: number;
  }>
): NormalizedResult[] {
  return raw.map((r) => {
    const issues: NormalizationIssue[] = [];

    const matric = normalizeMatricNumber(r.matricNumber);
    if (matric.ambiguous) {
      issues.push({ rowNumber: r.rowNumber, field: 'matricNumber', original: r.matricNumber, normalized: matric.normalized, reason: 'Matric format unrecognized — verify manually' });
    }

    const year = normalizeAcademicYear(r.academicYear);
    if (!year.normalized) {
      issues.push({ rowNumber: r.rowNumber, field: 'academicYear', original: r.academicYear, normalized: null, reason: `Invalid academic year '${r.academicYear}'` });
    }

    const courses: NormalizedCourse[] = (r.courses || []).map((c) => {
      const courseIssues: NormalizationIssue[] = [];
      const code = normalizeCourseCode(c.courseCode);
      if (code.ambiguous) {
        courseIssues.push({ rowNumber: r.rowNumber, field: 'courseCode', original: c.courseCode, normalized: code.normalized, reason: `Course code '${c.courseCode}' unrecognized format` });
      }
      const score = normalizeScore(c.score);
      if (!score.normalized) {
        courseIssues.push({ rowNumber: r.rowNumber, field: 'score', original: String(c.score), normalized: null, reason: `Invalid score '${c.score}'` });
      }
      return {
        courseCode: code.normalized,
        score: score.normalized ?? c.score,
        confidence: c.confidence ?? 1.0,
        issues: courseIssues,
      };
    });

    return {
      rowNumber: r.rowNumber,
      matricNumber: matric.normalized,
      academicYear: year.normalized ?? r.academicYear,
      courses,
      overallConfidence: r.overallConfidence ?? Math.min(...courses.map((c) => c.confidence)),
      issues,
    };
  });
}

/**
 * Collects all issues across normalized records.
 */
export function collectNormalizationIssues(records: NormalizedStudent[] | NormalizedResult[]): NormalizationIssue[] {
  const issues: NormalizationIssue[] = [];
  for (const r of records) {
    issues.push(...r.issues);
    if ('courses' in r) {
      for (const c of (r as NormalizedResult).courses) {
        issues.push(...c.issues);
      }
    }
  }
  return issues;
}
