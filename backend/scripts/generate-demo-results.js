#!/usr/bin/env node
// generate-demo-results.js
// Generates a realistic HIM Level 100 First Semester results file
// with intentional errors for AI review demo

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, '../test-files');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

// Real HIM students from seed
const students = [
  { matric: 'HIM/2024/1813', name: 'Alawode Adebusola Peace' },
  { matric: 'HIM/2024/3272', name: 'Nurudeen Aishat Olanike' },
  { matric: 'HIM/2024/1842', name: 'Abdulazeez Aishat Wuraola' },
  { matric: 'HIM/2024/0715', name: 'Uwedone Bose Gloria' },
  { matric: 'HIM/2024/1916', name: 'Igbelleh Daniella' },
  { matric: 'HIM/2024/0276', name: 'Akinlade Dolapo Anointed' },
  { matric: 'HIM/2024/3426', name: 'Adekanmi Folasade Oluwadarasimi' },
  { matric: 'HIM/2024/2231', name: 'Aderinto Hikmoh Adekemi' },
  { matric: 'HIM/2024/1473', name: 'Alimi Isiamiat Omolara' },
  { matric: 'HIM/2024/0321', name: 'Sunday Mary Funmilayo' },
  { matric: 'HIM/2024/1850', name: 'Iehunwa Mercy Olayemi' },
  { matric: 'HIM/2024/2170', name: 'Olanite Nafisat Eniola' },
  { matric: 'HIM/2024/2943', name: 'Ayetimiyi Oladuni Esther' },
  { matric: 'HIM/2024/3036', name: 'Dada Oluwanifemi Oluwabukunmi' },
  { matric: 'HIM/2024/1474', name: 'Oyewole Opeyemi Elizabeth' },
  { matric: 'HIM/2024/1862', name: 'Adetula Praises Adewura' },
  { matric: 'HIM/2024/1295', name: 'Adebiyi PraiseGod Ibukunoluwa' },
  { matric: 'HIM/2024/3268', name: 'Oyeleye Tobiloba Olamide' },
  { matric: 'HIM/2024/0859', name: 'Akinmoladun Yosola Precious' },
];

// Real HIM Level 100 First Semester courses from seed
const courses = [
  'BIO 101', 'BIO 107', 'CHM 101', 'CHM 107', 'COS 101',
  'FRE 199', 'GST 111', 'LIS 199', 'MTH 101', 'PHY 101', 'PHY 107', 'STA 111',
];

const academicYear = '2024/2025';

function randomScore(min = 45, max = 92) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── 1. CLEAN FILE (no errors) ──────────────────────────────────────────────
function generateCleanFile() {
  const rows = [['Matric Number', 'Course Code', 'Score', 'Academic Year']];
  for (const student of students) {
    for (const course of courses) {
      rows.push([student.matric, course, randomScore(), academicYear]);
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Results');
  const fp = path.join(testDir, 'him_results_clean.xlsx');
  XLSX.writeFile(wb, fp);
  console.log(`✅ him_results_clean.xlsx  — ${rows.length - 1} rows (${students.length} students × ${courses.length} courses)`);
}

// ── 2. ERRORS FILE (intentional issues for AI demo) ────────────────────────
function generateErrorFile() {
  const rows = [['Matric Number', 'Course Code', 'Score', 'Academic Year']];

  for (const student of students) {
    for (const course of courses) {
      let matric = student.matric;
      let courseCode = course;
      let score = randomScore();
      let year = academicYear;

      rows.push([matric, courseCode, score, year]);
    }
  }

  // ── Intentional errors ──

  // 1. Duplicate matric number (same student, same course, different score)
  rows.push(['HIM/2024/1813', 'BIO 101', 78, academicYear]);
  rows.push(['HIM/2024/1813', 'MTH 101', 55, academicYear]);

  // 2. Invalid score — above 100
  rows.push(['HIM/2024/3272', 'CHM 101', 110, academicYear]);

  // 3. Invalid score — negative
  rows.push(['HIM/2024/1842', 'GST 111', -5, academicYear]);

  // 4. Non-existent matric number (student not in DB)
  rows.push(['HIM/2024/9999', 'BIO 101', 67, academicYear]);
  rows.push(['HIM/2024/8888', 'MTH 101', 72, academicYear]);

  // 5. Wrong course code (course not in DB for HIM)
  rows.push(['HIM/2024/0715', 'ENG 201', 80, academicYear]);
  rows.push(['HIM/2024/0276', 'CSC 305', 65, academicYear]);

  // 6. Missing score (empty)
  rows.push(['HIM/2024/1916', 'STA 111', '', academicYear]);

  // 7. Typo in matric number (extra character)
  rows.push(['HIM/2024/13268', 'BIO 101', 59, academicYear]); // should be HIM/2024/3268

  // 8. Wrong academic year format
  rows.push(['HIM/2024/2943', 'PHY 101', 74, '24/25']);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Results');
  const fp = path.join(testDir, 'him_results_with_errors.xlsx');
  XLSX.writeFile(wb, fp);

  const errorCount = 10;
  console.log(`✅ him_results_with_errors.xlsx — ${rows.length - 1} rows with ${errorCount} intentional errors:`);
  console.log('   • 2× duplicate matric + course entries');
  console.log('   • 1× score above 100 (110)');
  console.log('   • 1× negative score (-5)');
  console.log('   • 2× non-existent matric numbers');
  console.log('   • 2× wrong course codes (not in HIM dept)');
  console.log('   • 1× missing/empty score');
  console.log('   • 1× matric number typo (HIM/2024/13268)');
  console.log('   • 1× wrong academic year format (24/25)');
}

console.log('🧪 Generating HIM Level 100 First Semester demo result files...\n');
generateCleanFile();
generateErrorFile();
console.log(`\n📁 Files saved to: ${testDir}`);
console.log('\n📝 Upload with:');
console.log('   curl -X POST http://localhost:5000/api/upload \\');
console.log('     -H "Authorization: Bearer <TOKEN>" \\');
console.log('     -F "file=@test-files/him_results_with_errors.xlsx" \\');
console.log('     -F "uploadType=results" \\');
console.log('     -F "academicYear=2024/2025" \\');
console.log('     -F "departmentId=cmrm6t4le0002monkqpltkfjr"');
