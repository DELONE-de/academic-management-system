// src/__tests__/grading.test.ts
// Unit tests for the deterministic GPA/CGPA engine — the authoritative academic core.

import {
  determineGrade,
  calculateResult,
  calculateGPA,
  calculateCGPA,
  getClassOfDegree,
  getGradeRemark,
  formatLevel,
  formatSemester,
} from '../utils/grading.js';
import { Grade, Level, Semester } from '@prisma/client';

describe('determineGrade', () => {
  it('returns A (5 points) for score >= 70', () => {
    expect(determineGrade(70, 40)).toEqual({ grade: Grade.A, point: 5 });
    expect(determineGrade(100, 40)).toEqual({ grade: Grade.A, point: 5 });
  });

  it('returns B (4 points) for score 60-69', () => {
    expect(determineGrade(60, 40)).toEqual({ grade: Grade.B, point: 4 });
    expect(determineGrade(69, 40)).toEqual({ grade: Grade.B, point: 4 });
  });

  it('returns C (3 points) for score 50-59', () => {
    expect(determineGrade(50, 40)).toEqual({ grade: Grade.C, point: 3 });
    expect(determineGrade(59, 40)).toEqual({ grade: Grade.C, point: 3 });
  });

  it('returns D (2 points) for score 45-49', () => {
    expect(determineGrade(45, 40)).toEqual({ grade: Grade.D, point: 2 });
    expect(determineGrade(49, 40)).toEqual({ grade: Grade.D, point: 2 });
  });

  it('returns E (1 point) for score 40-44', () => {
    expect(determineGrade(40, 40)).toEqual({ grade: Grade.E, point: 1 });
    expect(determineGrade(44, 40)).toEqual({ grade: Grade.E, point: 1 });
  });

  it('returns F (0 points) for score below pass mark', () => {
    expect(determineGrade(39, 40)).toEqual({ grade: Grade.F, point: 0 });
    expect(determineGrade(0, 40)).toEqual({ grade: Grade.F, point: 0 });
  });

  it('respects a custom pass mark (e.g. 50 for Optometry)', () => {
    expect(determineGrade(49, 50)).toEqual({ grade: Grade.F, point: 0 });
    // Score >= passMark (50) falls through to the standard scale: 50-59 = C
    expect(determineGrade(50, 50)).toEqual({ grade: Grade.C, point: 3 });
  });

  it('throws for scores outside 0-100', () => {
    expect(() => determineGrade(-1, 40)).toThrow();
    expect(() => determineGrade(101, 40)).toThrow();
  });
});

describe('calculateResult', () => {
  it('calculates pxu as gradePoint * unit', () => {
    const r = calculateResult(75, 3, 40);
    expect(r.grade).toBe(Grade.A);
    expect(r.gradePoint).toBe(5);
    expect(r.pxu).toBe(15);
    expect(r.isCarryOver).toBe(false);
  });

  it('marks score below pass mark as carry over', () => {
    const r = calculateResult(30, 2, 40);
    expect(r.grade).toBe(Grade.F);
    expect(r.gradePoint).toBe(0);
    expect(r.pxu).toBe(0);
    expect(r.isCarryOver).toBe(true);
  });
});

