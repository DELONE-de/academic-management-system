// FILE: backend/src/utils/excel.ts

import * as XLSX from 'xlsx';
import { 
  StudentImportRow, 
  StudentImportError, 
  ScoreImportError 
} from '../types/index.js';

/**
 * Parse Excel buffer to JSON array
 */
export function parseExcelBuffer<T>(buffer: Buffer): T[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json<T>(worksheet, {
      raw: false,
      defval: '',
    });
    
    return data;
  } catch (error) {
    throw new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
  }
}

/**
 * Normalize column names to handle different formats
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Get value from row using flexible column matching
 */
export function getRowValue(row: any, possibleKeys: string[]): string {
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeColumnName(key);
    for (const possibleKey of possibleKeys) {
      if (normalizedKey.includes(normalizeColumnName(possibleKey))) {
        return String(row[key]).trim();
      }
    }
  }
  return '';
}

/**
 * Parse student rows from Excel data
 */
export function parseStudentRows(data: any[]): StudentImportRow[] {
  return data.map((row, index) => ({
    rowNumber: index + 2, // Excel rows start at 1, plus header row
    matricNumber: getRowValue(row, ['matricnumber', 'matricno', 'matric', 'matriculation']).toUpperCase(),
    firstName: getRowValue(row, ['firstname', 'first_name', 'fname']),
    lastName: getRowValue(row, ['lastname', 'last_name', 'lname', 'surname']),
    middleName: getRowValue(row, ['middlename', 'middle_name', 'mname']) || undefined,
    departmentCode: getRowValue(row, ['departmentcode', 'deptcode', 'department', 'dept']).toUpperCase(),
    admissionYear: parseInt(getRowValue(row, ['admissionyear', 'admission_year', 'year', 'yearofadmission']), 10),
    studentLevel: getRowValue(row, ['studentlevel', 'level', 'currentlevel', 'current_level']).toUpperCase(),
    email: getRowValue(row, ['email', 'emailaddress', 'email_address']) || undefined,
    phone: getRowValue(row, ['phone', 'phonenumber', 'phone_number', 'mobile']) || undefined,
  }));
}

/**
 * Parse score rows from Excel data.
 * Format: | MatricNumber | GST111 | GST112 | COS101 | ... |
 * MatricNumber format: 2025/5337 (year/number only)
 * academicYear comes from the request (pre-upload selector) — not from the file.
 * departmentCode comes from the authenticated user — not from the file.
 */
export function parseScoreRows(
  data: any[],
  academicYear?: string
): Array<{
  rowNumber: number;
  matricNumber: string;
  academicYear: string;
  courses: Array<{ courseCode: string; score: number; confidence: number }>;
  overallConfidence: number;
}> {
  const SKIP_KEYS = ['matric', 'academic', 'year', 'session', 'dept', 'department'];

  return data
    .map((row, index) => {
      const matricNumber = getRowValue(row, ['matricnumber', 'matricno', 'matric']).toUpperCase();
      const resolvedYear = academicYear ?? getRowValue(row, ['academicyear', 'academic_year', 'session', 'year']);

      if (!matricNumber || !resolvedYear) return null;

      const courses: Array<{ courseCode: string; score: number; confidence: number }> = [];

      for (const key of Object.keys(row)) {
        const normalizedKey = normalizeColumnName(key);
        if (SKIP_KEYS.some((k) => normalizedKey.includes(k))) continue;

        const scoreValue = String(row[key]).trim();
        if (!scoreValue) continue;

        const score = parseFloat(scoreValue);
        if (isNaN(score)) continue;

        courses.push({
          courseCode: key.toUpperCase().trim(),
          score,
          confidence: score >= 0 && score <= 100 ? 1.0 : 0.3,
        });
      }

      if (courses.length === 0) return null;

      return {
        rowNumber: index + 2,
        matricNumber,
        academicYear: resolvedYear,
        courses,
        overallConfidence: Math.min(...courses.map((c) => c.confidence)),
      };
    })
    .filter(Boolean) as any[];
}

/**
 * Generate error Excel file for student import errors
 */
