// src/__tests__/security.test.ts
// IDOR and access-control tests — verify cross-department isolation.

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

let counter = 0;
const uniqueEmail = (p: string) => `${p}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}`;

/** Extract the auth JWT from the login response body ({ data: { token } }). */
function tokenFrom(res: request.Response): string {
  return res.body?.data?.token ?? '';
}

let deptA: any, deptB: any, facultyA: any, facultyB: any;
let hodAToken: string, hodBToken: string, deanToken: string;
let studentA: any, studentB: any, uploadJobA: any;

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

  facultyA = await prisma.faculty.create({ data: { name: uniqueCode('FAC_A'), code: uniqueCode('F_A') } });
  facultyB = await prisma.faculty.create({ data: { name: uniqueCode('FAC_B'), code: uniqueCode('F_B') } });

  deptA = await prisma.department.create({ data: { name: uniqueCode('DEPT_A'), code: uniqueCode('DA'), facultyId: facultyA.id, passMark: 40 } });
  deptB = await prisma.department.create({ data: { name: uniqueCode('DEPT_B'), code: uniqueCode('DB'), facultyId: facultyB.id, passMark: 40 } });

  studentA = await prisma.student.create({ data: { matricNumber: uniqueCode('A/2024/'), firstName: 'A', lastName: 'Student', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: deptA.id } });
  studentB = await prisma.student.create({ data: { matricNumber: uniqueCode('B/2024/'), firstName: 'B', lastName: 'Student', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: deptB.id } });

  // Upload job belonging to dept A
  const pw = await bcrypt.hash('Hod@12345', 4);
  const hodA = await prisma.user.create({ data: { email: uniqueEmail('hoda'), password: pw, firstName: 'HOD', lastName: 'A', role: 'HOD', departmentId: deptA.id } });
  const hodB = await prisma.user.create({ data: { email: uniqueEmail('hodb'), password: pw, firstName: 'HOD', lastName: 'B', role: 'HOD', departmentId: deptB.id } });
  const deanA = await prisma.user.create({ data: { email: uniqueEmail('dean'), password: pw, firstName: 'Dean', lastName: 'A', role: 'DEAN', facultyId: facultyA.id } });

  uploadJobA = await prisma.uploadJob.create({
    data: { fileName: 'test.xlsx', fileType: 'excel', status: 'NEEDS_REVIEW', uploadedById: hodA.id, departmentId: deptA.id },
  });

  const loginA = await request(app).post('/api/auth/login').send({ email: hodA.email, password: 'Hod@12345' });
  hodAToken = tokenFrom(loginA);
  const loginB = await request(app).post('/api/auth/login').send({ email: hodB.email, password: 'Hod@12345' });
  hodBToken = tokenFrom(loginB);
  const loginDean = await request(app).post('/api/auth/login').send({ email: deanA.email, password: 'Hod@12345' });
  deanToken = tokenFrom(loginDean);
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

describe('IDOR — Cross-department access', () => {
  it('HOD A cannot access student from Department B', async () => {
    const res = await request(app).get(`/api/students/${studentB.id}`).set('Authorization', `Bearer ${hodAToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD B cannot access student from Department A', async () => {
    const res = await request(app).get(`/api/students/${studentA.id}`).set('Authorization', `Bearer ${hodBToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD A cannot access upload job from Department B', async () => {
    const res = await request(app).get(`/api/upload/${uploadJobA.id}`).set('Authorization', `Bearer ${hodBToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD A cannot access results for student from Department B', async () => {
    const res = await request(app).get(`/api/results/student/${studentB.id}`).set('Authorization', `Bearer ${hodAToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD A cannot access GPA for student from Department B', async () => {
    const res = await request(app).get(`/api/gpa/student/${studentB.id}/history`).set('Authorization', `Bearer ${hodAToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD A cannot access carryovers for student from Department B', async () => {
    const res = await request(app).get(`/api/results/carryovers/${studentB.id}`).set('Authorization', `Bearer ${hodAToken}`);
    expect(res.status).toBe(403);
  });

  it('HOD A cannot access transcript for student from Department B', async () => {
    const res = await request(app).get(`/api/reports/transcript/${studentB.id}`).set('Authorization', `Bearer ${hodAToken}`);
    expect(res.status).toBe(403);
  });

  it('DEAN from Faculty A cannot access Department B details', async () => {
    const res = await request(app).get(`/api/departments/${deptB.id}`).set('Authorization', `Bearer ${deanToken}`);
    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });
});

describe('Registration protection', () => {
  it('HOD cannot register another user (only DEAN)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${hodAToken}`)
      .send({ email: uniqueEmail('x'), password: 'Test@12345', firstName: 'X', lastName: 'Y', role: 'HOD', departmentId: deptA.id });
    expect(res.status).toBe(403);
  });
});