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

  // Warn when the user has configured a provider but is missing its key.
  // Missing keys cause silent "not_configured" failures deep in the pipeline.
  if (aiProvider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  AI_PROVIDER=openrouter but OPENROUTER_API_KEY is not set. AI extraction/explanation will fail.');
  }
  if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.warn('⚠️  AI_PROVIDER=gemini but GEMINI_API_KEY is not set. AI extraction/explanation will fail.');
  }
  if (aiProvider === 'groq' && !process.env.GROQ_API_KEY) {
    console.warn('⚠️  AI_PROVIDER=groq but GROQ_API_KEY is not set. AI extraction/explanation will fail.');
  }
  // Warn if fallback providers are referenced but not configured (silent skip at runtime).
  if (aiProvider !== 'gemini' && process.env.GEMINI_API_KEY) {
    console.log('ℹ️  Gemini API key present — will be used as AI fallback provider.');
  }
  if (aiProvider !== 'groq' && process.env.GROQ_API_KEY) {
    console.log('ℹ️  Groq API key present — will be used as AI fallback provider.');
  }
}