export function generateStudentErrorExcel(errors: StudentImportError[]): Buffer {
  const worksheetData = errors.map(error => ({
    'Row Number': error.rowNumber,
    'Matric Number': error.matricNumber,
    'First Name': error.firstName,
    'Last Name': error.lastName,
    'Department Code': error.departmentCode,
    'Admission Year': error.admissionYear,
    'Student Level': error.studentLevel,
    'Errors': error.errors.join('; '),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Row Number
    { wch: 18 }, // Matric Number
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 15 }, // Department Code
    { wch: 15 }, // Admission Year
    { wch: 15 }, // Student Level
    { wch: 50 }, // Errors
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generate error Excel file for score import errors
 */
export function generateScoreErrorExcel(errors: ScoreImportError[]): Buffer {
  const worksheetData = errors.map(error => ({
    'Row Number': error.rowNumber,
    'Matric Number': error.matricNumber,
    'Course Code': error.courseCode,
    'Score': error.score,
    'Academic Year': error.academicYear,
    'Errors': error.errors.join('; '),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  worksheet['!cols'] = [
    { wch: 12 }, // Row Number
    { wch: 18 }, // Matric Number
    { wch: 12 }, // Course Code
    { wch: 8 },  // Score
    { wch: 12 }, // Academic Year
    { wch: 50 }, // Errors
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generate student upload template
 */
export function generateStudentTemplate(): Buffer {
  const sampleData = [
    {
      'MatricNumber': 'CSC/2023/001',
      'FirstName': 'John',
      'LastName': 'Doe',
      'MiddleName': 'Michael',
      'DepartmentCode': 'CSC',
      'AdmissionYear': 2023,
      'StudentLevel': 'LEVEL_100',
      'Email': 'john.doe@university.edu.ng',
      'Phone': '08012345678',
    },
    {
      'MatricNumber': 'CSC/2023/002',
      'FirstName': 'Jane',
      'LastName': 'Smith',
      'MiddleName': '',
      'DepartmentCode': 'CSC',
      'AdmissionYear': 2023,
      'StudentLevel': 'LEVEL_100',
      'Email': '',
      'Phone': '',
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  worksheet['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  // Add instructions sheet
  const instructionsData = [
    { 'Field': 'MatricNumber', 'Description': 'Student matriculation number (e.g., CSC/2023/001)', 'Required': 'Yes' },
    { 'Field': 'FirstName', 'Description': 'Student first name', 'Required': 'Yes' },
    { 'Field': 'LastName', 'Description': 'Student last name/surname', 'Required': 'Yes' },
    { 'Field': 'MiddleName', 'Description': 'Student middle name', 'Required': 'No' },
    { 'Field': 'DepartmentCode', 'Description': 'Department code (e.g., CSC, MTH, PHY)', 'Required': 'Yes' },
    { 'Field': 'AdmissionYear', 'Description': 'Year of admission (e.g., 2023)', 'Required': 'Yes' },
    { 'Field': 'StudentLevel', 'Description': 'Level: LEVEL_100, LEVEL_200, LEVEL_300, LEVEL_400, LEVEL_500, ND1, ND2, HND1, HND2', 'Required': 'Yes' },
    { 'Field': 'Email', 'Description': 'Student email address', 'Required': 'No' },
    { 'Field': 'Phone', 'Description': 'Student phone number', 'Required': 'No' },
  ];
  
  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

export function generateScoreTemplate(): Buffer {
  const sampleData = [
    { 'MatricNumber': '2024/0001', 'GST 111': 72, 'GST 112': 65, 'COS 101': 80, 'BIO 101': 55, 'MTH 101': 68 },
    { 'MatricNumber': '2024/0002', 'GST 111': 45, 'GST 112': 88, 'COS 101': 60, 'BIO 101': 101, 'MTH 101': 70 }, // score > 100 intentional error
    { 'MatricNumber': '2024/0001', 'GST 111': 72, 'GST 112': 65, 'COS 101': 80, 'BIO 101': 55, 'MTH 101': 68 }, // duplicate intentional error
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores');

  const instructionsData = [
    { 'Column': 'MatricNumber', 'Description': 'Student matric number in format YYYY/NNNN e.g. 2025/5337', 'Required': 'Yes' },
    { 'Column': 'Course Codes', 'Description': 'One column per course (e.g. GST 111). Header = course code. Cell = score (0-100). Leave blank if student did not sit the course.', 'Required': 'Yes' },
    { 'Column': 'AcademicYear', 'Description': 'NOT required in file — selected before upload in the UI.', 'Required': 'No' },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(instructionsData), 'Instructions');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}