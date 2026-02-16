// FILE: frontend/src/lib/utils.ts

import { Level, Semester, Grade } from '@/types';

export function formatLevel(level: Level): string {
  const levelMap: Record<Level, string> = {
    ND1: 'ND 1',
    ND2: 'ND 2',
    HND1: 'HND 1',
    HND2: 'HND 2',
    LEVEL_100: '100 Level',
    LEVEL_200: '200 Level',
    LEVEL_300: '300 Level',
    LEVEL_400: '400 Level',
    LEVEL_500: '500 Level',
  };
  return levelMap[level] || level;
}

export function formatSemester(semester: Semester): string {
  return semester === 'FIRST' ? 'First Semester' : 'Second Semester';
}

export function getGradeColor(grade: Grade): string {
  const colorMap: Record<Grade, string> = {
    A: 'text-green-600 bg-green-100',
    B: 'text-blue-600 bg-blue-100',
    C: 'text-yellow-600 bg-yellow-100',
    D: 'text-orange-600 bg-orange-100',
    E: 'text-red-400 bg-red-100',
    F: 'text-red-600 bg-red-200',
  };
  return colorMap[grade] || 'text-gray-600 bg-gray-100';
}

export function getClassOfDegree(cgpa: number): string {
  if (cgpa >= 4.5) return 'First Class Honours';
  if (cgpa >= 3.5) return 'Second Class Upper Division';
  if (cgpa >= 2.4) return 'Second Class Lower Division';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
}

export function getClassColor(cgpa: number): string {
  if (cgpa >= 4.5) return 'text-green-600 bg-green-100';
  if (cgpa >= 3.5) return 'text-blue-600 bg-blue-100';
  if (cgpa >= 2.4) return 'text-yellow-600 bg-yellow-100';
  if (cgpa >= 1.5) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

export function generateAcademicYears(count = 5): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => `${currentYear - i}/${currentYear - i + 1}`);
}

export const LEVELS: Level[] = [
  'LEVEL_100',
  'LEVEL_200',
  'LEVEL_300',
  'LEVEL_400',
  'LEVEL_500',
  'ND1',
  'ND2',
  'HND1',
  'HND2',
];

export const SEMESTERS: Semester[] = ['FIRST', 'SECOND'];

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function parseLevel(levelStr: string): Level | null {
  const normalized = levelStr.toUpperCase().replace(/\s+/g, '_');
  const levelMap: Record<string, Level> = {
    'ND1': 'ND1',
    'ND2': 'ND2',
    'HND1': 'HND1',
    'HND2': 'HND2',
    '100': 'LEVEL_100',
    'LEVEL_100': 'LEVEL_100',
    '200': 'LEVEL_200',
    'LEVEL_200': 'LEVEL_200',
    '300': 'LEVEL_300',
    'LEVEL_300': 'LEVEL_300',
    '400': 'LEVEL_400',
    'LEVEL_400': 'LEVEL_400',
    '500': 'LEVEL_500',
    'LEVEL_500': 'LEVEL_500',
  };
  return levelMap[normalized] || null;
}

export function parseSemester(semesterStr: string): Semester | null {
  const normalized = semesterStr.toUpperCase().trim();
  if (['FIRST', '1', '1ST'].includes(normalized)) return 'FIRST';
  if (['SECOND', '2', '2ND'].includes(normalized)) return 'SECOND';
  return null;
}