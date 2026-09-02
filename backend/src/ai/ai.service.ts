// FILE: backend/src/ai/ai.service.ts
// Provider routing service — the application depends on this layer, not on a
// specific vendor. Default routing: OpenRouter (Gemma 4 31B) → Gemini → Groq.
//
// The primary provider is configurable via AI_PROVIDER=openrouter|gemini|groq.
// Only fall back on genuine failure (network, timeout, 429/5xx, malformed output),
// never for ordinary valid responses.

import { ReviewItemPayload } from '../types/index.js';
import { recordAIOperation, getAIAuditEntries } from './audit.js';
import { PROMPT_VERSION } from './prompts.js';
import type { ExtractionType, ExtractedStudent, ExtractedResult } from './gemini.js';

type ProviderName = 'openrouter' | 'gemini' | 'groq';

export interface AIOperationMeta {
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}

export interface AIResult<T> {
  data: T;
  meta: AIOperationMeta;
}

function configuredProvider(): ProviderName {
  const configured = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
  if (configured === 'gemini' || configured === 'groq' || configured === 'openrouter') {
    return configured;
  }
  return 'openrouter'; // default
}

function hasKey(provider: ProviderName): boolean {
  switch (provider) {
    case 'openrouter':
      return !!process.env.OPENROUTER_API_KEY;
    case 'gemini':
      return !!process.env.GEMINI_API_KEY;
    case 'groq':
      return !!process.env.GROQ_API_KEY;
  }
}

/**
 * Attempt a single provider call. Returns the result, or null if the provider is
 * not configured / the call threw (indicating fallback is warranted).
 */
async function attempt<T>(
  provider: ProviderName,
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false }> {
  if (!hasKey(provider)) return { ok: false };
  try {
    const data = await fn();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

/**
 * Fallback chain for a given task. Tries configured providers in order:
 * primary → gemini → groq. Returns data + metadata about which provider answered.
 */
async function withFallback<T>(
  task: 'extraction' | 'validation' | 'explanation',
  attempts: Record<ProviderName, () => Promise<T>>,
  emptyValue: T
): Promise<AIResult<T>> {
  const primary = configuredProvider();
  const order: ProviderName[] = [primary];
  for (const p of ['gemini', 'groq'] as ProviderName[]) {
    if (p !== primary && hasKey(p)) order.push(p);
  }

  const start = Date.now();
  let answeringProvider: ProviderName = primary;
  let fallbackUsed = false;

  for (let i = 0; i < order.length; i++) {
    const provider = order[i];
    const result = await attempt(provider, attempts[provider]);
    if (result.ok) {
      answeringProvider = provider;
      fallbackUsed = i > 0;
      // Record authoritative routing decision with fallback status
      recordAIOperation({
        operation: task as any,
        provider: provider as any,
        model: modelFor(provider),
        promptVersion: PROMPT_VERSION,
        result: 'PRIMARY_SUCCESS',
        durationMs: Date.now() - start,
        fallbackUsed,
      });
      return {
        data: result.data,
        meta: {
          provider,
          model: modelFor(provider),
          fallbackUsed,
          promptVersion: PROMPT_VERSION,
        },
      };
    }
  }

  // All providers failed — record terminal failure (no fallback succeeded)
  recordAIOperation({
    operation: task as any,
    provider: answeringProvider as any,
    model: modelFor(answeringProvider),
    promptVersion: PROMPT_VERSION,
    result: 'PRIMARY_FAILED_FALLBACK_FAILED',
    durationMs: Date.now() - start,
    fallbackUsed: false,
  });
  return {
    data: emptyValue,
    meta: {
      provider: answeringProvider,
      model: modelFor(answeringProvider),
      fallbackUsed: false,
      promptVersion: PROMPT_VERSION,
    },
  };
}

function modelFor(provider: ProviderName): string {
  switch (provider) {
    case 'openrouter':
      return process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
    case 'gemini':
      return 'gemini-2.0-flash';
    case 'groq':
      return 'llama-3.3-70b-versatile';
    default:
      return 'unknown';
  }
}

// ============================================================
// TASK FUNCTIONS — application-facing, provider-agnostic
// ============================================================

export async function aiExtractStudents(content: string): Promise<AIResult<ExtractedStudent[]>> {
  const { openrouterExtractStudents } = await import('./openrouter.js');
  const { geminiExtractStudents } = await import('./gemini.js');
  return withFallback<ExtractedStudent[]>(
    'extraction',
    {
      openrouter: () => openrouterExtractStudents(content),
      gemini: () => geminiExtractStudents(content),
      groq: async () => {
        const { groqExtractStudents } = await import('./groq.js');
        return groqExtractStudents(content);
      },
    },
    []
  );
}

export async function aiExtractResults(content: string, academicYear: string): Promise<AIResult<ExtractedResult[]>> {
  const { openrouterExtractResults } = await import('./openrouter.js');
  const { geminiExtractResults } = await import('./gemini.js');
  return withFallback<ExtractedResult[]>(
    'extraction',
    {
      openrouter: () => openrouterExtractResults(content, academicYear),
      gemini: () => geminiExtractResults(content, academicYear),
      groq: async () => {
        const { groqExtractResults } = await import('./groq.js');
        return groqExtractResults(content, academicYear);
      },
    },
    []
  );
}

export async function aiValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<AIResult<ReviewItemPayload[]>> {
  const { openrouterValidateWithTools } = await import('./openrouter.js');
  const { geminiValidateWithTools } = await import('./gemini.js');
  return withFallback<ReviewItemPayload[]>(
    'validation',
    {
      openrouter: () => openrouterValidateWithTools(records, type, departmentCode, onProgress),
      gemini: () => geminiValidateWithTools(records, type, departmentCode, onProgress),
      groq: async () => {
        const { groqValidateWithTools } = await import('./groq.js');
        return groqValidateWithTools(records, type, departmentCode, onProgress);
      },
    },
    []
  );
}

export async function aiExplainGPA(data: {
  studentName: string;
  gpa: number;
  results: Array<{ courseCode: string; unit: number; score: number; grade: string; gradePoint: number; pxu: number }>;
  totalUnits: number;
  totalPoints: number;
}): Promise<AIResult<string>> {
  const { openrouterExplainGPA } = await import('./openrouter.js');
  const { geminiExplainGPA } = await import('./gemini.js');
  return withFallback<string>(
    'explanation',
    {
      openrouter: () => openrouterExplainGPA(data),
      gemini: () => geminiExplainGPA(data),
      groq: async () => {
        const { groqExplainGPA } = await import('./groq.js');
        return groqExplainGPA(data);
      },
    },
    ''
  );
}

/**
 * Vision extraction — routes multimodal document understanding through the
 * provider layer. OpenRouter (Gemma) is primary; Gemini is the fallback.
 * Groq is not routed here because the current Groq provider does not accept
 * image input.
 */
export async function aiVisionExtract(base64: string, mimeType: string): Promise<AIResult<string>> {
  const { openrouterVisionExtract } = await import('./openrouter.js');
  const { geminiVisionExtract } = await import('./gemini.js');
  return withFallback<string>(
    'extraction',
    {
      openrouter: () => openrouterVisionExtract(base64, mimeType),
      gemini: () => geminiVisionExtract(base64, mimeType),
      // Groq provider does not support image input — treat as unavailable.
      groq: async () => {
        throw new Error('Groq vision not supported');
      },
    },
    ''
  );
}

export { getAIAuditEntries };
