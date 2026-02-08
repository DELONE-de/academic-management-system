// src/utils/grading.ts

import { Grade, Level, Semester } from '@prisma/client';
import { GradeInfo, ResultCalculation, GPACalculation } from '../types/index.js';

/**
 * Nigerian University Grading Scale
 * A: 70-100 → 5 points
 * B: 60-69  → 4 points
 * C: 50-59  → 3 points
 * D: 45-49  → 2 points
 * E: 40-44  → 1 point
 * F: < pass mark → 0 points
 */

/**
 * Determines the grade and grade point based on score
 * @param score - The student's score (0-100)
 * @param passMark - Department-specific pass mark
 * @returns GradeInfo containing grade and point
 */
export function determineGrade(score: number, passMark: number): GradeInfo {
  // Validate score range
  if (score < 0 || score > 100) {
    throw new Error('Score must be between 0 and 100');
  }

  // If score is below pass mark, it's automatically F (0 points)
  if (score < passMark) {
    return { grade: Grade.F, point: 0 };
  }

  // Apply grading scale
  if (score >= 70) {
    return { grade: Grade.A, point: 5 };
  } else if (score >= 60) {
    return { grade: Grade.B, point: 4 };
  } else if (score >= 50) {
    return { grade: Grade.C, point: 3 };
  } else if (score >= 45) {
    return { grade: Grade.D, point: 2 };
  } else if (score >= 40) {
    return { grade: Grade.E, point: 1 };
  } else {
    return { grade: Grade.F, point: 0 };
  }
}

/**
 * Calculates result for a single course
 * @param score - The student's score
 * @param unit - Course credit unit
 * @param passMark - Department pass mark
 * @returns Complete result calculation
 */
export function calculateResult(
  score: number,
  unit: number,
  passMark: number
): ResultCalculation {
  const { grade, point } = determineGrade(score, passMark);
  
  // PXU = Point × Unit (Quality Point)
  const pxu = point * unit;
  
  // Carry-over if score is below pass mark
  const isCarryOver = score < passMark;

  return {
    score,
    grade,
    gradePoint: point,
    pxu,
    isCarryOver,
  };
}

/**
 * Calculates GPA for a set of results
 * GPA = Total Quality Points (PXU) / Total Units
 * @param results - Array of result calculations
 * @returns GPA calculation with details
 */
export function calculateGPA(
  results: Array<{ score: number; unit: number; passMark: number }>
): GPACalculation {
  if (results.length === 0) {
    return {
      gpa: 0,
      totalUnits: 0,
      totalPoints: 0,
      results: [],
    };
  }

  const calculatedResults: ResultCalculation[] = [];
  let totalUnits = 0;
  let totalPoints = 0;

  for (const result of results) {
    const calculated = calculateResult(result.score, result.unit, result.passMark);
    calculatedResults.push(calculated);
    totalUnits += result.unit;
    totalPoints += calculated.pxu;
  }

  // GPA = Sum(PXU) / Total Units, rounded to 2 decimal places
  const gpa = totalUnits > 0 
    ? Math.round((totalPoints / totalUnits) * 100) / 100 
    : 0;

  return {
    gpa,
    totalUnits,
    totalPoints,
    results: calculatedResults,
  };
}

/**
 * Calculates CGPA from multiple semester GPAs
 * CGPA = Total Quality Points across all semesters / Total Units across all semesters
 * @param semesterData - Array of semester GPA data
 * @returns CGPA value
 */
export function calculateCGPA(
  semesterData: Array<{ gpa: number; totalUnits: number; totalPoints: number }>
): { cgpa: number; cumulativeUnits: number; cumulativePoints: number } {
  if (semesterData.length === 0) {
    return { cgpa: 0, cumulativeUnits: 0, cumulativePoints: 0 };
  }

  const cumulativeUnits = semesterData.reduce((sum, s) => sum + s.totalUnits, 0);
  const cumulativePoints = semesterData.reduce((sum, s) => sum + s.totalPoints, 0);

  const cgpa = cumulativeUnits > 0
    ? Math.round((cumulativePoints / cumulativeUnits) * 100) / 100
    : 0;

  return { cgpa, cumulativeUnits, cumulativePoints };
}

/**
 * Gets the class of degree based on CGPA
 * @param cgpa - Cumulative GPA
 * @returns Class of degree
 */
export function getClassOfDegree(cgpa: number): string {
  if (cgpa >= 4.50) return 'First Class Honours';
  if (cgpa >= 3.50) return 'Second Class Upper Division';
  if (cgpa >= 2.40) return 'Second Class Lower Division';
  if (cgpa >= 1.50) return 'Third Class';
  if (cgpa >= 1.00) return 'Pass';
  return 'Fail';
}

/**
 * Gets grade point from grade
 * @param grade - Grade enum
 * @returns Point value
 */
export function gradeToPoint(grade: Grade): number {
  const gradeMap: Record<Grade, number> = {
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    E: 1,
    F: 0,
  };
  return gradeMap[grade];
}

/**
 * Gets grade remark
 * @param grade - Grade enum
 * @returns Grade remark
 */
export function getGradeRemark(grade: Grade): string {
  const remarkMap: Record<Grade, string> = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Fair',
    E: 'Pass',
    F: 'Fail',
  };
  return remarkMap[grade];
}

/**
 * Formats level for display
 * @param level - Level enum
 * @returns Formatted level string
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
  return levelMap[level];
}

/**
 * Formats semester for display
 * @param semester - Semester enum
 * @returns Formatted semester string
 */
export function formatSemester(semester: Semester): string {
  return semester === Semester.FIRST ? 'First Semester' : 'Second Semester';
}