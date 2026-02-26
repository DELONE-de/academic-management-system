// FILE: backend/src/utils/excel.ts

import * as XLSX from 'xlsx';
import { 
  StudentImportRow, 
  StudentImportError, 
  ScoreImportRow, 
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
 * Parse score rows from Excel data (horizontal format)
 */
export function parseScoreRows(data: any[]): ScoreImportRow[] {
  const rows: ScoreImportRow[] = [];
  
  data.forEach((row, index) => {
    const matricNumber = getRowValue(row, ['matricnumber', 'matricno', 'matric']).toUpperCase();
    const academicYear = getRowValue(row, ['academicyear', 'academic_year', 'session', 'year']);
    
    // Extract all course columns (any column that's not MatricNumber or AcademicYear)
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      if (!normalizedKey.includes('matric') && !normalizedKey.includes('academic') && 
          !normalizedKey.includes('year') && !normalizedKey.includes('session')) {
        const score = parseFloat(String(row[key]).trim());
        if (!isNaN(score) && score > 0) {
          rows.push({
            rowNumber: index + 2,
            matricNumber,
            departmentCode: '',
            courseCode: key.toUpperCase().trim(),
            score,
            studentLevel: '',
            semester: '',
            academicYear,
          });
        }
      }
    });
  });
  
  return rows;
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

/**
 * Generate score upload template
 */
export function generateScoreTemplate(): Buffer {
  const sampleData = [
    {
      'MatricNumber': 'CSC/2023/001',
      'CSC101': 75,
      'CSC103': 68,
      'MTH101': 82,
      'PHY101': 70,
      'GST101': 65,
      'AcademicYear': '2023/2024',
    },
    {
      'MatricNumber': 'CSC/2023/002',
      'CSC101': 80,
      'CSC103': 72,
      'MTH101': 85,
      'PHY101': 75,
      'GST101': 70,
      'AcademicYear': '2023/2024',
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  worksheet['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores');
  
  // Add instructions sheet
  const instructionsData = [
    { 'Field': 'MatricNumber', 'Description': 'Student matriculation number (first column)', 'Required': 'Yes' },
    { 'Field': 'Course Codes', 'Description': 'Each course code as a column header (e.g., CSC101, MTH101). Put scores under each course.', 'Required': 'Yes' },
    { 'Field': 'AcademicYear', 'Description': 'Academic year in last column (e.g., 2023/2024)', 'Required': 'Yes' },
    { 'Field': 'Note', 'Description': 'Leave cell empty if student did not take that course. Course codes must match exactly.', 'Required': '-' },
  ];
  
  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}