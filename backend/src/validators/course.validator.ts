// src/validators/course.validator.ts

import { z } from 'zod';

export const createCourseSchema = z.object({
  code: z
    .string()
    .min(3, 'Course code must be at least 3 characters')
    .max(10, 'Course code too long')
    .toUpperCase(),
  title: z.string().min(5, 'Course title must be at least 5 characters'),
  unit: z.number().int().min(1).max(6, 'Credit unit must be between 1 and 6'),
  level: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  isElective: z.boolean().default(false),
  description: z.string().optional(),
  departmentId: z.string().cuid('Invalid department ID'),
});

export const updateCourseSchema = createCourseSchema.partial().omit({ departmentId: true });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;