#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Bulk Upload Test File Generator\n');

const testDir = path.join(__dirname, '../test-files');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

function generateStudentTestFile() {
  const wb = XLSX.utils.book_new();
  const validData = [
    ['Matric Number', 'First Name', 'Last Name', 'Middle Name', 'Email', 'Phone', 'Department Code', 'Admission Year', 'Current Level'],
    ['CS/2024/001', 'John', 'Doe', 'Michael', 'john.doe@test.com', '08012345678', 'CS', 2024, 'ND1'],
    ['CS/2024/002', 'Jane', 'Smith', '', 'jane.smith@test.com', '08087654321', 'CS', 2024, 'ND1'],
    ['CS/2024/003', 'Bob', 'Johnson', 'Lee', 'bob.j@test.com', '08098765432', 'CS', 2024, 'ND2'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(validData);
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const filePath = path.join(testDir, 'students_valid.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('✅ Created: students_valid.xlsx');
}

function generateStudentErrorFile() {
  const wb = XLSX.utils.book_new();
  const invalidData = [
    ['Matric Number', 'First Name', 'Last Name', 'Middle Name', 'Email', 'Phone', 'Department Code', 'Admission Year', 'Current Level'],
    ['', 'John', 'Doe', '', '', '', 'CS', 2024, 'ND1'],
    ['CS/2024/002', '', 'Smith', '', 'jane@test.com', '', 'CS', 2024, 'ND1'],
    ['CS/2024/003', 'Bob', 'Johnson', '', 'bob@test.com', '', 'INVALID', 2024, 'ND1'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(invalidData);
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const filePath = path.join(testDir, 'students_invalid.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('✅ Created: students_invalid.xlsx');
}

function generateScoreTestFile() {
  const wb = XLSX.utils.book_new();
  const validData = [
    ['Matric Number', 'Course Code', 'Score', 'Academic Year'],
    ['CS/2024/001', 'CSC101', 75, '2024/2025'],
    ['CS/2024/001', 'CSC102', 82, '2024/2025'],
    ['CS/2024/002', 'CSC101', 68, '2024/2025'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(validData);
  XLSX.utils.book_append_sheet(wb, ws, 'Scores');
  const filePath = path.join(testDir, 'scores_valid.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('✅ Created: scores_valid.xlsx');
}

function generateScoreErrorFile() {
  const wb = XLSX.utils.book_new();
  const invalidData = [
    ['Matric Number', 'Course Code', 'Score', 'Academic Year'],
    ['INVALID/001', 'CSC101', 75, '2024/2025'],
    ['CS/2024/001', 'INVALID999', 82, '2024/2025'],
    ['CS/2024/001', 'CSC101', 150, '2024/2025'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(invalidData);
  XLSX.utils.book_append_sheet(wb, ws, 'Scores');
  const filePath = path.join(testDir, 'scores_invalid.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('✅ Created: scores_invalid.xlsx');
}

generateStudentTestFile();
generateStudentErrorFile();
generateScoreTestFile();
generateScoreErrorFile();

console.log(`\n📁 Test files: ${testDir}`);
console.log('\n📝 Test with curl:');
console.log('1. Login: curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"user@test.com","password":"pass"}\'');
console.log('2. Upload: curl -X POST http://localhost:3000/api/bulk/students -H "Authorization: Bearer TOKEN" -F "file=@test-files/students_valid.xlsx"');
console.log('3. Template: curl -X GET http://localhost:3000/api/bulk/students/template -H "Authorization: Bearer TOKEN" -o template.xlsx\n');
