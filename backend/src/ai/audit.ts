// src/ai/audit.ts
// Lightweight AI audit trail — records provider, model, operation metadata.

export type AIProviderResult = 'PRIMARY_SUCCESS' | 'PRIMARY_FAILED_FALLBACK_SUCCESS' | 'PRIMARY_FAILED_FALLBACK_FAILED';

export interface AIAuditEntry {
  operation: 'extraction' | 'validation' | 'explanation';
  provider: 'openrouter' | 'gemini' | 'groq';
  model: string;
  promptVersion: string;
  result: AIProviderResult;
  durationMs: number;
  inputRecordCount?: number;
  outputRecordCount?: number;
  error?: string;
}

let auditStore: AIAuditEntry[] = [];

/**
 * Record an AI operation for the current upload/batch.
 */
export function recordAIOperation(entry: AIAuditEntry): void {
  auditStore.push(entry);
}

/**
 * Get all AI audit entries for the current batch.
 */
export function getAIAuditEntries(): AIAuditEntry[] {
  return [...auditStore];
}

/**
 * Clear the audit store (call at start of each upload).
 */
export function clearAIAuditLog(): void {
  auditStore = [];
}

/**
 * Build a summary of AI operations for the UploadJob meta field.
 */
export function buildAISummary(entries: AIAuditEntry[]): {
  provider: string;
  fallbackUsed: boolean;
  operations: number;
  errors: number;
  details: Record<string, any>;
} {
  const errors = entries.filter((e) => e.result === 'PRIMARY_FAILED_FALLBACK_FAILED');
  return {
    provider: entries[0]?.provider || 'none',
    fallbackUsed: entries.some((e) => e.result === 'PRIMARY_FAILED_FALLBACK_SUCCESS'),
    operations: entries.length,
    errors: errors.length,
    details: entries.reduce((acc, e, i) => { acc[`op${i + 1}`] = e as any; return acc; }, {} as Record<string, any>),
  };
}