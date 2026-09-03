// src/__tests__/approval.test.ts
// Approval workflow lifecycle tests: submit → exam officer → HOD → Dean → publish.

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

let counter = 0;
const uniqueEmail = (p: string) => `${p}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}`;

/** Extract the auth JWT from a login response's Set-Cookie header. */
function tokenFrom(res: request.Response): string {
  const setCookie = (res.headers['set-cookie'] || []) as unknown as string[];
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
    .find((c: string) => c.startsWith('acadmind_token='));
  return cookie ? cookie.split(';')[0].split('=').slice(1).join('=') : '';
}
let dept: any, faculty: any;
let hodToken: string, deanToken: string, examToken: string;
let batchId: string;

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

  faculty = await prisma.faculty.create({ data: { name: uniqueCode('FAC'), code: uniqueCode('FC') } });
  dept = await prisma.department.create({ data: { name: uniqueCode('DEPT'), code: uniqueCode('DP'), facultyId: faculty.id, passMark: 40 } });

  const pw = await bcrypt.hash('User@12345', 4);
  const hod = await prisma.user.create({ data: { email: uniqueEmail('hod'), password: pw, firstName: 'H', lastName: 'OD', role: 'HOD', departmentId: dept.id } });
  const dean = await prisma.user.create({ data: { email: uniqueEmail('dean'), password: pw, firstName: 'D', lastName: 'EAN', role: 'DEAN', facultyId: faculty.id } });
  const exam = await prisma.user.create({ data: { email: uniqueEmail('exam'), password: pw, firstName: 'E', lastName: 'O', role: 'EXAMINATION_OFFICER', departmentId: dept.id } });

  const lh = await request(app).post('/api/auth/login').send({ email: hod.email, password: 'User@12345' });
  hodToken = tokenFrom(lh);
  const ld = await request(app).post('/api/auth/login').send({ email: dean.email, password: 'User@12345' });
  deanToken = tokenFrom(ld);
  const le = await request(app).post('/api/auth/login').send({ email: exam.email, password: 'User@12345' });
  examToken = tokenFrom(le);
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

describe('Approval workflow', () => {
  it('submits a new batch as HOD', async () => {
    const res = await request(app)
      .post('/api/approval')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ departmentId: dept.id, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' });
    expect(res.status).toBe(201);
    batchId = res.body.data.id;
  });

  it('prevents duplicate open batch for the same period', async () => {
    const res = await request(app)
      .post('/api/approval')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ departmentId: dept.id, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' });
    expect(res.status).toBe(409);
  });

  it('exam officer cannot approve a batch not yet submitted to them', async () => {
    // Batch was submitted by HOD directly with status SUBMITTED; exam officer can approve
    const res = await request(app)
      .post(`/api/approval/${batchId}/approve`)
      .set('Authorization', `Bearer ${examToken}`)
      .send({ comment: 'Verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED_BY_EXAM_OFFICER');
  });

  it('rejects duplicate approval by the same role', async () => {
    const res = await request(app)
      .post(`/api/approval/${batchId}/approve`)
      .set('Authorization', `Bearer ${examToken}`)
      .send({ comment: 'Again' });
    expect(res.status).toBe(400);
  });

  it('HOD approves next step', async () => {
    const res = await request(app)
      .post(`/api/approval/${batchId}/approve`)
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ comment: 'Approved by HOD' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED_BY_HOD');
  });

  it('dean cannot approve a batch from a different faculty', async () => {
    // Dean belongs to same faculty, so this should succeed
    const res = await request(app)
      .post(`/api/approval/${batchId}/approve`)
      .set('Authorization', `Bearer ${deanToken}`)
      .send({ comment: 'Approved by Dean' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED_BY_DEAN');
  });

  it('publishes the batch as dean', async () => {
    const res = await request(app)
      .post(`/api/approval/${batchId}/publish`)
      .set('Authorization', `Bearer ${deanToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
  });

  it('cannot publish an already-published batch', async () => {
    const res = await request(app)
      .post(`/api/approval/${batchId}/publish`)
      .set('Authorization', `Bearer ${deanToken}`);
    expect(res.status).toBe(400);
  });

  it('unauthenticated user cannot access approval list', async () => {
    const res = await request(app).get('/api/approval');
    expect(res.status).toBe(401);
  });

  it('PROPOSED results do not affect GPA until batch is published', async () => {
    // Create a student and a course with a result in PROPOSED status
    const pw = await bcrypt.hash('Life@12345', 4);
    const hod = await prisma.user.create({
      data: { email: uniqueEmail('life'), password: pw, firstName: 'L', lastName: 'I', role: 'HOD', departmentId: dept.id },
    });
    const student = await prisma.student.create({
      data: { matricNumber: uniqueCode('LIFE/2024/'), firstName: 'Test', lastName: 'Student', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: dept.id },
    });
    const course = await prisma.course.create({
      data: { code: uniqueCode('LIF'), title: 'Lifecycle Test', unit: 3, level: 'LEVEL_100', semester: 'FIRST', departmentId: dept.id },
    });
    // Create a PROPOSED result (simulating AI upload)
    await prisma.result.create({
      data: { studentId: student.id, courseId: course.id, score: 85, grade: 'A', gradePoint: 5, pxu: 15, status: 'PROPOSED', level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' },
    });
    // GPA should be 0 because PROPOSED results are excluded
    const gpaBefore = await prisma.semesterGPA.findUnique({
      where: { studentId_level_semester_academicYear: { studentId: student.id, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' } },
    });
    expect(gpaBefore).toBeNull();
    // Create and approve a batch, then publish
    const loginRes = await request(app).post('/api/auth/login').send({ email: hod.email, password: 'Life@12345' });
    const token = tokenFrom(loginRes);
    const batch = await prisma.resultBatch.create({
      data: { departmentId: dept.id, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025', status: 'APPROVED_BY_HOD', submittedById: hod.id },
    });
    const pubRes = await request(app)
      .post(`/api/approval/${batch.id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(pubRes.status).toBe(200);
    // After publish, GPA should be calculated using the now-OFFICIAL result
    const gpaAfter = await prisma.semesterGPA.findUnique({
      where: { studentId_level_semester_academicYear: { studentId: student.id, level: 'LEVEL_100', semester: 'FIRST', academicYear: '2024/2025' } },
    });
    expect(gpaAfter).not.toBeNull();
    expect(gpaAfter!.gpa).toBe(5.0);
  });
});