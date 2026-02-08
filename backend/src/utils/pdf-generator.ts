// src/utils/pdf-generator.ts

import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { DepartmentStats, StudentResult } from '../types/index.js';
import { formatLevel, formatSemester, getClassOfDegree, getGradeRemark } from './grading.js';

/**
 * Generates a department report PDF
 */
export async function generateDepartmentReportPDF(
  res: Response,
  data: {
    departmentName: string;
    facultyName: string;
    level: string;
    semester: string;
    academicYear: string;
    stats: DepartmentStats;
    students: StudentResult[];
  }
): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=report-${data.departmentName}-${data.academicYear}.pdf`
  );

  // Pipe the PDF to the response
  doc.pipe(res);

  // Header
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('ACADEMIC PERFORMANCE REPORT', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(14)
    .font('Helvetica')
    .text(`Faculty: ${data.facultyName}`, { align: 'center' })
    .text(`Department: ${data.departmentName}`, { align: 'center' })
    .text(`${data.level} - ${data.semester}`, { align: 'center' })
    .text(`Academic Year: ${data.academicYear}`, { align: 'center' })
    .moveDown(1);

  // Divider
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  // Summary Statistics
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('SUMMARY STATISTICS', { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).font('Helvetica');

  const statsTable = [
    ['Total Students', data.stats.totalStudents.toString()],
    ['Highest GPA', data.stats.highestGpa.toFixed(2)],
    ['Lowest GPA', data.stats.lowestGpa.toFixed(2)],
    ['Average GPA', data.stats.averageGpa.toFixed(2)],
    ['Students with Carry-overs', data.stats.carryOverCount.toString()],
    ['Pass Rate', `${data.stats.passRate.toFixed(1)}%`],
  ];

  statsTable.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`).moveDown(0.3);
  });

  doc.moveDown(1);

  // Student Results Table
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('STUDENT RESULTS', { underline: true })
    .moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const colWidths = [35, 90, 150, 60, 60, 60];
  const headers = ['S/N', 'Matric No.', 'Name', 'GPA', 'CGPA', 'Carry-overs'];

  doc.fontSize(10).font('Helvetica-Bold');
  
  let xPos = 50;
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
    xPos += colWidths[i];
  });

  // Draw header underline
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(545, tableTop + 15)
    .stroke();

  // Table rows
  doc.fontSize(9).font('Helvetica');
  let yPos = tableTop + 25;

  data.students.forEach((student, index) => {
    // Check if we need a new page
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    xPos = 50;
    const carryOvers = student.results.filter(r => r.isCarryOver).length;
    const row = [
      (index + 1).toString(),
      student.matricNumber,
      student.studentName,
      student.gpa.toFixed(2),
      student.cgpa?.toFixed(2) || 'N/A',
      carryOvers.toString(),
    ];

    row.forEach((cell, i) => {
      doc.text(cell, xPos, yPos, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    yPos += 20;
  });

  // Footer
  doc.moveDown(2);
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text(`Generated on: ${new Date().toLocaleString('en-NG')}`, { align: 'right' })
    .moveDown(1);

  doc.end();
}

/**
 * Generates a student transcript PDF
 */
export async function generateTranscriptPDF(
  res: Response,
  data: {
    student: {
      matricNumber: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      department: string;
      faculty: string;
      admissionYear: number;
      currentLevel: string;
    };
    semesters: StudentResult[];
    cgpa: number;
  }
): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=transcript-${data.student.matricNumber.replace(/\//g, '-')}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('ACADEMIC TRANSCRIPT', { align: 'center' })
    .moveDown(1);

  // Student Info
  doc.fontSize(11).font('Helvetica');
  
  const fullName = [
    data.student.firstName,
    data.student.middleName,
    data.student.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  doc
    .text(`Name: ${fullName}`)
    .text(`Matriculation Number: ${data.student.matricNumber}`)
    .text(`Faculty: ${data.student.faculty}`)
    .text(`Department: ${data.student.department}`)
    .text(`Year of Admission: ${data.student.admissionYear}`)
    .moveDown(1);

  // Semester Results
  for (const semester of data.semesters) {
    // Check page space
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(
        `${formatLevel(semester.level as any)} - ${formatSemester(semester.semester as any)} (${semester.academicYear})`
      )
      .moveDown(0.5);

    // Results table
    const tableTop = doc.y;
    const colWidths = [70, 180, 40, 50, 50, 40, 40];
    const headers = ['Code', 'Title', 'Unit', 'Score', 'Grade', 'Point', 'PXU'];

    doc.fontSize(9).font('Helvetica-Bold');
    
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc
      .moveTo(50, tableTop + 12)
      .lineTo(545, tableTop + 12)
      .stroke();

    doc.fontSize(9).font('Helvetica');
    let yPos = tableTop + 18;

    for (const result of semester.results) {
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }

      xPos = 50;
      const row = [
        result.courseCode,
        result.courseTitle.substring(0, 30),
        result.unit.toString(),
        result.score.toFixed(0),
        result.grade,
        result.gradePoint.toString(),
        result.pxu.toFixed(1),
      ];

      row.forEach((cell, i) => {
        const color = result.isCarryOver && i > 2 ? 'red' : 'black';
        doc.fillColor(color).text(cell, xPos, yPos, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });
      doc.fillColor('black');

      yPos += 15;
    }

    // Semester GPA
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Semester GPA: ${semester.gpa.toFixed(2)}`, 50, yPos + 10)
      .moveDown(1);
  }

  // CGPA Summary
  doc.moveDown(1);
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(`CUMULATIVE GPA (CGPA): ${data.cgpa.toFixed(2)}`)
    .fontSize(12)
    .text(`Class of Degree: ${getClassOfDegree(data.cgpa)}`)
    .moveDown(2);

  // Footer
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text(`Generated on: ${new Date().toLocaleString('en-NG')}`, { align: 'right' });

  doc.end();
}