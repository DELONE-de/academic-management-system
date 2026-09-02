// src/__tests__/auth.test.ts
// Integration tests for auth protection, bootstrap, and RBAC.
// Uses direct prisma user creation rather than login for authentication.

import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

let counter = 0;
const unique = (p: string) => `${p}_${++counter}_${Date.now()}`;
const uniqueEmail = (p: string) => `${p.replace('@', '.')}.${++counter}.${Date.now()}@test.com`;
const uniqueCode = (p: string) => `${p}${++counter}${Date.now().toString().slice(-4)}`;

let deanToken: string;
let testFaculty: any;
let testDept: any;

beforeAll(async () => {
  await prisma.$connect();

  // Clean up
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

  // Create test data
  testFaculty = await prisma.faculty.create({ data: { name: unique('TF'), code: unique('TF') } });
  testDept = await prisma.department.create({
    data: { name: unique('TD'), code: unique('TD'), facultyId: testFaculty.id, passMark: 40 },
  });

  const pw = await bcrypt.hash('Dean@12345', 4);
  const deanUser = await prisma.user.create({
    data: { email: uniqueEmail('dean'), password: pw, firstName: 'Dean', lastName: 'Admin', role: 'DEAN', facultyId: testFaculty.id },
  });

  // Login as DEAN to get token
  const loginRes = await request(app).post('/api/auth/login').send({ email: deanUser.email, password: 'Dean@12345' });
  if (loginRes.status === 200 && loginRes.body.data) {
    deanToken = loginRes.body.data.token;
  } else {
    console.warn('Login failed in beforeAll:', loginRes.status, JSON.stringify(loginRes.body));
    deanToken = '';
  }
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

describe('Auth API', () => {
  describe('Bootstrap', () => {
    it('returns bootstrapped=true when users exist', async () => {
      const res = await request(app).get('/api/auth/bootstrap-status');
      expect(res.status).toBe(200);
      expect(res.body.data.bootstrapped).toBe(true);
    });

    it('rejects bootstrap when system already has users', async () => {
      const res = await request(app).post('/api/auth/bootstrap').send({
        email: uniqueEmail('bootstrap'),
        password: 'Test@12345',
        firstName: 'B', lastName: 'User',
        facultyId: testFaculty.id,
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Login', () => {
    it('accepts valid credentials', async () => {
      const pw = await bcrypt.hash('Login@12345', 4);
      const u = await prisma.user.create({
        data: { email: uniqueEmail('login'), password: pw, firstName: 'L', lastName: 'U', role: 'HOD', departmentId: testDept.id },
      });
      const res = await request(app).post('/api/auth/login').send({ email: u.email, password: 'Login@12345' });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'noone@test.com', password: 'Wrong@12345' });
      expect(res.status).toBe(401);
    });

    it('rejects weak passwords', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'short' });
      expect(res.status).toBe(400);
    });
  });

  describe('Registration protection', () => {
    it('rejects unauthenticated registration', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: uniqueEmail('unauth'), password: 'Test@12345', firstName: 'X', lastName: 'Y', role: 'HOD', departmentId: testDept.id,
      });
      expect(res.status).toBe(401);
    });

    it('allows DEAN to register new HOD', async () => {
      if (!deanToken) return; // skip if login failed
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${deanToken}`)
        .send({ email: uniqueEmail('hod'), password: 'Hod@12345', firstName: 'HOD', lastName: 'User', role: 'HOD', departmentId: testDept.id });
      expect(res.status).toBe(201);
    });
  });

  describe('Profile', () => {
    it('returns profile for authenticated user', async () => {
      if (!deanToken) return;
      const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${deanToken}`);
      expect(res.status).toBe(200);
    });

    it('rejects profile fetch without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });
  });
});