describe('calculateGPA', () => {
  it('returns zero values for empty results', () => {
    expect(calculateGPA([])).toEqual({ gpa: 0, totalUnits: 0, totalPoints: 0, results: [] });
  });

  it('computes a perfect 5.00 GPA for all A grades', () => {
    const gpa = calculateGPA([
      { score: 80, unit: 3, passMark: 40 },
      { score: 90, unit: 2, passMark: 40 },
    ]);
    expect(gpa.gpa).toBe(5.0);
    expect(gpa.totalUnits).toBe(5);
    expect(gpa.totalPoints).toBe(25);
  });

  it('computes a failing 0.00 GPA for all F grades', () => {
    const gpa = calculateGPA([
      { score: 30, unit: 3, passMark: 40 },
      { score: 20, unit: 2, passMark: 40 },
    ]);
    expect(gpa.gpa).toBe(0);
    expect(gpa.totalPoints).toBe(0);
  });

  it('computes a correct mixed GPA', () => {
    // 3 units of A (5*3=15) + 2 units of B (4*2=8) + 1 unit of F (0)
    const gpa = calculateGPA([
      { score: 80, unit: 3, passMark: 40 },
      { score: 65, unit: 2, passMark: 40 },
      { score: 30, unit: 1, passMark: 40 },
    ]);
    expect(gpa.totalUnits).toBe(6);
    expect(gpa.totalPoints).toBe(23);
    expect(gpa.gpa).toBe(3.83); // 23 / 6 = 3.8333 -> 3.83
  });

  it('handles a single course', () => {
    const gpa = calculateGPA([{ score: 72, unit: 4, passMark: 40 }]);
    expect(gpa.gpa).toBe(5.0);
    expect(gpa.totalUnits).toBe(4);
  });

  it('handles boundary scores correctly', () => {
    const gpa = calculateGPA([
      { score: 70, unit: 3, passMark: 40 }, // A
      { score: 69, unit: 3, passMark: 40 }, // B
      { score: 44, unit: 3, passMark: 40 }, // E
      { score: 40, unit: 3, passMark: 40 }, // E (pass mark)
    ]);
    // points = 15 + 12 + 3 + 3 = 33, units = 12, gpa = 2.75
    expect(gpa.totalPoints).toBe(33);
    expect(gpa.gpa).toBe(2.75);
  });
});

describe('calculateCGPA', () => {
  it('returns zeros for no semester data', () => {
    expect(calculateCGPA([])).toEqual({ cgpa: 0, cumulativeUnits: 0, cumulativePoints: 0 });
  });

  it('computes CGPA across multiple semesters', () => {
    const cgpa = calculateCGPA([
      { gpa: 4.5, totalUnits: 20, totalPoints: 90 },
      { gpa: 3.0, totalUnits: 18, totalPoints: 54 },
    ]);
    expect(cgpa.cumulativeUnits).toBe(38);
    expect(cgpa.cumulativePoints).toBe(144);
    expect(cgpa.cgpa).toBe(3.79); // 144/38 = 3.7894 -> 3.79
  });

  it('handles a semester with zero units', () => {
    const cgpa = calculateCGPA([
      { gpa: 0, totalUnits: 0, totalPoints: 0 },
      { gpa: 5.0, totalUnits: 20, totalPoints: 100 },
    ]);
    expect(cgpa.cumulativeUnits).toBe(20);
    expect(cgpa.cgpa).toBe(5.0);
  });
});

describe('getClassOfDegree', () => {
  it('classifies all bands correctly', () => {
    expect(getClassOfDegree(4.50)).toBe('First Class Honours');
    expect(getClassOfDegree(4.49)).toBe('Second Class Upper Division');
    expect(getClassOfDegree(3.50)).toBe('Second Class Upper Division');
    expect(getClassOfDegree(3.49)).toBe('Second Class Lower Division');
    expect(getClassOfDegree(2.40)).toBe('Second Class Lower Division');
    expect(getClassOfDegree(2.39)).toBe('Third Class');
    expect(getClassOfDegree(1.50)).toBe('Third Class');
    expect(getClassOfDegree(1.49)).toBe('Pass');
    expect(getClassOfDegree(1.00)).toBe('Pass');
    expect(getClassOfDegree(0.99)).toBe('Fail');
    expect(getClassOfDegree(0)).toBe('Fail');
  });
});

describe('getGradeRemark', () => {
  it('returns remarks for all grades', () => {
    expect(getGradeRemark(Grade.A)).toBe('Excellent');
    expect(getGradeRemark(Grade.F)).toBe('Fail');
  });
});

describe('formatLevel / formatSemester', () => {
  it('formats all supported levels', () => {
    expect(formatLevel(Level.ND1)).toBe('ND 1');
    expect(formatLevel(Level.ND2)).toBe('ND 2');
    expect(formatLevel(Level.HND1)).toBe('HND 1');
    expect(formatLevel(Level.HND2)).toBe('HND 2');
    expect(formatLevel(Level.LEVEL_100)).toBe('100 Level');
    expect(formatLevel(Level.LEVEL_500)).toBe('500 Level');
  });

  it('formats semesters', () => {
    expect(formatSemester(Semester.FIRST)).toBe('First Semester');
    expect(formatSemester(Semester.SECOND)).toBe('Second Semester');
  });
});
