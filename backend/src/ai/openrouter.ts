// FILE: backend/src/ai/openrouter.ts
// OpenRouter provider — PRIMARY AI provider running Google Gemma 4 31B (free).
// Fallback chain is orchestrated by ai.service.ts (OpenRouter → Gemini → Groq).

import { ReviewItemPayload } from '../types/index.js';
import {
  visionExtractPrompt,
  extractStudentsPrompt,
  extractResultsPrompt,
  explainGPAPrompt,
} from './prompts.js';
import { recordAIOperation } from './audit.js';
import { PROMPT_VERSION } from './prompts.js';
import type { ExtractionType, ExtractedStudent, ExtractedResult } from './gemini.js';
import { validateExtractedStudents, validateExtractedResults } from './schema.js';

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.APP_URL || '';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

interface OpenRouterRequestOptions {
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  images?: Array<{ base64: string; mimeType: string }>;
}

/**
 * Core request helper — POSTs to OpenRouter chat completions with timeout,
 * limited retries, and exponential backoff for 429/5xx. Throws OpenRouterError
 * on terminal failure so the routing service can fall back.
 */
async function openRouterRequest(
  systemPrompt: string,
  userContent: string,
  options: OpenRouterRequestOptions = {}
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured');
  }

  const messages: OpenRouterMessage[] = [{ role: 'system', content: systemPrompt }];

  if (options.images && options.images.length > 0) {
    // Multimodal input — send text + images as content parts
    const parts: Array<Record<string, unknown>> = [
      { type: 'text', text: userContent },
      ...options.images.map((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
    ];
    messages.push({ role: 'user', content: parts });
  } else {
    messages.push({ role: 'user', content: userContent });
  }

  let attempt = 0;
  let lastError: OpenRouterError | null = null;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL || 'http://localhost:5000',
          'X-Title': 'AcadMind AI',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages,
          temperature: options.temperature ?? 0.1,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
          return content.trim();
        }
        // Provider returned a 200 but empty/malformed content
        throw new OpenRouterError('OpenRouter returned empty content', response.status, false);
      }

      const retryable = RETRYABLE_STATUS.has(response.status);
      const body = await response.text().catch(() => '');
      const message = `OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`;
      lastError = new OpenRouterError(message, response.status, retryable);

      if (!retryable) throw lastError; // 4xx (except 429) — do not retry
    } catch (err: any) {
      if (err instanceof OpenRouterError) {
        if (!err.retryable) throw err;
        lastError = err;
      } else if (err?.name === 'AbortError') {
        lastError = new OpenRouterError(`OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`, undefined, true);
      } else {
        lastError = new OpenRouterError(`OpenRouter network error: ${err?.message || String(err)}`, undefined, true);
      }
    } finally {
      clearTimeout(timeout);
    }

    attempt++;
    if (attempt <= MAX_RETRIES) {
      await sleep(500 * 2 ** (attempt - 1)); // 500ms, 1s
    }
  }

  throw lastError ?? new OpenRouterError('OpenRouter request failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip markdown code fences and parse JSON from a model response.
 */
function extractJson(text: string): unknown {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  // Find the first balanced JSON object/array if the model added prose
  const firstBrace = cleaned.indexOf('[') !== -1
    ? Math.min(...[cleaned.indexOf('['), cleaned.indexOf('{')].filter((i) => i !== -1))
    : cleaned.indexOf('{');
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
  return JSON.parse(cleaned);
}

function record(
  operation: 'extraction' | 'explanation',
  result: 'PRIMARY_SUCCESS' | 'PRIMARY_FAILED_FALLBACK_FAILED',
  durationMs: number,
  extra?: { outputRecordCount?: number; error?: string }
): void {
  recordAIOperation({
    operation,
    provider: 'openrouter',
    model: OPENROUTER_MODEL,
    promptVersion: PROMPT_VERSION,
    result,
    durationMs,
    ...extra,
  });
}

// ============================================================
// VISION — multimodal document understanding
// ============================================================

export async function openrouterVisionExtract(base64: string, mimeType: string): Promise<string> {
  const start = Date.now();
  try {
    const text = await openRouterRequest(visionExtractPrompt(), 'Extract the document content.', {
      images: [{ base64, mimeType }],
      maxTokens: 4096,
    });
    record('extraction', 'PRIMARY_SUCCESS', Date.now() - start);
    return text;
  } catch (err: any) {
    record('extraction', 'PRIMARY_FAILED_FALLBACK_FAILED', Date.now() - start, {
      error: err?.message || String(err),
    });
    throw err;
  }
}

// ============================================================
// STRUCTURED EXTRACTION
// ============================================================

export async function openrouterExtractStudents(content: string): Promise<ExtractedStudent[]> {
  const start = Date.now();
  try {
    const raw = await openRouterRequest(
      'You extract student records into strict JSON. Output ONLY a JSON array, no markdown, no prose.',
      extractStudentsPrompt(content),
      { jsonMode: true, temperature: 0.1 }
    );
    const parsed = extractJson(raw);
    const validation = validateExtractedStudents(parsed);
    if (!validation.valid) {
      throw new OpenRouterError(
        `OpenRouter output failed schema validation: ${validation.errors?.slice(0, 3).join('; ')}`,
        undefined,
        false
      );
    }
    // Normalize null email → undefined to match ExtractedStudent shape
    const students: ExtractedStudent[] = (validation.data || []).map((s) => ({
      ...s,
      email: s.email ?? undefined,
    }));
    record('extraction', 'PRIMARY_SUCCESS', Date.now() - start, { outputRecordCount: students.length });
    return students;
  } catch (err: any) {
    record('extraction', 'PRIMARY_FAILED_FALLBACK_FAILED', Date.now() - start, {
      error: err?.message || String(err),
    });
    throw err;
  }
}

export async function openrouterExtractResults(content: string, academicYear: string): Promise<ExtractedResult[]> {
  const start = Date.now();
  try {
    const raw = await openRouterRequest(
      'You extract student score records into strict JSON. Output ONLY a JSON array, no markdown, no prose.',
      extractResultsPrompt(content, academicYear),
      { jsonMode: true, temperature: 0.1 }
    );
    const parsed = extractJson(raw);
    const validation = validateExtractedResults(parsed);
    if (!validation.valid) {
      throw new OpenRouterError(
        `OpenRouter output failed schema validation: ${validation.errors?.slice(0, 3).join('; ')}`,
        undefined,
        false
      );
    }
    record('extraction', 'PRIMARY_SUCCESS', Date.now() - start, { outputRecordCount: validation.data?.length ?? 0 });
    return validation.data || [];
  } catch (err: any) {
    record('extraction', 'PRIMARY_FAILED_FALLBACK_FAILED', Date.now() - start, {
      error: err?.message || String(err),
    });
    throw err;
  }
}

// ============================================================
// VALIDATION — Gemma does not reliably support function-calling.
// Use the deterministic dispatch (same as Groq fallback path),
// which validates records against the database directly.
// ============================================================

export async function openrouterValidateWithTools(
  records: any[],
  type: ExtractionType,
  departmentCode: string,
  onProgress?: (message: string) => void
): Promise<ReviewItemPayload[]> {
  // Deterministic validation via existing tool dispatchers — no LLM required.
  const { groqValidateWithTools } = await import('./groq.js');
  return groqValidateWithTools(records, type, departmentCode, onProgress);
}

// ============================================================
// GPA EXPLANATION
// ============================================================

export async function openrouterExplainGPA(data: {
  studentName: string;
  gpa: number;
  results: Array<{ courseCode: string; unit: number; score: number; grade: string; gradePoint: number; pxu: number }>;
  totalUnits: number;
  totalPoints: number;
}): Promise<string> {
  const start = Date.now();
  try {
    const text = await openRouterRequest(
      'You are an academic advisor. Explain the GPA clearly using ONLY the provided verified data. Never invent academic facts.',
      explainGPAPrompt(data),
      { temperature: 0.3 }
    );
    record('explanation', 'PRIMARY_SUCCESS', Date.now() - start);
    return text;
  } catch (err: any) {
    record('explanation', 'PRIMARY_FAILED_FALLBACK_FAILED', Date.now() - start, {
      error: err?.message || String(err),
    });
    throw err;
  }
}
