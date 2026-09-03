// src/__tests__/csrf.test.ts
// Tests for CSRF protection of cookie-authenticated state-changing requests.

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

let counter = 0;
const uniqueEmail = (p: string) => `${p}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}${Date.now().toString().slice(-4)}`;

let testFaculty: any;
let testDept: any;

const uniqueMatric = () => `HIM/2024/${String(++counter).padStart(4, '0')}`;

function extractCookie(res: any, name: string): string | null {
  const setCookie: string[] = res.headers['set-cookie'] || [];
  for (const c of setCookie) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0].split('=')[1];
    }
  }
  return null;
}

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

  testFaculty = await prisma.faculty.create({ data: { name: uniqueCode('TF'), code: uniqueCode('TF') } });
  testDept = await prisma.department.create({
    data: { name: uniqueCode('TD'), code: uniqueCode('TD'), facultyId: testFaculty.id, passMark: 40 },
  });
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

describe('CSRF protection', () => {
  it('sets a csrf-token cookie', async () => {
    const res = await request(app).get('/api/health');
    const csrf = extractCookie(res, 'csrf-token');
    expect(csrf).toBeTruthy();
  });

  it('blocks a cookie-authenticated POST without a CSRF token', async () => {
    // Create + login a HOD
    const pw = await bcrypt.hash('Csrf@12345', 4);
    const user = await prisma.user.create({
      data: { email: uniqueEmail('csrf'), password: pw, firstName: 'Cora', lastName: 'Sann', role: 'HOD', departmentId: testDept.id },
    });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: 'Csrf@12345' });

    // POST /api/students without CSRF header → 403
    const res = await agent.post('/api/students').send({
      matricNumber: uniqueMatric(),
      firstName: 'Cora', lastName: 'Yeo', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: testDept.id,
    });
    expect(res.status).toBe(403);
  });

  it('allows a cookie-authenticated POST with a valid CSRF token', async () => {
    const pw = await bcrypt.hash('Csrf2@12345', 4);
    const user = await prisma.user.create({
      data: { email: uniqueEmail('csrf2'), password: pw, firstName: 'Casey', lastName: 'Sunn', role: 'HOD', departmentId: testDept.id },
    });
    const agent = request.agent(app);

    // Obtain CSRF token via a GET (sets the cookie)
    const getRes = await agent.get('/api/health');
    const csrf = extractCookie(getRes, 'csrf-token');

    await agent.post('/api/auth/login').send({ email: user.email, password: 'Csrf2@12345' });

    const res = await agent.post('/api/students')
      .set('X-CSRF-Token', csrf || '')
      .send({
        matricNumber: uniqueMatric(),
        firstName: 'Ada', lastName: 'Bello', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: testDept.id,
      });
    expect(res.status).toBe(201);
  });

  it('allows safe GET methods without a CSRF token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('exempts the public login endpoint from CSRF', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'noone@test.com',
      password: 'Wrong@12345',
    });
    // Should reach the auth layer (401 invalid creds), not a CSRF 403
    expect(res.status).toBe(401);
  });

  it('allows Bearer-header authenticated requests without CSRF (legacy clients)', async () => {
    const pw = await bcrypt.hash('Bearer@12345', 4);
    const user = await prisma.user.create({
      data: { email: uniqueEmail('bearer'), password: pw, firstName: 'Beth', lastName: 'Ebo', role: 'HOD', departmentId: testDept.id },
    });
    const loginRes = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Bearer@12345' });
    // Token is no longer in the response body — read it from the auth cookie
    const token = extractCookie(loginRes, 'acadmind_token') || '';

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({
        matricNumber: uniqueMatric(),
        firstName: 'Cyril', lastName: 'Dan', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: testDept.id,
      });
    expect(res.status).toBe(201);
  });
});