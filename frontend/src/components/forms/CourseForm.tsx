// src/components/forms/CourseForm.tsx

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LEVELS, SEMESTERS, formatLevel, formatSemester } from '@/lib/utils';
import { Course } from '@/types';

const courseSchema = z.object({
  code: z.string().min(3, 'Course code is required').toUpperCase(),
  title: z.string().min(5, 'Course title is required'),
  unit: z.coerce.number().min(1).max(6, 'Unit must be between 1 and 6'),
  level: z.string().min(1, 'Level is required'),
  semester: z.string().min(1, 'Semester is required'),
  isElective: z.boolean().optional(),
  description: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: CourseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CourseForm({ course, onSubmit, onCancel, isLoading }: CourseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? {
          code: course.code,
          title: course.title,
          unit: course.unit,
          level: course.level,
          semester: course.semester,
          isElective: course.isElective,
        }
      : {
          unit: 3,
          isElective: false,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Course Code"
          placeholder="e.g., CSC101"
          error={errors.code?.message}
          {...register('code')}
          required
        />
        <Input
          label="Credit Unit"
          type="number"
          min={1}
          max={6}
          error={errors.unit?.message}
          {...register('unit')}
          required
        />
      </div>

      <Input
        label="Course Title"
        placeholder="e.g., Introduction to Computer Science"
        error={errors.title?.message}
        {...register('title')}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Level"
          options={LEVELS.map((level) => ({
            value: level,
            label: formatLevel(level),
          }))}
          error={errors.level?.message}
          {...register('level')}
          required
        />
        <Select
          label="Semester"
          options={SEMESTERS.map((semester) => ({
            value: semester,
            label: formatSemester(semester),
          }))}
          error={errors.semester?.message}
          {...register('semester')}
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isElective"
          className="h-4 w-4 text-primary-600 rounded"
          {...register('isElective')}
        />
        <label htmlFor="isElective" className="text-sm text-gray-700">
          This is an elective course
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {course ? 'Update Course' : 'Add Course'}
        </Button>
      </div>
    </form>
  );
}