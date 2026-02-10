// src/validators/result.validator.ts

import { z } from 'zod';

export const scoreEntrySchema = z.object({
  studentId: z.string().cuid('Invalid student ID'),
  courseId: z.string().cuid('Invalid course ID'),
  score: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100'),
});

export const bulkScoreEntrySchema = z.object({
  level: z.enum([
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, 'Academic year must be in format YYYY/YYYY (e.g., 2023/2024)'),
  scores: z.array(scoreEntrySchema).min(1, 'At least one score entry is required'),
});

export const updateScoreSchema = z.object({
  score: z.number().min(0).max(100),
});

export type ScoreEntryInput = z.infer<typeof scoreEntrySchema>;
export type BulkScoreEntryInput = z.infer<typeof bulkScoreEntrySchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;