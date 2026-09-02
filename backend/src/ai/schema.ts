// src/ai/schema.ts
// Strict Zod schemas for validating AI-extracted records before they enter the pipeline.
// Never trust raw AI output — validate against these schemas.

import { z } from 'zod';

// A single extracted course/score for a student
export const ExtractedCourseSchema = z.object({
  courseCode: z.string().min(2).max(20),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1).default(1.0),
});

// A single extracted student record
export const ExtractedStudentSchema = z.object({
  rowNumber: z.number().int().positive(),
  matricNumber: z.string().min(3).max(30),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  departmentCode: z.string().min(1).max(20),
  admissionYear: z.number().int().min(1990).max(2100),
  studentLevel: z.string().min(1).max(20),
  email: z.string().email().optional().nullable(),
  confidence: z.number().min(0).max(1).default(1.0),
});

// A single extracted result row (one student with multiple courses)
export const ExtractedResultSchema = z.object({
  rowNumber: z.number().int().positive(),
  matricNumber: z.string().min(3).max(30),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/),
  courses: z.array(ExtractedCourseSchema).min(1),
  overallConfidence: z.number().min(0).max(1).default(1.0),
});

// Array wrappers
export const ExtractedStudentArraySchema = z.array(ExtractedStudentSchema);
export const ExtractedResultArraySchema = z.array(ExtractedResultSchema);

/**
 * Validates AI-extracted student records against the schema.
 * Returns { valid: true, data } or { valid: false, errors: string[] }.
 */
export function validateExtractedStudents(raw: unknown): {
  valid: boolean;
  data?: z.infer<typeof ExtractedStudentArraySchema>;
  errors?: string[];
} {
  const result = ExtractedStudentArraySchema.safeParse(raw);
  if (result.success) return { valid: true, data: result.data };
  return {
    valid: false,
    errors: result.error.errors.map((e) => `Row data: ${e.path.join('.')} — ${e.message}`),
  };
}

/**
 * Validates AI-extracted result records against the schema.
 */
export function validateExtractedResults(raw: unknown): {
  valid: boolean;
  data?: z.infer<typeof ExtractedResultArraySchema>;
  errors?: string[];
} {
  const result = ExtractedResultArraySchema.safeParse(raw);
  if (result.success) return { valid: true, data: result.data };
  return {
    valid: false,
    errors: result.error.errors.map((e) => `Row data: ${e.path.join('.')} — ${e.message}`),
  };
}