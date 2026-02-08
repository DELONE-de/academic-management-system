// src/lib/utils.ts

import { Level, Semester, Grade } from '@/types';

/**
 * Formats level for display
 */
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

/**
 * Formats semester for display
 */
export function formatSemester(semester: Semester): string {
  return semester === 'FIRST' ? 'First Semester' : 'Second Semester';
}

/**
 * Gets grade color class
 */
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

/**
 * Gets class of degree based on CGPA
 */
export function getClassOfDegree(cgpa: number): string {
  if (cgpa >= 4.5) return 'First Class Honours';
  if (cgpa >= 3.5) return 'Second Class Upper Division';
  if (cgpa >= 2.4) return 'Second Class Lower Division';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
}

/**
 * Gets class color based on CGPA
 */
export function getClassColor(cgpa: number): string {
  if (cgpa >= 4.5) return 'text-green-600 bg-green-100';
  if (cgpa >= 3.5) return 'text-blue-600 bg-blue-100';
  if (cgpa >= 2.4) return 'text-yellow-600 bg-yellow-100';
  if (cgpa >= 1.5) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Generates academic years list
 */
export function generateAcademicYears(count: number = 5): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const startYear = currentYear - i;
    years.push(`${startYear}/${startYear + 1}`);
  }
  
  return years;
}

/**
 * Available levels
 */
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

/**
 * Available semesters
 */
export const SEMESTERS: Semester[] = ['FIRST', 'SECOND'];

/**
 * Downloads a blob as file
 */
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

/**
 * Formats date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Classnames helper
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}