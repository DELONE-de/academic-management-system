// jest.setup.cjs — runs before test suite
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test@localhost:5433/acadmind_test?schema=public';
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://postgres:test@localhost:5433/acadmind_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.GEMINI_API_KEY = 'test-key';
process.env.GROQ_API_KEY = 'test-key';