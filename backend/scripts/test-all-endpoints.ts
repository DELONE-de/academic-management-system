// FILE: backend/scripts/test-all-endpoints.ts
// Automated end-to-end test of every API endpoint against the test database.
//
// Usage:  npm run test:endpoints        (from backend/)
//         DATABASE_URL=... npm run test:endpoints
//
// What it does:
//   1. Boots the Express app in-process (NODE_ENV=test, no server listen).
//   2. Starts a local mock OpenRouter server so AI-dependent endpoints
//      (GPA explanation) are exercised deterministically without network.
//   3. Seeds a faculty/department/users/students/courses dataset.
//   4. Hits EVERY endpoint with correct auth (Bearer Authorization header) and
//      asserts status, including the post-login header-session scenario.
//   5. Prints a PASS/FAIL summary and exits non-zero on any failure.

import http from 'http';

// ============================================================
// ENVIRONMENT — must be set BEFORE the app is imported
// ============================================================
const TEST_DB =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:5433/acadmind_test?schema=public';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DB;
process.env.DIRECT_URL = TEST_DB;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.RATE_LIMIT_MAX = '10000'; // script fires many requests quickly
process.env.AI_PROVIDER = 'openrouter';
process.env.OPENROUTER_API_KEY = 'mock-key';
// No Gemini/Groq keys → no accidental network fallbacks; OpenRouter mock answers.
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;

// ============================================================
// MOCK OPENROUTER SERVER (deterministic AI responses)
// ============================================================
const mockAI = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                'Mock AI explanation: The student performed well this semester, with grades above average across all courses.',
            },
          },
        ],
      })
    );
  });
});

async function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => (server.address() as any).port && resolve((server.address() as any).port));
  });
}

