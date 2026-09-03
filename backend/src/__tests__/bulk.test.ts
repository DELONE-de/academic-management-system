// src/__tests__/bulk.test.ts
// Integration tests for the current student/course/result entry workflows.
// The legacy /api/bulk/* endpoints were replaced by the AI upload pipeline (/api/upload).

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';
let counter = 0;
const uniqueEmail = (p: string) => `${p}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}`;
const uniqueCourseCode = () => {
  ++counter;
  const suffix = String(counter).padStart(3, '0');
  return `GST${suffix}`;
};
const uniqueMatric = () => `HIM/${2024}/${String(++counter).padStart(4, '0')}`;

let authToken: string;
let facultyId: string;
let departmentId: string;
let studentId: string;
let courseId: string;

beforeAll(async () => {
  await prisma.$connect();

  await prisma.auditLog.deleteMany();
  await prisma.batchApproval.deleteMany();
  await prisma.resultBatch.deleteMany();
  await prisma.reviewItem.deleteMany();
  await prisma.uploadJob.deleteMany();
  await prisma.result.deleteMany();
  await prisma.semesterGPA.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.faculty.deleteMany();

  const faculty = await prisma.faculty.create({ data: { name: uniqueCode('F'), code: uniqueCode('F') } });
  facultyId = faculty.id;

  const department = await prisma.department.create({
    data: { name: uniqueCode('D'), code: uniqueCode('D'), facultyId, passMark: 40 },
  });
  departmentId = department.id;

  const pw = await bcrypt.hash('Hod@12345', 4);
  const hod = await prisma.user.create({
    data: { email: uniqueEmail('hod'), password: pw, firstName: 'H', lastName: 'OD', role: 'HOD', departmentId },
  });

  const loginRes = await request(app).post('/api/auth/login').send({ email: hod.email, password: 'Hod@12345' });
  authToken = loginRes.body?.data?.token ?? '';
});

afterAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.batchApproval.deleteMany();
  await prisma.resultBatch.deleteMany();
  await prisma.reviewItem.deleteMany();
  await prisma.uploadJob.deleteMany();
  await prisma.result.deleteMany();
  await prisma.semesterGPA.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.$disconnect();
});

describe('Student Workflow', () => {
  it('creates a student', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        matricNumber: uniqueMatric(),
        firstName: 'John',
        lastName: 'Doe',
        currentLevel: 'LEVEL_100',
        admissionYear: 2024,
        departmentId,
      });
    expect(res.status).toBe(201);
    studentId = res.body.data.id;
  });

  it('lists students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('downloads the student upload template', async () => {
    const res = await request(app)
      .get('/api/students/bulk-upload/template')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheet');
  });
});

describe('Course Workflow', () => {
  it('creates a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: uniqueCourseCode(),
        title: 'Introduction to Computing',
        unit: 3,
        level: 'LEVEL_100',
        semester: 'FIRST',
        departmentId,
      });
    expect(res.status).toBe(201);
    courseId = res.body.data.id;
  });

  it('lists courses for the department', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ departmentId });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('downloads the score template', async () => {
    const res = await request(app)
      .get('/api/results/bulk-upload/template')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheet');
  });
});

describe('Score Workflow', () => {
  it('enters a single score and recalculates GPA', async () => {
    const res = await request(app)
      .post('/api/results/add')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        studentId,
        courseId,
        score: 75,
        level: 'LEVEL_100',
        semester: 'FIRST',
        academicYear: '2024/2025',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.gpa).toBe(5.0);
    expect(res.body.data.cgpa).toBe(5.0);
  });

  it('gets student results', async () => {
    const res = await request(app)
      .get(`/api/results/student/${studentId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('updates a result score', async () => {
    const results = await prisma.result.findFirst({ where: { studentId } });
    const res = await request(app)
      .put(`/api/results/${results!.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ score: 65 });
    expect(res.status).toBe(200);
    expect(res.body.data.grade).toBe('B');
  });

  it('calculates department GPAs', async () => {
    const res = await request(app)
      .post('/api/gpa/calculate-department')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ departmentId, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' });
    expect(res.status).toBe(200);
  });
});

describe('Authorization', () => {
  it('rejects unauthenticated student creation', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({ matricNumber: 'X/2024/0001', firstName: 'A', lastName: 'B', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated course creation', async () => {
    const res = await request(app).post('/api/courses').send({ code: 'X101', title: 'X', unit: 1, level: 'LEVEL_100', semester: 'FIRST', departmentId });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated score entry', async () => {
    const res = await request(app).post('/api/results/add').send({ studentId, courseId, score: 50, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' });
    expect(res.status).toBe(401);
  });
});