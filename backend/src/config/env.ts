// src/config/env.ts
// Centralized environment variable validation — fails fast at startup

export function validateEnv(): void {
  // Skip strict validation in test mode — tests provide their own mocks/env
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  // Validate JWT_SECRET is not the default placeholder
  if (process.env.JWT_SECRET === 'default-secret-change-in-production') {
    console.error('JWT_SECRET is still set to the default placeholder. Generate a strong secret and update .env');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const prodRequired = ['FRONTEND_URL', 'GEMINI_API_KEY'];
    const prodMissing = prodRequired.filter((key) => !process.env[key]);
    if (prodMissing.length > 0) {
      console.warn(`Warning: Missing production environment variables:\n  ${prodMissing.join('\n  ')}`);
    }
  }

  // AI_PROVIDER validation
  const aiProvider = process.env.AI_PROVIDER || 'openrouter';
  if (!['openrouter', 'gemini', 'groq'].includes(aiProvider)) {
    console.error(`Invalid AI_PROVIDER "${aiProvider}". Must be one of: openrouter, gemini, groq`);
    process.exit(1);
  }
  if (aiProvider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
    console.warn('Warning: AI_PROVIDER is set to "openrouter" but OPENROUTER_API_KEY is not set. AI features will not work.');
  }
}