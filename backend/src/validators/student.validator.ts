// src/validators/student.validator.ts

import { z } from 'zod';

export const createStudentSchema = z.object({
  matricNumber: z
    .string()
    .min(1, 'Matriculation number is required')
    .regex(/^[A-Z]{2,5}\/\d{4}\/\d{3,4}$/, 'Invalid matriculation number format'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  currentLevel: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  admissionYear: z.number().int().min(1990).max(new Date().getFullYear()),
  departmentId: z.string().cuid('Invalid department ID'),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;