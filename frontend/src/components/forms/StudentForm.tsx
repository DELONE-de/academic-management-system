// src/components/forms/StudentForm.tsx

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LEVELS, formatLevel } from '@/lib/utils';
import { Student } from '@/types';

const studentSchema = z.object({
  matricNumber: z
    .string()
    .min(1, 'Matriculation number is required')
    .regex(/^[A-Z]{2,5}\/\d{4}\/\d{3,4}$/, 'Invalid format (e.g., CSC/2023/001)'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  currentLevel: z.string().min(1, 'Level is required'),
  admissionYear: z.number().int().min(1990).max(new Date().getFullYear()),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Student;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StudentForm({ student, onSubmit, onCancel, isLoading }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          matricNumber: student.matricNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName || '',
          email: student.email || '',
          currentLevel: student.currentLevel,
          admissionYear: student.admissionYear,
        }
      : {
          admissionYear: new Date().getFullYear(),
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Matriculation Number"
        placeholder="e.g., CSC/2023/001"
        error={errors.matricNumber?.message}
        {...register('matricNumber')}
        required
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="First Name"
          error={errors.firstName?.message}
          {...register('firstName')}
          required
        />
        <Input
          label="Middle Name"
          error={errors.middleName?.message}
          {...register('middleName')}
        />
        <Input
          label="Last Name"
          error={errors.lastName?.message}
          {...register('lastName')}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Current Level"
          options={LEVELS.map((level) => ({
            value: level,
            label: formatLevel(level),
          }))}
          error={errors.currentLevel?.message}
          {...register('currentLevel')}
          required
        />
        <Input
          label="Admission Year"
          type="number"
          min={1990}
          max={new Date().getFullYear()}
          error={errors.admissionYear?.message}
          {...register('admissionYear', { valueAsNumber: true })}
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {student ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
}