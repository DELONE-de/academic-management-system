import request from 'supertest';
import XLSX from 'xlsx';
import app from '../app';
import { prisma } from '../config/database';

describe('Bulk Upload Endpoints', () => {
  let authToken: string;
  let departmentId: string;
  let facultyId: string;

  beforeAll(async () => {
    // Create test faculty
    const faculty = await prisma.faculty.create({
      data: {
        name: 'Test Faculty',
        code: 'TF',
        description: 'Test Faculty for bulk upload',
      },
    });
    facultyId = faculty.id;

    // Create test department
    const department = await prisma.department.create({
      data: {
        name: 'Test Department',
        code: 'TD',
        facultyId,
        passMark: 40,
      },
    });
    departmentId = department.id;

    // Create test HOD user
    const user = await prisma.user.create({
      data: {
        email: 'hod@test.com',
        password: '$2a$10$test',
        firstName: 'Test',
        lastName: 'HOD',
        role: 'HOD',
        departmentId,
      },
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hod@test.com', password: 'password' });
    
    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await prisma.result.deleteMany();
    await prisma.student.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/bulk/students', () => {
    it('should upload students successfully', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Matric Number', 'First Name', 'Last Name', 'Middle Name', 'Email', 'Phone', 'Department Code', 'Admission Year', 'Current Level'],
        ['TD/2024/001', 'John', 'Doe', 'M', 'john@test.com', '08012345678', 'TD', 2024, 'ND1'],
        ['TD/2024/002', 'Jane', 'Smith', '', 'jane@test.com', '08087654321', 'TD', 2024, 'ND1'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bulk/students')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'students.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successCount).toBe(2);
    });

    it('should reject invalid file format', async () => {
      const res = await request(app)
        .post('/api/bulk/students')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('invalid'), 'test.txt');

      expect(res.status).toBe(400);
    });

    it('should return error file for invalid data', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Matric Number', 'First Name', 'Last Name', 'Middle Name', 'Email', 'Phone', 'Department Code', 'Admission Year', 'Current Level'],
        ['', 'John', 'Doe', '', '', '', 'INVALID', 2024, 'ND1'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bulk/students')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'students.xlsx');

      expect(res.headers['x-import-success']).toBe('false');
      expect(res.headers['content-type']).toContain('spreadsheet');
    });
  });

  describe('GET /api/bulk/students/template', () => {
    it('should download student template', async () => {
      const res = await request(app)
        .get('/api/bulk/students/template')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheet');
      expect(res.headers['content-disposition']).toContain('student_upload_template.xlsx');
    });
  });

  describe('POST /api/bulk/scores', () => {
    beforeAll(async () => {
      await prisma.student.create({
        data: {
          matricNumber: 'TD/2024/100',
          firstName: 'Test',
          lastName: 'Student',
          currentLevel: 'ND1',
          admissionYear: 2024,
          departmentId,
        },
      });

      await prisma.course.create({
        data: {
          code: 'CSC101',
          title: 'Introduction to Computing',
          unit: 3,
          level: 'ND1',
          semester: 'FIRST',
          departmentId,
        },
      });
    });

    it('should upload scores successfully', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Matric Number', 'Course Code', 'Score', 'Academic Year'],
        ['TD/2024/100', 'CSC101', 75, '2024/2025'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Scores');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bulk/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'scores.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successCount).toBe(1);
    });

    it('should update existing scores', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Matric Number', 'Course Code', 'Score', 'Academic Year'],
        ['TD/2024/100', 'CSC101', 85, '2024/2025'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Scores');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bulk/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'scores.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(1);
    });

    it('should reject invalid student/course', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Matric Number', 'Course Code', 'Score', 'Academic Year'],
        ['INVALID/001', 'CSC999', 75, '2024/2025'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Scores');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bulk/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'scores.xlsx');

      expect(res.headers['x-import-success']).toBe('false');
    });
  });

  describe('GET /api/bulk/scores/template', () => {
    it('should download score template', async () => {
      const res = await request(app)
        .get('/api/bulk/scores/template')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheet');
      expect(res.headers['content-disposition']).toContain('score_upload_template.xlsx');
    });
  });

  describe('Authorization Tests', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/bulk/students')
        .attach('file', Buffer.from('test'), 'test.xlsx');

      expect(res.status).toBe(401);
    });

    it('should reject requests without file', async () => {
      const res = await request(app)
        .post('/api/bulk/students')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No file uploaded');
    });
  });
});
