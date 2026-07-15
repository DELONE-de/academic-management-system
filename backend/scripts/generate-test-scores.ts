// scripts/generate-test-scores.ts
// Run: npx tsx scripts/generate-test-scores.ts
// Generates: scripts/test-scores-him-100l-first-sem.xlsx

import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Matric format: YYYY/NNNN (short format) — backend resolves to HIM/2024/XXXX
// Courses: LEVEL_100 FIRST semester for HIM dept
// BIO 101 (2u), BIO 107 (1u), CHM 101 (2u), CHM 107 (1u),
// COS 101 (3u), FRE 199 (2u), GST 111 (2u), LIS 199 (2u),
// MTH 101 (2u), PHY 101 (2u), PHY 107 (1u), STA 111 (3u)

const rows = [
  { MatricNumber: '2024/1813', 'BIO 101': 72, 'BIO 107': 68, 'CHM 101': 55, 'CHM 107': 60, 'COS 101': 78, 'FRE 199': 65, 'GST 111': 70, 'LIS 199': 74, 'MTH 101': 58, 'PHY 101': 62, 'PHY 107': 66, 'STA 111': 71 },
  { MatricNumber: '2024/3272', 'BIO 101': 85, 'BIO 107': 80, 'CHM 101': 76, 'CHM 107': 82, 'COS 101': 90, 'FRE 199': 78, 'GST 111': 88, 'LIS 199': 84, 'MTH 101': 79, 'PHY 101': 83, 'PHY 107': 81, 'STA 111': 87 },
  { MatricNumber: '2024/1842', 'BIO 101': 45, 'BIO 107': 50, 'CHM 101': 42, 'CHM 107': 48, 'COS 101': 55, 'FRE 199': 41, 'GST 111': 52, 'LIS 199': 47, 'MTH 101': 38, 'PHY 101': 44, 'PHY 107': 46, 'STA 111': 53 },
  { MatricNumber: '2024/0715', 'BIO 101': 63, 'BIO 107': 70, 'CHM 101': 58, 'CHM 107': 65, 'COS 101': 67, 'FRE 199': 60, 'GST 111': 64, 'LIS 199': 69, 'MTH 101': 55, 'PHY 101': 61, 'PHY 107': 68, 'STA 111': 66 },
  { MatricNumber: '2024/1916', 'BIO 101': 91, 'BIO 107': 88, 'CHM 101': 84, 'CHM 107': 90, 'COS 101': 95, 'FRE 199': 86, 'GST 111': 92, 'LIS 199': 89, 'MTH 101': 87, 'PHY 101': 93, 'PHY 107': 91, 'STA 111': 94 },
  { MatricNumber: '2024/0276', 'BIO 101': 50, 'BIO 107': 55, 'CHM 101': 48, 'CHM 107': 52, 'COS 101': 60, 'FRE 199': 46, 'GST 111': 57, 'LIS 199': 53, 'MTH 101': 44, 'PHY 101': 49, 'PHY 107': 51, 'STA 111': 58 },
  { MatricNumber: '2024/3426', 'BIO 101': 77, 'BIO 107': 74, 'CHM 101': 69, 'CHM 107': 72, 'COS 101': 80, 'FRE 199': 71, 'GST 111': 75, 'LIS 199': 78, 'MTH 101': 66, 'PHY 101': 73, 'PHY 107': 76, 'STA 111': 79 },
  { MatricNumber: '2024/2231', 'BIO 101': 60, 'BIO 107': 63, 'CHM 101': 57, 'CHM 107': 61, 'COS 101': 65, 'FRE 199': 55, 'GST 111': 62, 'LIS 199': 64, 'MTH 101': 52, 'PHY 101': 58, 'PHY 107': 60, 'STA 111': 63 },
  { MatricNumber: '2024/1473', 'BIO 101': 82, 'BIO 107': 79, 'CHM 101': 74, 'CHM 107': 77, 'COS 101': 85, 'FRE 199': 76, 'GST 111': 81, 'LIS 199': 83, 'MTH 101': 72, 'PHY 101': 78, 'PHY 107': 80, 'STA 111': 84 },
  { MatricNumber: '2024/0321', 'BIO 101': 40, 'BIO 107': 43, 'CHM 101': 35, 'CHM 107': 41, 'COS 101': 50, 'FRE 199': 38, 'GST 111': 45, 'LIS 199': 42, 'MTH 101': 30, 'PHY 101': 37, 'PHY 107': 40, 'STA 111': 48 },
  { MatricNumber: '2024/1850', 'BIO 101': 68, 'BIO 107': 72, 'CHM 101': 64, 'CHM 107': 70, 'COS 101': 73, 'FRE 199': 66, 'GST 111': 69, 'LIS 199': 71, 'MTH 101': 61, 'PHY 101': 67, 'PHY 107': 70, 'STA 111': 74 },
  { MatricNumber: '2024/2170', 'BIO 101': 55, 'BIO 107': 58, 'CHM 101': 51, 'CHM 107': 56, 'COS 101': 62, 'FRE 199': 50, 'GST 111': 59, 'LIS 199': 57, 'MTH 101': 47, 'PHY 101': 53, 'PHY 107': 55, 'STA 111': 61 },
  { MatricNumber: '2024/2943', 'BIO 101': 88, 'BIO 107': 85, 'CHM 101': 80, 'CHM 107': 86, 'COS 101': 92, 'FRE 199': 82, 'GST 111': 89, 'LIS 199': 87, 'MTH 101': 83, 'PHY 101': 90, 'PHY 107': 88, 'STA 111': 91 },
  { MatricNumber: '2024/3036', 'BIO 101': 47, 'BIO 107': 52, 'CHM 101': 44, 'CHM 107': 49, 'COS 101': 57, 'FRE 199': 43, 'GST 111': 54, 'LIS 199': 50, 'MTH 101': 41, 'PHY 101': 46, 'PHY 107': 48, 'STA 111': 55 },
  { MatricNumber: '2024/1474', 'BIO 101': 74, 'BIO 107': 71, 'CHM 101': 67, 'CHM 107': 73, 'COS 101': 77, 'FRE 199': 68, 'GST 111': 72, 'LIS 199': 75, 'MTH 101': 63, 'PHY 101': 70, 'PHY 107': 72, 'STA 111': 76 },
  { MatricNumber: '2024/1862', 'BIO 101': 93, 'BIO 107': 90, 'CHM 101': 87, 'CHM 107': 92, 'COS 101': 96, 'FRE 199': 89, 'GST 111': 94, 'LIS 199': 91, 'MTH 101': 88, 'PHY 101': 95, 'PHY 107': 93, 'STA 111': 97 },
  { MatricNumber: '2024/1295', 'BIO 101': 58, 'BIO 107': 61, 'CHM 101': 54, 'CHM 107': 59, 'COS 101': 64, 'FRE 199': 52, 'GST 111': 60, 'LIS 199': 62, 'MTH 101': 50, 'PHY 101': 56, 'PHY 107': 58, 'STA 111': 65 },
  { MatricNumber: '2024/3268', 'BIO 101': 79, 'BIO 107': 76, 'CHM 101': 71, 'CHM 107': 75, 'COS 101': 83, 'FRE 199': 73, 'GST 111': 77, 'LIS 199': 80, 'MTH 101': 68, 'PHY 101': 75, 'PHY 107': 78, 'STA 111': 82 },
  { MatricNumber: '2024/0859', 'BIO 101': 66, 'BIO 107': 69, 'CHM 101': 62, 'CHM 107': 67, 'COS 101': 71, 'FRE 199': 63, 'GST 111': 67, 'LIS 199': 70, 'MTH 101': 59, 'PHY 101': 65, 'PHY 107': 67, 'STA 111': 72 },

  // --- INTENTIONAL ERRORS ---
  // Error 1: duplicate matric + BIO 101 score > 100
  { MatricNumber: '2024/1813', 'BIO 101': 105, 'BIO 107': 68, 'CHM 101': 55, 'CHM 107': 60, 'COS 101': 78, 'FRE 199': 65, 'GST 111': 70, 'LIS 199': 74, 'MTH 101': 58, 'PHY 101': 62, 'PHY 107': 66, 'STA 111': 71 },
  // Error 2: student does not exist in DB
  { MatricNumber: '2024/9999', 'BIO 101': 70, 'BIO 107': 65, 'CHM 101': 60, 'CHM 107': 62, 'COS 101': 75, 'FRE 199': 68, 'GST 111': 72, 'LIS 199': 70, 'MTH 101': 64, 'PHY 101': 69, 'PHY 107': 71, 'STA 111': 73 },
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
ws['!cols'] = [{ wch: 14 }, ...Array(12).fill({ wch: 10 })];
XLSX.utils.book_append_sheet(wb, ws, 'Scores');

const outPath = path.join(__dirname, 'test-scores-him-100l-first-sem.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`✅ Generated: ${outPath}`);
console.log(`   Rows: ${rows.length} (19 valid + 2 intentional errors)`);
console.log(`   Academic year to select in UI: 2024/2025`);
console.log(`   Intentional errors:`);
console.log(`   Row 20 — 2024/1813 duplicate, BIO 101 = 105 (score > 100)`);
console.log(`   Row 21 — 2024/9999 (student does not exist in DB)`);