const aiPort = await listen(mockAI);
process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${aiPort}/api/v1`;

// ============================================================
// IMPORTS (after env is set)
// ============================================================
const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/config/database.js');
const request = (await import('supertest')).default;
const bcrypt = (await import('bcryptjs')).default;

// ============================================================
// HARNESS
// ============================================================
interface TestResult {
  name: string;
  expected: string;
  actual: string;
  ok: boolean;
  detail?: string;
}

const results: TestResult[] = [];
let failures = 0;

function snippet(res: any): string {
  const body = typeof res.text === 'string' ? res.text : JSON.stringify(res.body ?? '');
  return body.slice(0, 300);
}

async function t(
  name: string,
  expected: number | number[],
  fn: () => Promise<any>
): Promise<any> {
  const exp = Array.isArray(expected) ? expected : [expected];
  try {
    const res = await fn();
    const ok = exp.includes(res.status);
    results.push({
      name,
      expected: exp.join('|'),
      actual: String(res.status),
      ok,
      detail: ok ? undefined : snippet(res),
    });
    if (!ok) failures++;
    return res;
  } catch (err: any) {
    results.push({ name, expected: exp.join('|'), actual: 'ERROR', ok: false, detail: err?.message });
    failures++;
    return null;
  }
}

function assert(name: string, cond: boolean, detail?: string): void {
  results.push({ name, expected: 'assert', actual: cond ? 'ok' : 'FAIL', ok: cond, detail: cond ? undefined : detail });
  if (!cond) failures++;
}

// ============================================================
// SEED
// ============================================================
const PW = 'Test@12345';

async function seed() {
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

  const hash = await bcrypt.hash(PW, 4);

  const f1 = await prisma.faculty.create({ data: { name: 'Computing & Informatics', code: 'CIN' } });
  const f2 = await prisma.faculty.create({ data: { name: 'Management Sciences', code: 'MSG' } });

  const d1 = await prisma.department.create({
    data: { name: 'Information Technology', code: 'HIM', facultyId: f1.id, passMark: 40 },
  });
  const d2 = await prisma.department.create({
    data: { name: 'Business Administration', code: 'BAD', facultyId: f2.id, passMark: 40 },
  });

  const dean = await prisma.user.create({
    data: { email: 'dean@test.local', password: hash, firstName: 'Deo', lastName: 'Dean', role: 'DEAN', facultyId: f1.id },
  });
  const hod = await prisma.user.create({
    data: { email: 'hod@test.local', password: hash, firstName: 'Hod', lastName: 'One', role: 'HOD', departmentId: d1.id },
  });
  const hod2 = await prisma.user.create({
    data: { email: 'hod2@test.local', password: hash, firstName: 'Hod', lastName: 'Two', role: 'HOD', departmentId: d2.id },
  });
  const lect = await prisma.user.create({
    data: { email: 'lect@test.local', password: hash, firstName: 'Lec', lastName: 'Turer', role: 'LECTURER', departmentId: d1.id },
  });
  const exam = await prisma.user.create({
    data: { email: 'exam@test.local', password: hash, firstName: 'Exam', lastName: 'Officer', role: 'EXAMINATION_OFFICER', departmentId: d1.id },
  });

  const s1 = await prisma.student.create({
    data: { matricNumber: 'HIM/2024/0001', firstName: 'Ada', lastName: 'Okoye', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: d1.id },
  });
  const s2 = await prisma.student.create({
    data: { matricNumber: 'HIM/2024/0002', firstName: 'Bo', lastName: 'Eze', currentLevel: 'LEVEL_100', admissionYear: 2024, departmentId: d1.id },
  });

  const c1 = await prisma.course.create({
    data: { code: 'HIM101', title: 'Intro to IT', unit: 3, level: 'LEVEL_100', semester: 'FIRST', departmentId: d1.id },
  });
  const c2 = await prisma.course.create({
    data: { code: 'HIM103', title: 'Programming Fundamentals', unit: 2, level: 'LEVEL_100', semester: 'FIRST', departmentId: d1.id },
  });

  return { f1, f2, d1, d2, dean, hod, hod2, lect, exam, s1, s2, c1, c2 };
}

const ctx = await seed();
const YEAR = '2024/2025';
const LEVEL = 'LEVEL_100';
const SEM = 'FIRST';

async function login(email: string, password = PW): Promise<{ token: string }> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  // Header-based auth: the token is returned in the response body
  const token: string = res.body?.data?.token ?? '';
  return { token };
}

const dean = await login('dean@test.local');
const hod = await login('hod@test.local');
const hod2 = await login('hod2@test.local');
const lect = await login('lect@test.local');
const exam = await login('exam@test.local');

const H = (tok: string) => ({ Authorization: `Bearer ${tok}` });

// ============================================================
// PHASE 1 — Public & auth endpoints
// ============================================================
await t('GET  / (root)', 200, () => request(app).get('/'));
await t('GET  /api/health', 200, () => request(app).get('/api/health'));
await t('GET  /api/auth/bootstrap-status', 200, () => request(app).get('/api/auth/bootstrap-status'));
await t('POST /api/auth/bootstrap (users exist → 403)', 403, () =>
  request(app).post('/api/auth/bootstrap').send({ email: 'x@y.com', password: PW, firstName: 'X', lastName: 'Y', facultyId: ctx.f1.id })
);
await t('POST /api/auth/login (wrong password → 401)', 401, () =>
  request(app).post('/api/auth/login').send({ email: 'hod@test.local', password: 'Wrong@12345' })
);
await t('POST /api/auth/login (invalid body → 400)', 400, () =>
  request(app).post('/api/auth/login').send({ email: 'not-an-email' })
);
await t('POST /api/auth/login (valid → 200, token in body, NO Set-Cookie)', 200, async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'hod@test.local', password: PW });
  assert('login returns token in body', !!res.body?.data?.token);
  assert('login returns user data in body', !!res.body?.data?.user);
  assert('login does NOT set an auth cookie', !res.headers['set-cookie']);
  return res;
});

// ---- prompt.txt scenario: header session right after login ----
await t('GET  /api/auth/profile (Bearer right after login → 200, NOT 401)', 200, () =>
  request(app).get('/api/auth/profile').set(H(hod.token))
);
await t('GET  /api/reports/dashboard (Bearer after login → 200)', 200, () =>
  request(app).get('/api/reports/dashboard').set(H(hod.token))
);
await t('GET  /api/upload (Bearer after login → 200)', 200, () =>
  request(app).get('/api/upload').set(H(hod.token))
);
await t('POST /api/auth/logout (stateless no-op → 200)', 200, () => request(app).post('/api/auth/logout'));

// ---- Bearer auth negative cases ----
await t('GET  /api/auth/profile (no token → 401)', 401, () => request(app).get('/api/auth/profile'));
await t('GET  /api/auth/profile (garbage token → 401)', 401, () =>
  request(app).get('/api/auth/profile').set('Authorization', 'Bearer not.a.jwt')
);
await t('GET  /api/auth/profile (Bearer → 200)', 200, () =>
  request(app).get('/api/auth/profile').set(H(hod.token))
);
await t('POST /api/auth/register (DEAN → 201)', 201, () =>
  request(app).post('/api/auth/register').set(H(dean.token)).send({
    email: 'newhod@test.local', password: PW, firstName: 'New', lastName: 'Hod', role: 'HOD', departmentId: ctx.d1.id,
  })
);
await t('POST /api/auth/register (HOD caller → 403)', 403, () =>
  request(app).post('/api/auth/register').set(H(hod.token)).send({
    email: 'evil@test.local', password: PW, firstName: 'E', lastName: 'Vil', role: 'DEAN', facultyId: ctx.f1.id,
  })
);
await t('POST /api/auth/register (no auth → 401)', 401, () =>
  request(app).post('/api/auth/register').send({ email: 'a@b.com', password: PW, firstName: 'A', lastName: 'B', role: 'HOD', departmentId: ctx.d1.id })
);
await t('POST /api/auth/signup (alias, DEAN → 201)', 201, () =>
  request(app).post('/api/auth/signup').set(H(dean.token)).send({
    email: 'aliasdean@test.local', password: PW, firstName: 'Al', lastName: 'Ias', role: 'DEAN', facultyId: ctx.f1.id,
  })
);

// change-password round trip on the newly registered user
const tmpLogin = await login('newhod@test.local');
await t('POST /api/auth/change-password → 200', 200, () =>
  request(app).post('/api/auth/change-password').set(H(tmpLogin.token)).send({ currentPassword: PW, newPassword: 'Changed@9999' })
);
await t('POST /api/auth/login (new password works)', 200, () =>
  request(app).post('/api/auth/login').send({ email: 'newhod@test.local', password: 'Changed@9999' })
);
await t('POST /api/auth/change-password (wrong current → 400)', 400, () =>
  request(app).post('/api/auth/change-password').set(H(tmpLogin.token)).send({ currentPassword: 'Nope@12345', newPassword: 'Changed@9999' })
);

// ============================================================
// PHASE 2 — Students
// ============================================================
let studentId = '';
await t('POST /api/students (HOD → 201)', 201, async () => {
  const res = await request(app).post('/api/students').set(H(hod.token)).send({
    matricNumber: 'HIM/2024/0100', firstName: 'Temp', lastName: 'Student', currentLevel: LEVEL, admissionYear: 2024, departmentId: ctx.d1.id,
  });
  studentId = res.body?.data?.id;
  return res;
});
await t('POST /api/students (LECTURER → 403)', 403, () =>
  request(app).post('/api/students').set(H(lect.token)).send({
    matricNumber: 'HIM/2024/0101', firstName: 'No', lastName: 'Way', currentLevel: LEVEL, admissionYear: 2024, departmentId: ctx.d1.id,
  })
);
await t('POST /api/students (invalid matric → 400)', 400, () =>
  request(app).post('/api/students').set(H(hod.token)).send({
    matricNumber: 'bad', firstName: 'A', lastName: 'B', currentLevel: LEVEL, admissionYear: 2024, departmentId: ctx.d1.id,
  })
);
await t('GET  /api/students → 200', 200, () => request(app).get('/api/students').set(H(hod.token)));
await t(`GET  /api/students/${ctx.s1.id} → 200`, 200, () =>
  request(app).get(`/api/students/${ctx.s1.id}`).set(H(hod.token))
);
await t('GET  /api/students/:id (other dept HOD → 403)', 403, () =>
  request(app).get(`/api/students/${ctx.s1.id}`).set(H(hod2.token))
);
await t('PUT  /api/students/:id → 200', 200, () =>
  request(app).put(`/api/students/${studentId}`).set(H(hod.token)).send({ firstName: 'Renamed' })
);
await t('GET  /api/students/bulk-upload/template → 200 xlsx', 200, async () => {
  const res = await request(app).get('/api/students/bulk-upload/template').set(H(hod.token));
  assert('student template is xlsx', String(res.headers['content-type']).includes('spreadsheet'), res.headers['content-type']);
  return res;
});
await t('GET  /api/students/department/:d/level/:l → 200', 200, () =>
  request(app).get(`/api/students/department/${ctx.d1.id}/level/${LEVEL}`).set(H(hod.token))
);
await t('PATCH /api/students/bulk-update-level → 200', 200, () =>
  request(app).patch('/api/students/bulk-update-level').set(H(hod.token)).send({ studentIds: [studentId], newLevel: 'LEVEL_200' })
);
await t('DELETE /api/students/:id → 204', 204, () =>
  request(app).delete(`/api/students/${studentId}`).set(H(hod.token))
);

// ============================================================
// PHASE 3 — Courses
// ============================================================
let courseId = '';
await t('POST /api/courses (HOD → 201)', 201, async () => {
  const res = await request(app).post('/api/courses').set(H(hod.token)).send({
    code: 'HIM105', title: 'Computer Arithmetic', unit: 2, level: LEVEL, semester: SEM, departmentId: ctx.d1.id,
  });
  courseId = res.body?.data?.id;
  return res;
});
await t('POST /api/courses (DEAN caller → 403)', 403, () =>
  request(app).post('/api/courses').set(H(dean.token)).send({
    code: 'HIM106', title: 'Not Allowed', unit: 2, level: LEVEL, semester: SEM, departmentId: ctx.d1.id,
  })
);
await t('GET  /api/courses → 200', 200, () => request(app).get('/api/courses').set(H(hod.token)));
await t(`GET  /api/courses/${ctx.c1.id} → 200`, 200, () =>
  request(app).get(`/api/courses/${ctx.c1.id}`).set(H(hod.token))
);
await t('PUT  /api/courses/:id → 200', 200, () =>
  request(app).put(`/api/courses/${courseId}`).set(H(hod.token)).send({ title: 'Renamed Course Title' })
);
await t('GET  /api/courses/department/:d/level/:l/semester/:s → 200', 200, () =>
  request(app).get(`/api/courses/department/${ctx.d1.id}/level/${LEVEL}/semester/${SEM}`).set(H(hod.token))
);
await t('DELETE /api/courses/:id → 204', 204, () =>
  request(app).delete(`/api/courses/${courseId}`).set(H(hod.token))
);

// ============================================================
// PHASE 4 — Results
// ============================================================
await t('POST /api/results/scores (bulk entry → 200)', 200, () =>
  request(app).post('/api/results/scores').set(H(hod.token)).send({
    level: LEVEL, semester: SEM, academicYear: YEAR,
    scores: [
      { studentId: ctx.s1.id, courseId: ctx.c1.id, score: 75 },
      { studentId: ctx.s2.id, courseId: ctx.c1.id, score: 52 },
      { studentId: ctx.s1.id, courseId: ctx.c2.id, score: 44 },
    ],
  })
);
let resultA = '';
await t('POST /api/results/add (single score → 200)', 200, async () => {
  const res = await request(app).post('/api/results/add').set(H(hod.token)).send({
    studentId: ctx.s2.id, courseId: ctx.c2.id, score: 35, level: LEVEL, semester: SEM, academicYear: YEAR,
  });
  resultA = res.body?.data?.result?.id ?? res.body?.data?.id;
  return res;
});
await t('POST /api/results/add (invalid body → 400)', 400, () =>
  request(app).post('/api/results/add').set(H(hod.token)).send({ studentId: ctx.s2.id })
);
await t('GET  /api/results/student/:id → 200', 200, () =>
  request(app).get(`/api/results/student/${ctx.s1.id}`).set(H(hod.token))
);
await t('GET  /api/results/student/:id/with-gpa → 200', 200, () =>
  request(app).get(`/api/results/student/${ctx.s1.id}/with-gpa`).set(H(hod.token))
);
await t('GET  /api/results/department/:id → 200', 200, () =>
  request(app).get(`/api/results/department/${ctx.d1.id}?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`).set(H(hod.token))
);
await t('GET  /api/results/carryovers/:id → 200', 200, async () => {
  const res = await request(app).get(`/api/results/carryovers/${ctx.s2.id}`).set(H(hod.token));
  assert('carryover F result present', JSON.stringify(res.body).includes('HIM103'), snippet(res));
  return res;
});
await t('PUT  /api/results/:id (update score → 200)', 200, () =>
  request(app).put(`/api/results/${resultA}`).set(H(hod.token)).send({ score: 55 })
);
await t('DELETE /api/results/:id → 200', 200, () =>
  request(app).delete(`/api/results/${resultA}`).set(H(hod.token))
);
let resultB = '';
await t('POST /api/results/add (again for delete route)', 200, async () => {
  const res = await request(app).post('/api/results/add').set(H(hod.token)).send({
    studentId: ctx.s2.id, courseId: ctx.c2.id, score: 35, level: LEVEL, semester: SEM, academicYear: YEAR,
  });
  resultB = res.body?.data?.result?.id ?? res.body?.data?.id;
  return res;
});
await t('DELETE /api/results/delete/:resultId → 200', 200, () =>
  request(app).delete(`/api/results/delete/${resultB}`).set(H(hod.token))
);

// ============================================================
// PHASE 5 — GPA
// ============================================================
await t('POST /api/gpa/calculate → 200', 200, () =>
  request(app).post('/api/gpa/calculate').set(H(hod.token)).send({ studentId: ctx.s1.id, level: LEVEL, semester: SEM, academicYear: YEAR })
);
await t('GET  /api/gpa/student/:id → 200', 200, () =>
  request(app).get(`/api/gpa/student/${ctx.s1.id}?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`).set(H(hod.token))
);
await t('GET  /api/gpa/student/:id/history → 200', 200, () =>
  request(app).get(`/api/gpa/student/${ctx.s1.id}/history`).set(H(hod.token))
);
await t('POST /api/gpa/calculate-department → 200', 200, () =>
  request(app).post('/api/gpa/calculate-department').set(H(hod.token)).send({ level: LEVEL, semester: SEM, academicYear: YEAR })
);
await t('GET  /api/gpa/department/:id/stats → 200', 200, () =>
  request(app).get(`/api/gpa/department/${ctx.d1.id}/stats?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`).set(H(hod.token))
);
await t('GET  /api/gpa/student/:id/explain (AI, mock provider → 200)', 200, async () => {
  const res = await request(app)
    .get(`/api/gpa/student/${ctx.s1.id}/explain?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`)
    .set(H(hod.token));
  const explanation = res.body?.data?.explanation ?? '';
  assert('AI explanation returned non-empty', explanation.length > 0, snippet(res));
  return res;
});
await t('GET  /api/gpa/student/:id/explain (missing params → 400)', 400, () =>
  request(app).get(`/api/gpa/student/${ctx.s1.id}/explain`).set(H(hod.token))
);

// ============================================================
// PHASE 6 — Upload pipeline (CSV → deterministic validation)
// ============================================================
const resultsCsv = Buffer.from(`MatricNumber,HIM101,HIM103\nHIM/2024/0001,72,64\nHIM/2024/0002,58,47\n`, 'utf-8');
let jobId = '';
await t('POST /api/upload (no file → 400)', 400, () =>
  request(app).post('/api/upload').set(H(hod.token)).field('uploadType', 'results').field('academicYear', YEAR)
);
await t('POST /api/upload (results CSV → 200 SSE)', 200, async () => {
  const res = await request(app)
    .post('/api/upload')
    .set(H(hod.token))
    .field('uploadType', 'results')
    .field('academicYear', YEAR)
    .field('departmentId', ctx.d1.id)
    .attach('file', resultsCsv, 'scores.csv');
  const m = /event: complete\ndata: (\{.*?\})/.exec(res.text || '');
  jobId = m?.[1] ? JSON.parse(m[1]).jobId : '';
  assert('upload SSE emitted complete event with jobId', !!jobId, (res.text || '').slice(0, 300));
  return res;
});
await t('GET  /api/upload (list jobs) → 200', 200, async () => {
  const res = await request(app).get('/api/upload').set(H(hod.token));
  assert('job appears in list', JSON.stringify(res.body).includes(jobId), snippet(res));
  return res;
});
await t(`GET  /api/upload/${jobId.slice(0, 8)}… → 200`, 200, () =>
  request(app).get(`/api/upload/${jobId}`).set(H(hod.token))
);
await t('GET  /api/upload/:jobId/stream (SSE reconnect) → 200', 200, () =>
  request(app).get(`/api/upload/${jobId}/stream`).set(H(hod.token))
);
await t('GET  /api/upload/fake-id → 404', 404, () =>
  request(app).get('/api/upload/cck000000000000000000fake').set(H(hod.token))
);

// ============================================================
// PHASE 7 — Review center
// ============================================================
await t(`GET  /api/review/${jobId.slice(0, 8)}… → 200`, 200, () =>
  request(app).get(`/api/review/${jobId}`).set(H(hod.token))
);
const ri1 = await prisma.reviewItem.create({
  data: { uploadJobId: jobId, rowNumber: 2, field: 'score', originalValue: '72', confidence: 0.5, issueType: 'invalid_score', issueDetail: 'test item 1' },
});
await t('PATCH /api/review/:itemId (accept → 200)', 200, () =>
  request(app).patch(`/api/review/${ri1.id}`).set(H(hod.token)).send({ resolution: 'accepted' })
);
await t('PATCH /api/review/:itemId (already resolved → 400)', 400, () =>
  request(app).patch(`/api/review/${ri1.id}`).set(H(hod.token)).send({ resolution: 'accepted' })
);
const ri2 = await prisma.reviewItem.create({
  data: { uploadJobId: jobId, rowNumber: 3, field: 'score', originalValue: '58', confidence: 0.5, issueType: 'invalid_score', issueDetail: 'test item 2' },
});
await t('PATCH /api/review/:itemId (bad resolution → 400)', 400, () =>
  request(app).patch(`/api/review/${ri2.id}`).set(H(hod.token)).send({ resolution: 'maybe' })
);
await t('POST /api/review/:jobId/approve-all → 200', 200, async () => {
  const res = await request(app).post(`/api/review/${jobId}/approve-all`).set(H(hod.token));
  assert('approve-all resolved the pending item', res.body?.resolved === 1, snippet(res));
  return res;
});
await t('GET  /api/review/fake-job → 404', 404, () =>
  request(app).get('/api/review/cck000000000000000000fake').set(H(hod.token))
);

// ============================================================
// PHASE 8 — Approval workflow
// ============================================================
let batch1 = '';
await t('POST /api/approval (LECTURER submits → 201)', 201, async () => {
  const res = await request(app).post('/api/approval').set(H(lect.token)).send({
    departmentId: ctx.d1.id, level: LEVEL, semester: SEM, academicYear: YEAR,
  });
  batch1 = res.body?.data?.id;
  return res;
});
await t('POST /api/approval (DEAN caller → 403)', 403, () =>
  request(app).post('/api/approval').set(H(dean.token)).send({
    departmentId: ctx.d1.id, level: LEVEL, semester: SEM, academicYear: '2023/2024',
  })
);
await t('GET  /api/approval → 200', 200, () => request(app).get('/api/approval').set(H(hod.token)));
await t('POST /api/approval/:id/publish (not approved yet → 400)', 400, () =>
  request(app).post(`/api/approval/${batch1}/publish`).set(H(hod.token))
);
await t('POST /api/approval/:id/approve (exam officer → 200)', 200, () =>
  request(app).post(`/api/approval/${batch1}/approve`).set(H(exam.token)).send({ comment: 'checked' })
);
await t('POST /api/approval/:id/approve (same role again → 400)', 400, () =>
  request(app).post(`/api/approval/${batch1}/approve`).set(H(exam.token))
);
await t('POST /api/approval/:id/approve (HOD → 200)', 200, () =>
  request(app).post(`/api/approval/${batch1}/approve`).set(H(hod.token))
);
await t('POST /api/approval/:id/publish (HOD after approvals → 200)', 200, async () => {
  const res = await request(app).post(`/api/approval/${batch1}/publish`).set(H(hod.token));
  assert('publish promoted PROPOSED results', (res.body?.meta?.promotedResults ?? 0) > 0, snippet(res));
  return res;
});
let batch2 = '';
await t('POST /api/approval (second batch → 201)', 201, async () => {
  const res = await request(app).post('/api/approval').set(H(lect.token)).send({
    departmentId: ctx.d1.id, level: 'LEVEL_200', semester: SEM, academicYear: YEAR,
  });
  batch2 = res.body?.data?.id;
  return res;
});
await t('POST /api/approval/:id/reject (HOD → 200)', 200, () =>
  request(app).post(`/api/approval/${batch2}/reject`).set(H(hod.token)).send({ comment: 'errors' })
);
await t('POST /api/approval/fake/approve → 404', 404, () =>
  request(app).post('/api/approval/cck000000000000000000fake/approve').set(H(hod.token))
);

// ============================================================
// PHASE 9 — Reports
// ============================================================
await t('GET  /api/reports/dashboard (HOD) → 200', 200, async () => {
  const res = await request(app).get('/api/reports/dashboard').set(H(hod.token));
  assert('dashboard has gpaDistribution', !!res.body?.data?.gpaDistribution, snippet(res));
  return res;
});
await t('GET  /api/reports/department/:id → 200', 200, () =>
  request(app).get(`/api/reports/department/${ctx.d1.id}?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`).set(H(hod.token))
);
await t('GET  /api/reports/department/:id/pdf → 200 PDF', 200, async () => {
  const res = await request(app)
    .get(`/api/reports/department/${ctx.d1.id}/pdf?level=${LEVEL}&semester=${SEM}&academicYear=${YEAR}`)
    .set(H(hod.token));
  assert('department report is PDF', String(res.headers['content-type']).includes('pdf'), res.headers['content-type']);
  return res;
});
await t('GET  /api/reports/faculty (DEAN → 200)', 200, () =>
  request(app).get('/api/reports/faculty').set(H(dean.token))
);
await t('GET  /api/reports/faculty (HOD → 403)', 403, () =>
  request(app).get('/api/reports/faculty').set(H(hod.token))
);
await t('GET  /api/reports/transcript/:id → 200', 200, () =>
  request(app).get(`/api/reports/transcript/${ctx.s1.id}`).set(H(hod.token))
);
await t('GET  /api/reports/transcript/:id/pdf → 200 PDF', 200, async () => {
  const res = await request(app).get(`/api/reports/transcript/${ctx.s1.id}/pdf`).set(H(hod.token));
  assert('transcript is PDF', String(res.headers['content-type']).includes('pdf'), res.headers['content-type']);
  return res;
});

// ============================================================
// PHASE 10 — Departments
// ============================================================
await t('GET  /api/departments/public (no auth → 200)', 200, () => request(app).get('/api/departments/public'));
let tempDept = '';
await t('POST /api/departments/public (DEAN → 200)', 200, async () => {
  const res = await request(app).post('/api/departments/public').set(H(dean.token)).send({
    name: 'Cyber Security', code: 'CYB', facultyId: ctx.f1.id, passMark: 45,
  });
  tempDept = res.body?.data?.id;
  return res;
});
await t('POST /api/departments/public (HOD → 403)', 403, () =>
  request(app).post('/api/departments/public').set(H(hod.token)).send({ name: 'X', code: 'XXX', facultyId: ctx.f1.id })
);
await t('GET  /api/departments → 200', 200, () => request(app).get('/api/departments').set(H(hod.token)));
await t('GET  /api/departments/my-department (HOD) → 200', 200, async () => {
  const res = await request(app).get('/api/departments/my-department').set(H(hod.token));
  assert('my-department returns HIM', res.body?.data?.code === 'HIM', snippet(res));
  return res;
});
await t('GET  /api/departments/:id → 200', 200, () =>
  request(app).get(`/api/departments/${ctx.d1.id}`).set(H(hod.token))
);
await t('DELETE /api/departments/public/:id (DEAN → 200)', 200, () =>
  request(app).delete(`/api/departments/public/${tempDept}`).set(H(dean.token))
);

// ============================================================
// PHASE 11 — Audit & misc
// ============================================================
await t('GET  /api/audit (HOD → 200)', 200, async () => {
  const res = await request(app).get('/api/audit?limit=10').set(H(hod.token));
  assert('audit log has entries', (res.body?.meta?.total ?? 0) > 0, snippet(res));
  return res;
});
await t('GET  /api/audit/upload_job/:jobId → 200', 200, () =>
  request(app).get(`/api/audit/upload_job/${jobId}`).set(H(hod.token))
);
await t('GET  /api/audit (LECTURER → 403)', 403, () => request(app).get('/api/audit').set(H(lect.token)));
await t('GET  /api/nonexistent → 404', 404, () => request(app).get('/api/nonexistent').set(H(hod.token)));
await t('GET  /api/students (no auth → 401)', 401, () => request(app).get('/api/students'));

// ============================================================
// SUMMARY
// ============================================================
await prisma.$disconnect();
mockAI.close();

const width = Math.max(...results.map((r) => r.name.length));
console.log('\n=================== ENDPOINT TEST RESULTS ===================\n');
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${r.name.padEnd(width)}  [expected ${r.expected}, got ${r.actual}]`);
  if (!r.ok && r.detail) console.log(`      ↳ ${r.detail.replace(/\n/g, ' ').slice(0, 200)}`);
}
const passed = results.length - failures;
console.log(`\n=================== ${passed}/${results.length} PASSED ===================`);
if (failures > 0) {
  console.log(`\n${failures} FAILURE(S):`);
  for (const r of results.filter((x) => !x.ok)) console.log(`  ✘ ${r.name} — expected ${r.expected}, got ${r.actual}`);
}
process.exit(failures > 0 ? 1 : 0);
