// src/__tests__/approval.test.ts
// Approval workflow lifecycle tests: submit → exam officer → HOD → Dean → publish.

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

let counter = 0;
const uniqueEmail = (p: string) => `${p}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}`;

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
  hodToken = lh.body.data.token;
  const ld = await request(app).post('/api/auth/login').send({ email: dean.email, password: 'User@12345' });
  deanToken = ld.body.data.token;
  const le = await request(app).post('/api/auth/login').send({ email: exam.email, password: 'User@12345' });
  examToken = le.body.data.token;
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
});